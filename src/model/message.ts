import { Base } from "./base";

export class Message extends Base {

    title: string
    message: string

    constructor(obj?: any) {
        super(obj)
        this.type = 'message'
        this.title = obj.title
        this.message = obj.message
    }

    public toJSON(): any {
        let obj = super.toJSON()
        obj.title = this.title
        obj.message = this.message
        return obj
    }
}