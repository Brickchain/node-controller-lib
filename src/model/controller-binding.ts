import { Base } from "./base";
import { Part } from "./multipart";
import { Realm } from "./realm";

export class ControllerBinding extends Base {

  realmDescriptor: Realm;
  adminRoles:string[];
  controllerCertificateChain:string;
  mandate:string;

  constructor(obj?: any) {
    super(obj);
    if (obj) {
      this.realmDescriptor = new Realm(obj.realmDescriptor);
      this.mandate = obj.mandate;
      this.controllerCertificateChain = obj.controllerCertificateChain;
      this.adminRoles = obj.adminRoles;
    }
  }

  public toJSON(): any {
    let obj = super.toJSON();
    if (this.realmDescriptor) obj.realmDescriptor = this.realmDescriptor.toJSON();
    obj.mandate = this.mandate;
    obj.adminRoles = this.adminRoles;
    obj.controllerCertificateChain = this.controllerCertificateChain;

    return obj;
  }

}
