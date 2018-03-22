import * as jose from "node-jose"

export class Base {

  static verifier = jose.JWS.createVerify();

  context: string;
  type: string;
  subtype: string;
  timestamp: Date;
  id: string;
  certificateChain: string;

  signed: string;

  constructor(obj?: any) {
    if (obj != undefined && obj != null) {
      this.id = obj["@id"];
      this.context = obj["@context"];
      this.type = obj["@type"];
      this.subtype = obj["@subtype"];
      if (obj["@timestamp"] != undefined) this.timestamp = new Date(obj["@timestamp"]);
      this.certificateChain = obj["@certificateChain"];
      this.signed = obj.signed;
    } else {
      this.context = 'https://brickchain.com/schema';
      this.type = 'base';
      this.timestamp = new Date(Date.now());
    }
  }

  public static parseSigned<T extends Base>(c: { new(obj?: any): T }, signed: any, id?: string): Promise<T> {
    let jws: any;
    if (typeof (signed) == 'string') {
      jws = JSON.parse(signed);
    } else {
      jws = signed;
    }
    return Base.verifier.verify(jws)
      .then(function (result) {
        let payload = result.payload.toString('utf-8');
        let document = new c(JSON.parse(payload));
        if (id != undefined && id != null) {
          document.id = id;
        }
        document.signed = JSON.stringify(jws);
        return document;
      });
  }

  public toString() {
    return JSON.stringify(this, null, 2);
  }

  public toJSON(): any {
    let obj: any = {};
    obj["@id"] = this.id;
    obj["@context"] = this.context;
    obj["@type"] = this.type;
    obj["@subtype"] = this.subtype;
    obj["@timestamp"] = this.timestamp;
    obj["@certificateChain"] = this.certificateChain;
    obj["signed"] = this.signed;
    return obj;
  }

}
