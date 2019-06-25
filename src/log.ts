import fs = require('fs');

export class Log {

    public static log(action: string, message: string = null, data: any = null): void {
        const now = new Date();
        const fileLog = process.cwd() + '/logs/' + now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '.log';

        const log =
            '[' + new Date().toLocaleString() + ']' +
            '[' + action.toUpperCase() + ']' +
            (message ? ' --> ' + message : '') +
            (data ? ' ' + JSON.stringify(data) : '');

        console.log(log);
        fs.appendFileSync(fileLog, log + '\n');
    }

    public static logTimestamp(action: string): void {
        fs.writeFileSync(process.cwd() + '/logs/' + action + '.log', new Date().getTime());
    }

    public static getTimestamp(action: string): Date {
        const logPath = process.cwd() + '/logs/' + action + '.log';
        if (!fs.existsSync(logPath)) {
            return new Date(0);
        }
        return new Date(+fs.readFileSync(logPath));
    }
}
