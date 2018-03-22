import { Base } from "./base";
import { Part } from "./multipart";
import { Contract } from "./contract";

export class Action extends Base {

  role: string;
  mandate: string;
  nonce: string;
  params: any;
  facts: Part[];
  contract: Contract;

  constructor(obj?: any) {
    super(obj);
    if (obj) {
      this.role = obj.role;
      this.mandate = obj.mandate;
      this.nonce = obj.nonce;
      this.role = obj.role;
      this.params = obj.params;
      this.facts = obj.facts;
      this.contract = new Contract(obj.contract);
    }
  }

  public toJSON(): any {
    let obj = super.toJSON();
    obj.role = this.role;
    obj.mandate = this.mandate;
    obj.nonce = this.nonce;
    obj.role = this.role;
    obj.params = this.params;
    obj.facts = this.facts;
    obj.contract = this.contract;
    return obj;
  }

}
