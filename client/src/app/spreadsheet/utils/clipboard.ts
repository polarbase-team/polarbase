import { fromEvent, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import _ from 'lodash';

export type ClipboardItem<T = any> = {
  text: string;
  data?: any;
  metadata?: T;
};

export type ClipboardData<T = any> = {
  matrix: ClipboardItem<T>[][] | null;
  rowCount: number;
  columnCount: number;
  count: number;
};

export type ClipboardConfig = {
  target: HTMLElement;
  pause: boolean;
  shouldPause: (e: ClipboardEvent) => boolean;
};

const TAB_CHAR: string = '\t';
const NEWLINE_CHAR: string = '\n';
const EMPTY_REGEX: RegExp = /[^\n\t]/g;

const splitTextIntoMatrix = _.memoize(function (text: string): ClipboardItem[][] {
  if (text.match(EMPTY_REGEX) === null) {
    return [[{ text: '' }]];
  }

  const matrix: ClipboardItem[][] = [];

  for (const line of text.split(NEWLINE_CHAR)) {
    const arr: ClipboardItem[] = [];

    for (const t of line.split(TAB_CHAR)) {
      arr.push({ text: t });
    }

    matrix.push(arr);
  }

  return matrix;
});

export class Clipboard<T = any> {
  readonly copy$: Subject<ClipboardEvent> = new Subject<ClipboardEvent>();
  readonly cut$: Subject<[ClipboardEvent, ClipboardData<T>]> = new Subject<
    [ClipboardEvent, ClipboardData<T>]
  >();
  readonly paste$: Subject<[ClipboardEvent, ClipboardData<T>]> = new Subject<
    [ClipboardEvent, ClipboardData<T>]
  >();

  private _matrix: ClipboardItem<T>[][];
  private _nativeText: string;
  private _isCutAction: boolean;
  private _isPaused: boolean;
  private _copyEventSub: Subscription;
  private _cutEventSub: Subscription;
  private _pasteEventSub: Subscription;

  get isCutAction(): boolean {
    return this._isCutAction;
  }

  constructor(config?: Partial<ClipboardConfig>) {
    let target: HTMLElement | Document = document;
    let shouldPause: (e: ClipboardEvent) => boolean;

    if (config) {
      this._isPaused = config.pause;

      target = config.target || target;
      shouldPause = config.shouldPause;
    }

    this._copyEventSub = fromEvent<ClipboardEvent>(target, 'copy')
      .pipe(filter((e): boolean => !this._isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused: boolean = this._isPaused || shouldPause?.(e);

        if (isPaused) return;

        this._isCutAction = false;

        this.copy$.next(e);
      });

    this._cutEventSub = fromEvent<ClipboardEvent>(target, 'cut')
      .pipe(filter((e): boolean => !this._isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused: boolean = this._isPaused || shouldPause?.(e);

        if (isPaused) return;

        this._isCutAction = true;

        this.copy$.next(e);
      });

    this._pasteEventSub = fromEvent<ClipboardEvent>(target, 'paste')
      .pipe(filter((e): boolean => !this._isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused: boolean = this._isPaused || shouldPause?.(e);

        if (isPaused) return;

        const nativePastedText: string = e.clipboardData
          .getData('text')
          .replace(/\r\n/g, NEWLINE_CHAR);

        if (this._nativeText !== nativePastedText) {
          this._nativeText = nativePastedText;

          const matrix: ClipboardItem[][] = splitTextIntoMatrix(this._nativeText);

          this._matrix = [...matrix];
          this._isCutAction = false;
        }

        const data: ClipboardData<T> = this.read();

        if (this._isCutAction) {
          this.cut$.next([e, data]);

          this._isCutAction = false;
        }

        this.paste$.next([e, data]);
      });
  }

  continue() {
    this._isPaused = false;
  }

  pause() {
    this._isPaused = true;
  }

  stop() {
    this._copyEventSub.unsubscribe();
    this._cutEventSub.unsubscribe();
    this._pasteEventSub.unsubscribe();

    this.copy$.complete();
    this.cut$.complete();
    this.paste$.complete();

    this._isPaused = this._copyEventSub = this._cutEventSub = this._pasteEventSub = undefined;
  }

  read(): ClipboardData<T> {
    const data: ClipboardData<T> = {
      matrix: null,
      rowCount: 0,
      columnCount: 0,
      count: 0,
    };

    if (this._matrix) {
      data.matrix = this._matrix;
      data.rowCount = this._matrix.length;
      data.columnCount = this._matrix[0].length;
      data.count = data.rowCount * data.columnCount;
    }

    return data;
  }

  write(matrix: ClipboardItem<T>[][]) {
    this._matrix = matrix;

    const t: string[] = [];

    for (const items of matrix) {
      t.push(_.map(items, 'text').join(TAB_CHAR));
    }

    navigator.clipboard.writeText((this._nativeText = t.join(NEWLINE_CHAR)));
  }
}
