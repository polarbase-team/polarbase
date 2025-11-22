import { fromEvent, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export const CombinationKey = {
  Alt: 'Alt',
  Command: 'Cmd',
  Ctrl: 'Ctrl',
  Meta: 'Meta',
  Shift: 'Shift',
} as const;
export type CombinationKey = (typeof CombinationKey)[keyof typeof CombinationKey];

export interface KeyboardConfig {
  target: HTMLElement;
  pause: boolean;
  shouldPause: (e: KeyboardEvent) => boolean;
}

const IS_MACOS: boolean = /Mac/i.test(navigator.userAgent);

export class Keyboard {
  keydown$: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();
  keyup$: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

  private isPaused: boolean;
  private keydownEventSub: Subscription;
  private keyupEventSub: Subscription;

  constructor(config?: Partial<KeyboardConfig>) {
    let target: HTMLElement | Document = document;
    let shouldPause: (e: KeyboardEvent) => boolean;
    if (config) {
      this.isPaused = config.pause;
      target = config.target || target;
      shouldPause = config.shouldPause;
    }

    this.keydownEventSub = fromEvent<KeyboardEvent>(target, 'keydown')
      .pipe(filter((e) => !this.isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        this.keydown$.next(e);
      });
    this.keyupEventSub = fromEvent<KeyboardEvent>(target, 'keyup')
      .pipe(filter((e) => !this.isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        this.keyup$.next(e);
      });
  }

  static parseKeyCombination(e: KeyboardEvent, detectOS = false) {
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
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
  }

  stop() {
    this.keydownEventSub.unsubscribe();
    this.keyupEventSub.unsubscribe();
    this.keydown$.complete();
    this.keyup$.complete();
    this.isPaused = this.keydownEventSub = this.keyupEventSub = undefined;
  }
}
