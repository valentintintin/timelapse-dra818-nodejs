import { Log } from './log';
import { Sensors } from './sensors';
import { switchMap, tap } from 'rxjs/operators';
import { EMPTY, forkJoin } from 'rxjs';
import { ModeSstv, Radio } from './radio';
import { Webcam } from './webcam';
import { Sleep } from './sleep';

require('date.format');

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

if (process.argv.length <= 2) {
    processNormal();
} else {
    switch (process.argv[2]) {
        case 'sensors':
            Sensors.get().subscribe(data => console.log(data));
            break;

        case 'webcam':
            Webcam.capture().subscribe(data => console.log(data));
            break;

        case 'voice':
            Radio.sendVoice(config.voice).subscribe(data => console.log(data));
            break;

        case 'aprs':
            Radio.sendAprs({
                lat: config.lat,
                lng: config.lng,
                altitude: config.altitude,
                callSrc: config.callSrc,
                callDest: config.callDest,
                symbolTable: config.symbolTable,
                symbolCode: config.symbolCode,
                comment: config.commentAprs ? config.commentAprs : null
            }).subscribe(data => console.log(data));
            break;

        case 'sstv':
            Radio.sendImage('test.png', config.commentSstv, ModeSstv.Martin2).subscribe(data => console.log(data));
            break;

        case 'sleep':
            Sleep.sleep(config.lat, config.lng).subscribe(data => console.log(data));
            break;

        default:
            console.log('Command unrecognized. List : sensors, webcam, voice, aprs, sstv, sleep');
    }
}

function processNormal() {
    Log.log('program', 'Start');

    forkJoin({
        imagePath: Webcam.capture(),
        sensorsData: Sensors.getAndSave()
    }).pipe(
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
        Sleep.sleep(config.lat, config.lng).subscribe(
            (data) => Log.log('program', 'Stop OK', data),
            error => {
                Log.log('program', 'Stop KO', error.message);
                process.exit(1);
            }
        );
    });
}
