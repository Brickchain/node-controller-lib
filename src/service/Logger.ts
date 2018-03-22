
export class Logger {

    static logger = (name:string) => {
        return new Logger(name);
    }

    name:String = "";

    constructor(name:string) {
        this.name = name;
    }

    public static create(name:string):Logger {
        return Logger.logger(name);
    }

    public log(message:string, ...args:any[]) {
        console.log(this.name, ":", message, ...args)
    }

    public error(message:string, ...args:any[]) {
        console.error(message + args?args.join(","):"")
    }

    public debug(message:string, ...args:any[]) {
        console.debug(message + args?args.join(","):"")
    }

    public info(message:string, ...args:any[]) {
        console.info(message + args?args.join(","):"")
    }


}
