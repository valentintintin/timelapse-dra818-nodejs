import { Log } from './log';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { Sensors } from './sensors';
import { map, switchMap, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { Radio } from './radio';
import { Webcam } from './webcam';

Log.log('program', 'Start');

Webcam.capture().pipe(
    switchMap(imagePath => Sensors.getAndSave().pipe(map(sensorsData => {
            return {
                sensorsData: sensorsData,
                imagePath: imagePath
            }
        }))
    ),
    switchMap(data => {
        Log.log('program', 'Last transmit', Log.getTimestamp('radio').toLocaleString());
        if (
            data.sensorsData.draDetected &&
            new Date().getTime() - Log.getTimestamp('radio').getTime() >= 30 * 60 * 1000
        ) {
            return Radio.sendAprs({
                lat: 45.196250,
                lng: 5.727160,
                altitude: 300,
                callSrc: 'F4HVV-1',
                callDest: 'SSTV',
                symbolTable: '/',
                symbolCode: 'E',
                comment: 'Balise SSTV T=' + data.sensorsData.temperature + ' V=' + data.sensorsData.voltage
            }).pipe(
                switchMap(() => Radio.sendVoice('Balise SS TV, de Foxtrote 4, Hotel Victor Victor. QTH, la bastille')),
                switchMap(() => Radio.sendImage(data.imagePath, 'F4HVV')),
                tap(() => Log.logTimestamp('radio'))
            )
        } else {
            return EMPTY;
        }
    })
).subscribe(
    (data) => Log.log('program', 'Stop OK', data),
    error => Log.log('program', 'Stop KO', error.message)
).add(() => {
    const wakeUp = new Date();
    wakeUp.setMinutes(wakeUp.getMinutes() + 3);
    wakeUp.setSeconds(0);
    CommunicationArduino.send(CommandArduino.SET_WAKEUP_HOUR, wakeUp.getHours())
        .pipe(
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_WAKEUP_MINUTE, wakeUp.getMinutes())),
            switchMap(() => CommunicationArduino.send(CommandArduino.SLEEP)),
            tap(() => Log.log('program', 'Sleep and wakeup scheduled', wakeUp.toLocaleString()))
        ).subscribe();
});
