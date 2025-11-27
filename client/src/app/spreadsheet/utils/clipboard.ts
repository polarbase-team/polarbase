import _ from 'lodash';
import { fromEvent, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface ClipboardItem<T = any> {
  text: string;
  data?: any;
  metadata?: T;
}

export interface ClipboardData<T = any> {
  matrix: ClipboardItem<T>[][] | null;
  rowCount: number;
  columnCount: number;
  count: number;
}

export interface ClipboardConfig {
  target: HTMLElement;
  pause: boolean;
  shouldPause: (e: ClipboardEvent) => boolean;
}

const TAB_CHAR: string = '\t';
const NEWLINE_CHAR: string = '\n';
const EMPTY_REGEX: RegExp = /[^\n\t]/g;

function splitTextIntoMatrix(text: string) {
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
}

export class Clipboard<T = any> {
  readonly copy$ = new Subject<ClipboardEvent>();
  readonly cut$ = new Subject<[ClipboardEvent, ClipboardData<T>]>();
  readonly paste$ = new Subject<[ClipboardEvent, ClipboardData<T>]>();

  private matrix: ClipboardItem<T>[][];
  private nativeText: string;
  private _isCutAction: boolean;
  private isPaused: boolean;
  private copyEventSub: Subscription;
  private cutEventSub: Subscription;
  private pasteEventSub: Subscription;

  get isCutAction() {
    return this._isCutAction;
  }

  constructor(config?: Partial<ClipboardConfig>) {
    let target: HTMLElement | Document = document;
    let shouldPause: (e: ClipboardEvent) => boolean;

    if (config) {
      this.isPaused = config.pause;
      target = config.target || target;
      shouldPause = config.shouldPause;
    }

    this.copyEventSub = fromEvent<ClipboardEvent>(target, 'copy')
      .pipe(filter((e) => !this.isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused = this.isPaused || shouldPause?.(e);
        if (isPaused) return;

        this._isCutAction = false;
        this.copy$.next(e);
      });

    this.cutEventSub = fromEvent<ClipboardEvent>(target, 'cut')
      .pipe(filter((e) => !this.isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused = this.isPaused || shouldPause?.(e);
        if (isPaused) return;

        this._isCutAction = true;
        this.copy$.next(e);
      });

    this.pasteEventSub = fromEvent<ClipboardEvent>(target, 'paste')
      .pipe(filter((e) => !this.isPaused && !shouldPause?.(e)))
      .subscribe((e) => {
        const isPaused = this.isPaused || shouldPause?.(e);
        if (isPaused) return;

        const nativePastedText = e.clipboardData.getData('text').replace(/\r\n/g, NEWLINE_CHAR);
        if (this.nativeText !== nativePastedText) {
          this.nativeText = nativePastedText;

          const matrix = splitTextIntoMatrix(this.nativeText);
          this.matrix = [...matrix];
          this._isCutAction = false;
        }

        const data = this.read();
        if (this.isCutAction) {
          this.cut$.next([e, data]);
          this._isCutAction = false;
        }
        this.paste$.next([e, data]);
      });
  }

  continue() {
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
  }

  stop() {
    this.copyEventSub.unsubscribe();
    this.cutEventSub.unsubscribe();
    this.pasteEventSub.unsubscribe();
    this.copy$.complete();
    this.cut$.complete();
    this.paste$.complete();
    this.isPaused = this.copyEventSub = this.cutEventSub = this.pasteEventSub = undefined;
  }

  read(): ClipboardData<T> {
    const data: ClipboardData<T> = {
      matrix: null,
      rowCount: 0,
      columnCount: 0,
      count: 0,
    };
    if (this.matrix) {
      data.matrix = this.matrix;
      data.rowCount = this.matrix.length;
      data.columnCount = this.matrix[0].length;
      data.count = data.rowCount * data.columnCount;
    }
    return data;
  }

  write(matrix: ClipboardItem<T>[][]) {
    this.matrix = matrix;

    const t: string[] = [];
    for (const items of matrix) {
      t.push(_.map(items, 'text').join(TAB_CHAR));
    }
    navigator.clipboard.writeText((this.nativeText = t.join(NEWLINE_CHAR)));
  }
}
