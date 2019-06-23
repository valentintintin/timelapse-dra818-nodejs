import { Observable } from 'rxjs';
import { Log } from './log';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { switchMap, tap } from 'rxjs/operators';
import fs = require('fs');

export interface SensorsData {
    voltage: number;
    temperature: number;
    boxOpened: boolean;
    draDetected: boolean;
}

export class Sensors {

    public static getAndSave(): Observable<SensorsData> {
        Log.log('sensors', 'Start get');

        const datas: SensorsData = {
            voltage: null,
            temperature: null,
            boxOpened: null,
            draDetected: null
        };

        return CommunicationArduino.receive(CommandArduino.GET_VOLTAGE).pipe(
            tap((data: number) => datas.voltage = data),
            switchMap(() => CommunicationArduino.receive(CommandArduino.GET_TEMPERATURE)),
            tap((data: number) => datas.temperature = data),
            switchMap(() => CommunicationArduino.receive(CommandArduino.GET_DRA)),
            tap((data: number) => datas.draDetected = data == 1),
            switchMap(() => CommunicationArduino.receive(CommandArduino.GET_BUTTON)),
            tap((data: number) => datas.boxOpened = data == 1),
            switchMap(() => {
                return new Observable<SensorsData>(observer => {
                    Log.log('sensors', 'Get OK', datas);

                    this.save(datas);

                    observer.next(datas);
                    observer.complete();
                });
            })
        );
    }

    private static save(datas: SensorsData): void {
        const csvPath = 'logs/datas.csv';

        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'date,' + Object.keys(datas).join(',') + '\n');
            Log.log('sensors', 'CSV created', csvPath);
        }

        fs.appendFileSync(csvPath, new Date().toLocaleString() + ',' + Object.values(datas).join(',') + '\n');
        Log.log('sensors', 'CSV saved with datas', csvPath);
    }
}
