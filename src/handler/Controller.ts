
import * as express  from "express";

import { Logger } from "../service/Logger"
import { Integrity } from "../service/Integrity"

import * as jose from "node-jose"

import {ActionDescriptor,ControllerBinding} from "../model"

/**
 * A generic controller interface for binding with a single realm
 * and handling keys & certificates. After binding to a realm
 * the realm is locked with this controller. There is no -
 * multi realm handling in this controller.
 *
 * @author brickchain
 */
export class Controller {

    logger:Logger
    integrity:Integrity // store realm and controller keys.

    bindingSecret:string;
    apiUri:string;
    adminUI:string;
    binding:any;
    bindFunc:(realmUrl:string,realmId:string,binding:any)=>any
    listActions:(baseurl:string,baseuri:string,realmName:string)=>Array<ActionDescriptor>

    constructor(
        integrity:Integrity,
        fun:(binding:any)=>void,
        bindingSecret?:string) {

        if (bindingSecret) {
          this.bindingSecret = bindingSecret;
        } else {
          this.bindingSecret = ""+Math.floor(Math.random()*100000000);
        }

        this.logger = Logger.create("handler.Controller")
        this.integrity = integrity
        this.bindFunc = fun

        this.getBinding()
        .then(b => {
            if (b) {
              this.logger.info("binding: "+JSON.stringify(b))
              fun(b)
            } else {
              this.logger.info("Not bound yet, Secret: "+this.bindingSecret)
            }
        })
        .catch(err => {
            this.logger.debug(err)
            this.logger.info("Not bound. Waiting for binding. Secret: " +
                              this.bindingSecret)
        })
    }

    public setAdminURL(url:string) {
        this.adminUI = url;
    }

    /**
    * Add controller with binding endpoint to express Application,
    *  via some base (default = "/api")
    */
    public addRoutes(app: express.Application, base:string = "/api") {

        this.apiUri = base;
        app.options(base+"/descriptor", this.originOptions.bind(this))
        app.options(base+"/bind", this.originOptions.bind(this))
        app.options(base+"/actions", this.originOptions.bind(this))
        app.get(base+"/descriptor", this.descriptor.bind(this))
        app.post(base+"/bind", this.binder.bind(this))
        app.delete(base+"/bind", this.unbinder.bind(this))
        app.get(base+"/actions", this.actions.bind(this))

    }

    private addCORS(res:express.Response) : void {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
        res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With,Authorization,Accept,Origin')
    }

    public getBinding() : Promise<ControllerBinding> {

        if (this.binding) return Promise.resolve(this.binding)
        else return this.integrity.getControllerBinding()
            .then((binding:ControllerBinding) => {
              this.binding = binding;
              return binding;
            })
    }

    // returns forwarded or otherwise reqested "http[s]://host[:port]""
    public myHost(req:express.Request) : string {

        let fHost = req.get("x-forwarded-host")
        let fProto = req.get("x-forwarded-proto")
        if (fProto) fProto = fProto.split(',')[0]
        let baseurl = (fProto ? fProto : req.protocol) + '://' + (fHost ? fHost : req.get('host'))
        if (fHost) this.logger.info("forwarded-host: "+baseurl)
        return baseurl;

    }

    // GET /controller/descriptor
    public descriptor(req:express.Request, res:express.Response) : void {

        this.addCORS(res)

        this.getDescriptor()
            .then(descriptor => {

                let baseurl = this.myHost(req)
                let baseuri = this.apiUri;

                // ensure realm-admin-ui/browser can read from this host.
                this.addCORS(res)

                descriptor.actionsURI = baseurl + baseuri + "/actions";
                descriptor.adminUI = baseurl + baseuri + this.adminUI;
                descriptor.bindURI = baseurl + baseuri + "/bind";

                this.logger.info("descriptor: ",
                    JSON.stringify(descriptor, null, 2))

                res.json(descriptor)
            })
            .catch(err => {
                this.logger.error("error! ", err)
                if (err.stack) this.logger.error("error! ", err.stack)
                res.status(500).send("error: " + err)
            })
    }

    // build descriptor with key and refernces to actions.
    public getDescriptor(): Promise<any> {
        return this.integrity.getMyID()
            .then((keyId:string) => {
                this.logger.debug("got key: "+keyId)
                return this.integrity.getKey(keyId)
            })
            .then((mykey:any) => mykey.getPublicKey())
            .then((myPublicKey:any) => {
                return {
                    "@type": "controller-descriptor",
                    label:"", // TODO: add member for controller id.
                    key: myPublicKey.toJSON(),
                    keyPurposes: [
                        {
                            documentType:"purpose/bind",
                            required: true,
                            description: "attach controller to realm"
                        }
                    ]
                }
            })
    }

