import { Log } from './log';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { Sensors } from './sensors';
import { map, switchMap, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { Radio } from './radio';
import { Webcam } from './webcam';
import SunCalc = require('suncalc');

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
    (data) => Log.log('program', 'run OK', data),
    error => Log.log('program', 'run KO', error.message)
).add(() => {
    let wakeUp = new Date();
    const sunTimes: SunCalcResultInterface = SunCalc.getTimes(wakeUp, config.lat, config.lng);

    if (wakeUp > sunTimes.dawn && wakeUp < sunTimes.dusk) {
        if (wakeUp < sunTimes.goldenHourEnd || wakeUp > sunTimes.goldenHour) {
            wakeUp.setMinutes(wakeUp.getMinutes() + 1);
            Log.log('sleep', 'Sunset or sunrise, Wakeup scheduled', wakeUp.toLocaleString());
        } else {
            wakeUp.setMinutes(wakeUp.getMinutes() + 3);
            Log.log('sleep', 'Day, wakeup scheduled', wakeUp.toLocaleString());
        }
    } else {
        wakeUp = sunTimes.dawn;
        Log.log('sleep', 'Night, Wakeup scheduled', wakeUp.toLocaleString());
    }

    CommunicationArduino.send(CommandArduino.SET_WAKEUP_HOUR, wakeUp.getHours())
        .pipe(
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_WAKEUP_MINUTE, wakeUp.getMinutes())),
            switchMap(() => CommunicationArduino.send(CommandArduino.SLEEP)),
        ).subscribe(
        (data) => Log.log('program', 'Stop OK', data),
        error => {
            Log.log('program', 'Stop KO', error.message);
            process.exit(1);
        }
    );
});

interface SunCalcResultInterface {
    sunrise: Date;
    sunriseEnd: Date;
    goldenHourEnd: Date;
    solarNoon: Date;
    goldenHour: Date;
    sunsetStart: Date;
    sunset: Date;
    dusk: Date;
    nauticalDusk: Date;
    night: Date;
    nadir: Date;
    nightEnd: Date;
    nauticalDawn: Date;
    dawn: Date;
}
