
import * as crypto from "crypto"
import * as jose from "node-jose"

import {Logger} from './Logger';
import {Key,Realm,Mandate,ControllerBinding} from '../model'
import {Storage} from "./Storage"

var logger = Logger.create("Integrity");

/**
 * Service, realm keys and other IDs.
 * Key handling for integrity clients and controllers.
 */

export class Integrity {

    private storage: Storage;
    private keys: {[name:string]:Key} = {} // mapping (name->Key)
    private myOwnKeyID:string = "" // our private key name
    private secret:string // secret used to encrypt keys
    private binding:ControllerBinding;
    private verifier: jose.JWS.Verifier;

    public constructor(storage: Storage, secret: string) {

        this.storage = storage
        this.secret = secret
        this.verifier = jose.JWS.createVerify()

        this.storage.get("keyID")
            .then(keyID => {

                if (keyID) {
                    if (typeof(keyID) != 'string')
                        throw new Error("bad type on keyID "+ typeof(keyID))
                    logger.debug("constructor", "init found keyID: ", keyID)
                    this.myOwnKeyID = keyID
                    return Promise.resolve(keyID)

                } else throw new Error("keyID not found. ")
            })
            .catch(err => {
                logger.error("error retreving private key:", err)
                logger.info("constructor", "missing key, creating...")

                return this.generateKey("root")
                    .then(key => this.storeKey(key).then(k => key))
                    .then(key => this.setMyRoot(key))
                    .then(() => {
                        logger.debug("constructor", "new key stored.", this.myOwnKeyID)
                        return Promise.resolve(this.myOwnKeyID)
                    })
                    .catch(err => {
                        logger.error(err)
                    })
            })
    }

    // returns name of key that is my own root key.
    public getMyID(): Promise<string> {
        if (this.myOwnKeyID) {
            return Promise.resolve(this.myOwnKeyID)
        }

        return this.storage.get("keyID")
            .then(keyID => {
                this.myOwnKeyID = keyID
                return keyID
            })
    }

    // store key as root-key for this party and
    // save name of myID to the key id
    //    (or name if key if we are missing key id)
    // it stores the key to the underlying storage.
    public setMyRoot(key: Key) : Promise<string> {
        if (!key.id) {
            key.id = key.name
        }
        this.myOwnKeyID = key.id;
        return this.storage.set('keyID', key.id);
    }

    // create EC/P-256: key and cache it (its not stored)
    // add key to storage with name, create with optional key-id
    public generateKey(name: string, id?: string): Promise<Key> {

        let keystore = jose.JWK.createKeyStore()

        return keystore.generate('EC', 'P-256')
            .catch((error:any) => logger.error("generateKey-creation ", error))
            .then((privateKey:any) => {
                let key = new Key(name, privateKey)
                if (id) return key.setID(id)
                else return Promise.resolve(key)
            })
            .then((key:Key) => {
                this.keys[name] = key
                return key
             })
            .catch((error:Error) => logger.error("generateKey-binding ", error))

    }

    // Adds a singed key as "signedPublicKey" to key.
    public signPublicKey(key: Key): Promise<jose.Key> {
        let pubkey = key.publicKey.toJSON();
        delete pubkey.kid;
        return key.getPrivateKey(this.secret)
            .then(privateKey=>
              jose.JWS.createSign(
                { format: 'flattened' },
                { key: privateKey, reference: 'jwk' }
              )
              .update(JSON.stringify(pubkey), 'utf8').final())
            .then((jws:any) => JSON.stringify(jws))
            .then((json:string) => key.signedPublicKey = json)
            .then(() => key)
    }

    // private part of key is encrypted, use this to read it.
    public getPrivateKey(key: Key): Promise<jose.Key> {
        return key.getPrivateKey(this.secret)
          .then(privateKey => {
            this.keys[key.name].privateKey = privateKey;
            return Promise.resolve(privateKey)
          })
    }

    // stores key, using the keys own name, removes decryptped
    // private key if its available next to an encryption.
    // keys are stored with "key_"-prefix.
    public storeKey(key: Key) : Promise<string> {
        logger.debug("storeKey", " with key.name: "+key.name)
        let k: Key = Object.assign({}, key);
        if (key.isEncrypted() && key.encryptedKey) delete k.privateKey;
        else k.privateKey = key.privateKey.toJSON(true);
        return this.storage.set(`key_${key.name}`, JSON.stringify(k))
    }

    public clearCache() {
        this.keys = {};
    }

