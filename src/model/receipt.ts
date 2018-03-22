import { Base } from "./base";

export class Receipt extends Base {

  label: string;
  role: string;
  action: string;
  viewuri: string;
  jwt: string;
  intervals: Array<any>;
  params: any;

  constructor(obj?: any) {
    super(obj);
    if (obj) {
      this.label = obj.label;
      this.role = obj.role;
      this.action = obj.action;
      this.viewuri = obj.viewuri;
      this.jwt = obj.jwt;
      this.params = obj.params;
      if (obj.intervals) {
        this.intervals = obj.intervals.map(interval => {
          return {
            start: new Date(interval.start),
            end: new Date(interval.end)
          };
        });
      }
    }
    this.type = 'receipt';
  }

  public toJSON(): any {
    let obj = super.toJSON();
    obj.label = this.label;
    obj.role = this.role;
    obj.viewuri = this.viewuri;
    obj.jwt = this.jwt;
    obj.intervals = this.intervals;
    obj.params = this.params;
    return obj;
  }

}
