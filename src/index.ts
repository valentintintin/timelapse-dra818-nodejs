import { Log } from './log';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { Sensors } from './sensors';
import { map, switchMap, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { Radio } from './radio';
import { Webcam } from './webcam';

interface ConfigInterface {
    lat: number,
    lng: number,
    altitude: number,
    callSrc: string,
    callDest?: string,
    symbolTable?: string,
    symbolCode?: string,
    commentAprs?: string,
    commentSstv?: string,
    voice?: string
}

const config: ConfigInterface = require('../config.json');

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
            config.lat && config.lng && config.altitude && config.callSrc &&
            data.sensorsData.draDetected &&
            new Date().getTime() - Log.getTimestamp('radio').getTime() >= 30 * 60 * 1000
        ) {
            return Radio.sendAprs({
                lat: config.lat,
                lng: config.lng,
                altitude: config.altitude,
                callSrc: config.callSrc,
                callDest: config.callDest,
                symbolTable: config.symbolTable,
                symbolCode: config.symbolCode,
                comment: config.commentAprs ? config.commentAprs.replace('{temp}', '' + data.sensorsData.temperature).replace('{voltage}', '' + data.sensorsData.voltage) : null
            }).pipe(
                switchMap(() => config.voice ? Radio.sendVoice(config.voice) : EMPTY),
                switchMap(() => config.commentSstv ? Radio.sendImage(data.imagePath, config.commentSstv.replace('{temp}', '' + data.sensorsData.temperature).replace('{voltage}', '' + data.sensorsData.voltage)) : EMPTY),
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
