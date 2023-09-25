import readline from 'readline';

type InputStream = NodeJS.ReadStream;
type OutputStream = NodeJS.WritableStream;

export class CommandInterface {

    private rl:  readline.Interface;

    constructor(input?: InputStream, output?: OutputStream) {
        input = input || process.stdin;
        output = output || process.stdout;
        this.rl = readline.createInterface({
            input,
            output
        });
    }

    async question(prompt: string, defaultValue?: string, required?: boolean): Promise<string | undefined> {
        const func = async(): Promise<string> => {
            return new Promise(((resolve: any, _reject: any) => {
                this.rl.question(prompt + (defaultValue ? '['+defaultValue+']' : (required ? '*' : '')), function (value) {
                    resolve(value);
                });
            }).bind(this));
        }
        if (required && !defaultValue) {
            let val: string;
            do {
                val = await func();
            } while(!val);
            return val;
        } else {
            let val: string = await func();
            return val || defaultValue;
        }
    }

    async close() {
        return new Promise(((resolve:any, _reject:any) => {
            this.rl.on('close', function () {
                resolve();
            });
            this.rl.close();
        }).bind(this));
    }

}
