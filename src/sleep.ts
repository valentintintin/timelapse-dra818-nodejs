import SunCalc = require('suncalc');
import ChildProcess = require('child_process');
import { Observable } from 'rxjs';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { switchMap } from 'rxjs/operators';
import { Log } from './log';

export class Sleep {

    private static getSunCalcTime(lat: number, lng: number): SunCalcResultInterface {
        return SunCalc.getTimes(new Date(), lat, lng);
    }

    public static getWakeupDate(lat: number, lng: number): Date {
        let wakeUp = new Date();
        const sunTimes: SunCalcResultInterface = this.getSunCalcTime(lat, lng);

        if (wakeUp > sunTimes.dawn && wakeUp < sunTimes.dusk) {
            if (wakeUp < sunTimes.goldenHourEnd || wakeUp > sunTimes.goldenHour) {
                wakeUp.setMinutes(wakeUp.getMinutes() + 1);
            } else {
                wakeUp.setMinutes(wakeUp.getMinutes() + 3);
            }
        } else {
            wakeUp = sunTimes.dawn;
        }

        wakeUp.setSeconds(wakeUp.getSeconds() + 12); // shutdown time

        return wakeUp;
    }

    public static sleep(lat: number, lng: number): Observable<void> {
        const wakeup = this.getWakeupDate(lat, lng);

        Log.log('sleep', 'Wakeup at ' + wakeup.toLocaleString());

        return new Observable<string>(observer => {
            observer.next(
                ChildProcess.execFileSync('softs/rtcctl', [
                    'set',
                    'alarm1',
                    wakeup.format('{DD}.{MM}.{YYYY} {hh}:{mm}:{ss}')
                ], {
                    encoding: 'utf-8'
                })
            );
            observer.complete();
        }).pipe(
            switchMap(() => {
                return new Observable<string>(observer => {
                    observer.next(
                        ChildProcess.execFileSync('softs/rtcctl', [
                            'set',
                            'alarm2',
                            this.getSunCalcTime(lat, lng).dawn.format('{DD}.{MM}.{YYYY} {hh}:{mm}:{ss}')
                        ], {
                            encoding: 'utf-8'
                        })
                    );
                    observer.complete();
                })
            }),
            switchMap(() => CommunicationArduino.send(CommandArduino.SLEEP))
        )
    }
}

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