    public deleteKey(name:string):Promise<any> {
        if (this.keys[name]) delete this.keys[name]
        return this.storage.delete(name)
    }


    // add a Key JSON packed key with name to memory storage
    private parseAndAddKey(name:string, json:string): Promise<Key> {
        return Key.fromJSON(json)
            .then((key:Key) => {
                this.keys[name] = key;
                return key
            })
    }

    public getMyKey(): Promise<Key> {
        return this.getMyID().then(myId=>this.getKey(myId))
    }

    public getKey(name: string): Promise<Key> {
        if (this.keys[name]) {
            return Promise.resolve().then(() => <Key> this.keys[name]);
        } else {
            return this.storage.get("key_"+name)
            .then(data => {
                if (data != null) {
                    return this.parseAndAddKey(name, data)

                } else {
                    return Promise.reject(`No key found for ${name}`);
                }
            });
        }
    }

    public createCertificateChain(
        subKey: jose.Key,
        keyType: string = '*',
        documentTypes: string[] = ['*'],
        ttl: number = 3600): Promise<jose.Key> {

        return this.getKey('root')
            .then(rootKey => <jose.CertificateChain> {
                timestamp: new Date(),
                root: rootKey.publicKey,
                subKey: subKey.publicKey,
                keyType: keyType,
                documentTypes: documentTypes,
                ttl: ttl,
            })
            .then(chain => this.signCompact('root', chain))
            .then(chain => subKey.certificateChain = chain)
            .then(() => subKey)
    }


    public sign(keyName: string, input: any): Promise<string> {
        return this.getKey(keyName)
          .then((key:Key)=>key.sign(input, this.secret))
    }

    public signCompact(keyName: string, input: any): Promise<string> {
        return this.getKey(keyName)
          .then((key:Key)=>key.sign(input, this.secret, true))
    }

    public encrypt(recipient: any, input: any): Promise<any> {
        let buf = (typeof (input) == 'string') ? input : JSON.stringify(input)
        return jose.JWE.createEncrypt(
          { protect: ['enc'], contentAlg: 'A256GCM' },recipient)
          .update(buf).final()
    }

    // validate and return verify result
    public verify(data: any): Promise<any> {
        return this.verifier.verify(data)
    }

    // validate and return payload as string
    public verified(data: any): Promise<string> {
        return this.verify(data)
            .then(verified =>  verified.payload.toString("utf8"))
    }

    // parse realm description, verify signature and store keys.
    public parseSignedRealm(name: string, signed: any): Promise<Realm> {
      let jws = typeof (signed) == 'string' ? JSON.parse(signed) : signed;
      return this.verifier.verify(jws)
        .then(result => {
          let obj = JSON.parse(result.payload);
          if (name != '*' && obj.name != name) return Promise.reject("Name does not match");
          return obj;
        })
        .then(obj => {
          let realm = Object.assign(new Realm(), obj);
          realm.timestamp = new Date(obj["@timestamp"]);
          realm.signed = JSON.stringify(jws);
          realm.icon = obj.icon ? obj.icon : '';
          realm.banner = obj.banner ? obj.banner : '';
          return jose.JWK.asKey(obj.publicKey, 'json')
            .then(key => realm.publicKey = key)
            .then(() => realm);
        });
    }

    private verifyRealmHistory(realm: Realm): Promise<string> {
      let prevKey: any = realm.publicKey;
      let pl: Promise<any>[] =
        realm.keyHistory.reverse()
        .map((eventJWS) => this.verifier.verify(eventJWS))

      return Promise.all(pl)
        .then(events=>{
          events.forEach((event, i)=>{
            if (event.key.thumbprint() != prevKey.thumbprint())
              return Promise.reject("thumbprint miss match in chain")
          })
          return Promise.resolve("")
        })
    }

    public compareRealmHistory(realmA: Realm, realmB: Realm): Promise<any> {
      return this.verifyRealmHistory(realmA)
        .then(myThumbprint => this.verifyRealmHistory(realmB)
          .then(otherThumbprint => myThumbprint == otherThumbprint ? Promise.resolve() : Promise.reject("key history didn't match"))
        )
    }

    // in case we are a controller - we also need to store binding
    public setControllerBinding(cb: ControllerBinding):Promise<string> {
      return this.storage.setObj("binding", cb.toJSON())
    }

    public getControllerBinding():Promise<ControllerBinding> {
      return this.storage.getObj("binding")
      .then(obj=>new ControllerBinding(obj))
    }

    public deleteControllerBinding():Promise<string> {
      return this.storage.delete("binding")
    }



}
