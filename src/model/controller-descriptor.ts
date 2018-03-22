import { Base } from "./base";
import { Part } from "./multipart";
import { Realm } from "./realm";
import * as jose from "node-jose";

export class ControllerDescriptor extends Base {

  label: string;
  realm: string;
  actionsURI: string;
  adminUI: string;
  bindURI: string;
  key: jose.Key|any;  // requires promise so we need to store then JSON part if so.
  keyPurposes: string[];
  requireSetup: boolean;
  addBindingEndpoint: string;
  icon: string;

  constructor(obj?: any, key?:jose.Key) {
    super(obj);
    if (obj) {
      this.label = obj.label;
      this.realm = obj.realm;
      this.actionsURI = obj.actionsURI;
      this.adminUI = obj.adminUI;

      if (key) this.key = key;
      else this.key = obj.key;

      this.keyPurposes = obj.keyPurposes;
      this.requireSetup = obj.requireSetup;
      this.addBindingEndpoint = obj.addBindingEndpoint;
      this.icon = obj.icon;
    }
  }

  public toJSON():any {
    let obj = super.toJSON()
    obj.key = this.key;
    obj.label = this.label;
    obj.actionsURI = this.actionsURI;
    obj.adminUI = this.adminUI;
    obj.keyPurposes = this.keyPurposes;
    obj.requireSetup = this.requireSetup;
    obj.addBindingEndpoint = this.addBindingEndpoint;
    obj.icon = this.icon;
    obj.realm = this.realm;

    return obj;
  }

}