    // POST /controller/
    public binder(req:express.Request, res:express.Response) : void {

        this.addCORS(res)

        if (!req.body) {
            res.status(400).send("missing post data.")
            return
        }

        if (!req.query.secret) {
            res.status(400).send("missing '?secret=...'")
            return
        }

        if (req.query.secret != this.bindingSecret) {
          res.status(400).send("secret param does not match secret.")
          return
        }

        this.getBinding()
        .then(bound => {

          if (bound) {
              res.status(400).send("controller already bound.")
              return
          }

          this.logger.info("post bind <= "+JSON.stringify(req.body))
          this.logger.info("binder got: "+req.body)

          let signed = req.body
          let verified = null
          let realmKey = null
          let binding:ControllerBinding = null

          return this.integrity.verify(signed)
            .then((v:any) => {
              verified = v
              this.logger.info("binder verified: "+v)

              return Promise.all([
                  jose.JWK.asKey(verified.header.jwk),
                  verified.payload.toString("utf8")
              ])
            })
            .then((l:any[]) => {
              realmKey = l[0]
              let data = l[1]
              let b = JSON.parse(data)
              this.logger.info("binder received: ", data)
              binding = new ControllerBinding(b)
              return this.setBinding(binding, realmKey)
            })
            .then((done:boolean)=> {
              this.logger.info("responded: ", 201, "data: ", JSON.stringify(done))
              let realmName = binding.realmDescriptor.name;
              let realmUrl = "https://"+realmName+"/realm-api"
              this.listActions = this.bindFunc(realmUrl,realmName,binding)
              res.status(201).json({})
            })
        })
        .catch((err:Error) => {
          this.logger.error("error! ", err)
          if (err.stack) this.logger.error("error! ", err.stack)
          res.status(500).send("error: " + err)
        })

    }

    // DELETE /controller/
    public unbinder(req:express.Request, res:express.Response) : void {
        this.getBinding()
        .then(binding => {
            this.logger.info("requesting binding delete.")
            this.binding = null;
            return this.integrity.deleteControllerBinding()
        })
        .then(done => {
            this.logger.info("deleted: "+done)
            res.status(201).send("")
        })
        .catch(err => {
          this.logger.error("error! ", err)
          if (err.stack) this.logger.error("error! ", err.stack)
          res.status(500).send("error: " + err)
        })
    }

    // create binding with realm
    public setBinding(binding:ControllerBinding, realmKey: jose.Key) : Promise<any> {

        this.logger.info("binding: ", JSON.stringify(binding, null, 2))
        this.logger.info(" with realmKey: ", JSON.stringify(realmKey, null, 2))

        return Promise.all([
            this.integrity.verify(binding.controllerCertificateChain),
            this.integrity.verify(binding.mandate)
        ])
            .then((l:any[]) => {
                let cver = l[0]
                let mver = l[1]
                return Promise.all([
                    cver.payload.toString("utf8"),
                    mver.payload.toString("utf8"),
                    jose.JWK.asKey(cver.header.jwk),
                    jose.JWK.asKey(mver.header.jwk),
                ])
            })
            .then((l:any[])=>{
                let cert = JSON.parse(l[0])
                let mand = JSON.parse(l[1])
                let ckey:jose.Key = l[2]
                let mkey:jose.Key = l[3]
                this.logger.debug("cert: ", cert)
                this.logger.debug("mandate: ", mand)
                // TODO: store keys to crypt
                this.binding = binding
                return this.integrity.setControllerBinding(binding)
            })
    }

    public originOptions(req:express.Request, res:express.Response) : void {
        this.addCORS(res)
        res.sendStatus(201)
    }

    public actions(req:express.Request, res:express.Response) : void {

        this.addCORS(res)

        let baseurl = this.myHost(req)
        let baseuri = this.apiUri;
        let realmName = this.binding.realmDescriptor.name;
        let realmUrl = "https://"+realmName+"/realm-api"
        let actions = this.listActions?
            this.listActions(baseurl,baseuri,realmName)
                .map(a => a.toJSON()):
            Array<any>()

        res.json(actions)
    }

}
