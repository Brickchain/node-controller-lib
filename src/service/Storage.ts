/**
 * Abstract class for storage
 *
 */

import {Logger} from './Logger';
var logger = Logger.create("Storage");

export class Storage {

    public constructor() {
    }

    public set(key:string, value:string):Promise<string> {
        throw new ReferenceError("set unimplemented. set "+key)
    }

    public setObj(key:string, json:Object):Promise<string> {
        let v = JSON.stringify(json);
        return this.set(key,v);
    }

    public get(key:string):Promise<string> {
        return Promise.reject("get not implemented")
    }

    public getObj(key: string): Promise<any> {
        return Promise.reject("getObj not implemented")
    }

    public list():Promise<string[]> {
        return Promise.reject("list not implemented")
    }

    public delete(key:string):Promise<any> {
        return Promise.reject("delete not implemented")
    }

    public writeReadTest(k:string, d:string):Promise<boolean> {
        return this.set(k,d)
            .then(v => this.get(k))
            .then(v => v == d)
    }

    public test() : Promise<boolean> {

        let key = "_test";

        return this.delete(key).then(ok=>this.writeReadTest(key, "1"))
            .then(ok => {
                logger.info("storage.test1-write ", ok)
                if (!ok) throw new Error("bad")
                return this.writeReadTest(key, "2")
            })
            .then(ok => {
                logger.info("storage.test2-delete ", ok);
                return this.delete(key).then(k => {
                    logger.info("storage.test2.deleted key: ", k)
                    return ok
                })
            })
            .then(ok => {
                logger.info("storage.test3-get ", ok);
                return this.get(key).then(v => {
                    logger.info("storage.test3.deleted key-value: ", key, "value: ", v)
                    return ok
                })
            })
            .catch(err => {
                logger.error("storage.test.error: ", err, JSON.stringify(err,null,2))
                return false
            })
    }


}
