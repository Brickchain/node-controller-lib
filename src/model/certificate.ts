export class Certificate {

  timestamp: Date;
  ttl: number;
  root: any;
  subKey: any;
  keyLevel: number;
  keyType: string;
  documentTypes: string[];

  constructor(poj?:any) {
      if (poj) {
        this.timestamp = poj.timestamp;
        this.ttl = poj.ttl;
        this.root = poj.root;
        this.subKey = poj.subKey;
        this.keyLevel = poj.keyLevel;
        this.keyType = poj.keyType;
        this.documentTypes = poj.documentTypes;
      }
  }

  public hasExpired(): boolean {
    return Date.now() > this.timestamp.getTime() + this.ttl;
  }

  public allowedType(docType: string): boolean {
    return ('*' in this.documentTypes) || (docType in this.documentTypes);
  }

}
