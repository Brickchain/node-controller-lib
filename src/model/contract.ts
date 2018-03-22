import { Base } from './base';

export class Contract extends Base {

  text: string;

  constructor(obj?: any) {
    super(obj);
    if (obj != undefined && obj != null) {
      this.text = obj.text;
    }
    this.type = 'contract'
  }

  public toJSON(): any {
    let obj = super.toJSON();
    obj.text = this.text;
    return obj;
  }

}
