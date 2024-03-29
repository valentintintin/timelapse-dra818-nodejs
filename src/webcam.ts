import NodeWebcam = require('node-webcam');
import { Observable } from 'rxjs';
import { Log } from './log';

export class Webcam {

    private static readonly USE_FAKE = false;

    private static readonly webcam = NodeWebcam.create({
        width: 640,
        height: 480,
        quality: 100,
        skip: 75,
        saveShots: true,
        output: 'png',
        callbackReturn: 'location',
        verbose: false
    });

    public static capture(): Observable<string> {
        return new Observable<string>(observer => {
            Log.log('webcam', 'Start capture');

            if (!this.USE_FAKE) {
                this.webcam.capture(process.cwd() + '/photos/' + new Date().format('{YYYY}_{MM}_{DD}-{hh}_{mm}_{ss}'), (err, data) => {
                    if (err) {
                        Log.log('webcam', 'Capture error', err);
                        observer.error(err);
                    } else {
                        Log.log('webcam', 'Capture OK', data);
                        observer.next(data);
                        observer.complete();
                    }
                });
            } else {
                observer.next(process.cwd() + '/test.jpg');
                observer.complete();
            }
        });
    }
}
