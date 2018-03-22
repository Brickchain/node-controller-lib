import { Base } from "./base";

export class Part {
  encoding: string;
  name: string;
  document: string;
  uri: string;
}

export class Multipart extends Base {

  parts: Part[];

  constructor(obj?: any) {
    super(obj);
    this.parts = obj.parts;
    this.type = 'multipart'
  }

  public toJSON(): any {
    let obj = super.toJSON();
    obj.parts = this.parts;
    return obj;
  }

}
