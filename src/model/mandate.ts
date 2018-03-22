import jose from 'node-jose';
import { Base } from "./base";

export class Mandate extends Base {

  role: string;
  label: string;
  ttl: number;
  recipient: string;
  recipientName: string;
  recipientPublicKey: any;
  requestId: string;
  sender: string;
  params: {};

  constructor(obj?: any) {
    super(obj);
    if (obj) {
      this.role = obj.role;
      this.label = obj.label;
      this.ttl = obj.ttl ? obj.ttl : 0;
      this.recipient = obj.recipient;
      this.recipientName = obj.recipientName;
      if (obj.recipientPublicKey) {
        jose.JWK.asKey(obj.recipientPublicKey, 'json').then(key => this.recipientPublicKey = key);
      }
      this.requestId = obj.requestId;
      this.sender = obj.sender;
      this.params = obj.params;
    }
    this.type = 'mandate';
  }

  public toJSON(): any {
    let obj = super.toJSON();
    obj.role = this.role;
    obj.label = this.label;
    obj.ttl = this.ttl;
    obj.recipient = this.recipient;
    obj.recipientName = this.recipientName;
    obj.recipientPublicKey = this.recipientPublicKey;
    obj.requestId = this.requestId;
    obj.sender = this.sender;
    obj.params = this.params;
    return obj;
  }

  getRealm(): string {
    let parts = this.role ? this.role.split("@", 2) : [];
    return parts.length == 2 ? parts[1] : undefined;
  }

  getShortRole(): string {
    let parts = this.role ? this.role.split("@", 2) : [];
    return parts.length == 2 ? parts[0] : undefined;
  }

  getIcon(): string {
    return 'md-key';
  }

}
