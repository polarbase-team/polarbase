import { fromEvent, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

enum CombinationKey {
  Alt = 'Alt',
  Command = 'Cmd',
  Ctrl = 'Ctrl',
  Meta = 'Meta',
  Shift = 'Shift',
}

export type KeyboardConfig = {
  target: HTMLElement;
  pause: boolean;
  shouldPause: (e: KeyboardEvent) => boolean;
};

const IS_MACOS: boolean = /Mac/i.test(navigator.userAgent);

export class Keyboard {
  readonly keydown$: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();
  readonly keyup$: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

  private _isPaused: boolean;
  private _keydownEventSub: Subscription;
  private _keyupEventSub: Subscription;

  constructor(config?: Partial<KeyboardConfig>) {
    let target: HTMLElement | Document = document;
    let shouldPause: (e: KeyboardEvent) => boolean;

    if (config) {
      this._isPaused = config.pause;

      target = config.target || target;
      shouldPause = config.shouldPause;
    }

    this._keydownEventSub = fromEvent<KeyboardEvent>(target, 'keydown')
      .pipe(filter((e): boolean => !this._isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        this.keydown$.next(e);
      });

    this._keyupEventSub = fromEvent<KeyboardEvent>(target, 'keyup')
      .pipe(filter((e): boolean => !this._isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        this.keyup$.next(e);
      });
  }

  static parseKeyCombination(e: KeyboardEvent, detectOS: boolean = false): string {
    const arr: string[] = [];

    if (e.ctrlKey) {
      if (detectOS && !IS_MACOS) {
        arr.push(CombinationKey.Command);
      } else {
        arr.push(CombinationKey.Ctrl);
      }
    }

    if (e.metaKey) {
      if (detectOS && IS_MACOS) {
        arr.push(CombinationKey.Command);
      } else {
        arr.push(CombinationKey.Meta);
      }
    }

    if (e.shiftKey) {
      arr.push(CombinationKey.Shift);
    }

    if (e.altKey) {
      arr.push(CombinationKey.Alt);
    }

    arr.push(e.code);

    return arr.join('.');
  }

  continue() {
    this._isPaused = false;
  }

  pause() {
    this._isPaused = true;
  }

  stop() {
    this._keydownEventSub.unsubscribe();
    this._keyupEventSub.unsubscribe();

    this.keydown$.complete();
    this.keyup$.complete();

    this._isPaused = this._keydownEventSub = this._keyupEventSub = undefined;
  }
}
