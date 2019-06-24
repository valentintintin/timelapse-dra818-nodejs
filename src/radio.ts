import { Observable } from 'rxjs';
import { Log } from './log';
import { CommandArduino, CommunicationArduino } from './communicationArduino';
import { catchError, delay, switchMap } from 'rxjs/operators';
import ChildProcess = require('child_process');
import PicoSpeaker = require('pico-speaker');
import PlaySound = require('play-sound');
import Jimp = require('jimp');

export interface AprsData {
    callSrc: string;
    callDest?: string;
    lat: number;
    lng: number;
    altitude?: number;
    comment?: string;
    path?: string;
    symbolTable?: string;
    symbolCode?: string;
}

export enum ModeSstv {
    Martin1 = 'm1',
    Martin2 = 'm2',
    Scottie1 = 's1',
    Scottie2 = 's2',
    ScottieDX = 'sdx',
    Robot36 = 'r36'
}

export class Radio {

    private static readonly player = PlaySound();

    public static sendAprs(data: AprsData): Observable<void> {
        Log.log('radio', 'Send APRS', data);

        return CommunicationArduino.send(CommandArduino.SET_FREQ_APRS).pipe(
            delay(500),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_ON)),
            delay(500),
            switchMap(() => {
                return new Observable<void>(observer => {
                    ChildProcess.execFileSync('softs/ax25beacon/ax25beacon', [
                        '-s ' + data.callSrc,
                        '-d ' + (data.callDest ? data.callDest : 'APRS'),
                        '-p ' + (data.path ? data.path : 'WIDE1-1,WIDE2-2'),
                        '-t ' + (data.symbolTable ? data.symbolTable : '/'),
                        '-c ' + (data.symbolCode ? data.symbolCode : '"'),
                        '' + data.lat,
                        '' + data.lng,
                        data.altitude ? '' + data.altitude : '0',
                        data.comment ? data.comment : ''
                    ], {
                        encoding: 'utf-8'
                    });

                    Log.log('radio', 'Send APRS OK');

                    observer.next();
                    observer.complete();
                });
            }),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_OFF)),
            delay(500),
            catchError(err => {
                Log.log('radio', 'Send APRS KO', err);
                return CommunicationArduino.send(CommandArduino.SET_PTT_OFF).pipe(delay(500))
            }),
        );
    }

    public static sendVoice(message: string): Observable<void> {
        PicoSpeaker.init({
            AUDIO_DEVICE: null, // default
            LANGUAGE: 'fr-FR'
        });

        return CommunicationArduino.send(CommandArduino.SET_FREQ_SSTV).pipe(
            delay(500),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_ON)),
            delay(500),
            switchMap(() => {
                return new Observable<void>(observer => {
                    Log.log('radio', 'Send voice', message);

                    PicoSpeaker.speak(message).then(() => {
                        Log.log('radio', 'Send voice OK');
                        observer.next();
                        observer.complete();
                    });
                });
            }),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_OFF)),
            delay(500),
            catchError(err => {
                Log.log('radio', 'Send voice KO', err);
                return CommunicationArduino.send(CommandArduino.SET_PTT_OFF).pipe(delay(500))
            }),
        );
    }

    public static sendImage(imagePath: string, comment: string, mode: ModeSstv = ModeSstv.Martin2): Observable<void> {
        Log.log('radio', 'Send image', imagePath);

        return new Observable<void>(observer => {
            let loadedImage: Jimp;

            Jimp.read(imagePath)
                .then(function (image) {
                    loadedImage = image;
                    return Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
                })
                .then(function (font) {
                    loadedImage
                        .resize(320, 240)
                        .print(font, 0, 0, comment.toUpperCase())
                        .print(font, 0, loadedImage.getHeight() - 16, comment.toUpperCase())
                        .write('/tmp/sstv.jpg');
                    observer.next();
                    observer.complete();
                })
                .catch(function (err) {
                    observer.error(err);
                });
        }).pipe(delay(500)).pipe(
            switchMap(() => {
                return new Observable<string>(observer => {
                    observer.next(
                        ChildProcess.execFileSync('softs/pisstvpp/pisstvpp', [
                            '-p' + mode,
                            '/tmp/sstv.jpg'
                        ], {
                            encoding: 'utf-8'
                        })
                    );
                    observer.complete();
                });
            }),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_FREQ_SSTV)),
            delay(500),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_ON)),
            delay(500),
            switchMap(() => {
                return new Observable<void>(observer => {
                    this.player.play('1750.wav', err => {
                        if (err) {
                            observer.error(err);
                        } else {
                            observer.next();
                            observer.complete();
                        }
                    });
                });
            }),
            switchMap(() => {
                return new Observable<void>(observer => {
                    this.player.play('/tmp/sstv.jpg.wav', err => {
                        if (err) {
                            observer.error(err);
                        } else {
                            Log.log('radio', 'Send image OK');
                            observer.next();
                            observer.complete();
                        }
                    });
                });
            }),
            switchMap(() => CommunicationArduino.send(CommandArduino.SET_PTT_OFF).pipe(delay(500))),
            catchError(err => {
                Log.log('radio', 'Send image KO', err);
                return CommunicationArduino.send(CommandArduino.SET_PTT_OFF).pipe(delay(500))
            })
        );
    }
}
