import { Observable } from 'rxjs';
import { Log } from './log';
import { delay, switchMap } from 'rxjs/operators';
import i2c = require('i2c-bus');

export enum CommandArduino {
    NOTHING,
    GET_VOLTAGE,
    GET_TEMPERATURE,
    GET_DRA,
    GET_BUTTON,
    SET_WAKEUP_HOUR,
    SET_WAKEUP_MINUTE,
    SLEEP,
    SET_PTT_ON,
    SET_PTT_OFF,
    SET_FREQ_APRS,
    SET_FREQ_SSTV
}

export class CommunicationArduino {

    private static readonly USE_FAKE = false;

    private static readonly ARDUINO_ADDR = 0x11;
    private static readonly i2c = i2c.openSync(1);

    public static send(command: CommandArduino, data: number = 0): Observable<void> {
        return new Observable<void>(observer => {
            Log.log('i2c', 'Send command', { command: CommandArduino[command], data: data });

            if (!this.USE_FAKE) {
                this.i2c.writeByteSync(this.ARDUINO_ADDR, command, data, 1);
            }

            Log.log('i2c', 'Send command OK', CommandArduino[command]);

            observer.next();
            observer.complete();
        }).pipe(delay(100));
    }

    public static receive(command: CommandArduino): Observable<number> {
        return this._receive(command).pipe(
            switchMap(() => this._receive(command, true))
        );
    }

    private static _receive(command: CommandArduino, log: boolean = false): Observable<number> {
        return new Observable<number>(observer => {
            if (log) {
                Log.log('i2c', 'Receive', CommandArduino[command]);
            }

            const received = !this.USE_FAKE ? this.i2c.readWordSync(this.ARDUINO_ADDR, command) : 1;

            if (log) {
                Log.log('i2c', 'Receive response', { command: CommandArduino[command], received: received });
            }

            observer.next(received);
            observer.complete();
        }).pipe(delay(100));
    }
}
