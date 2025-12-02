import _ from 'lodash';
import { fromEvent, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface ClipboardData {
  matrix: string[][] | null;
  rowCount: number;
  columnCount: number;
  count: number;
}

export interface ClipboardConfig {
  target: HTMLElement;
  disabled: boolean;
  shouldIgnoreEvent: (e: ClipboardEvent) => boolean;
}

const TAB_CHAR: string = '\t';
const NEWLINE_CHAR: string = '\n';
const EMPTY_REGEX: RegExp = /[^\n\t]/g;

function splitTextIntoMatrix(text: string) {
  if (text.match(EMPTY_REGEX) === null) {
    return [['']];
  }

  const matrix: string[][] = [];
  for (const line of text.split(NEWLINE_CHAR)) {
    const arr: string[] = [];
    for (const t of line.split(TAB_CHAR)) {
      arr.push(t);
    }
    matrix.push(arr);
  }
  return matrix;
}

export class Clipboard {
  readonly copy$ = new Subject<ClipboardEvent>();
  readonly cut$ = new Subject<[ClipboardEvent, ClipboardData]>();
  readonly paste$ = new Subject<[ClipboardEvent, ClipboardData]>();

  private matrix: string[][];
  private nativeText: string;
  private _isCutAction: boolean;
  private isDisabled: boolean;
  private copyEventSub: Subscription;
  private cutEventSub: Subscription;
  private pasteEventSub: Subscription;

  get isCutAction() {
    return this._isCutAction;
  }

  constructor(config?: Partial<ClipboardConfig>) {
    let target: HTMLElement | Document = document;
    let shouldIgnoreEvent: (e: ClipboardEvent) => boolean;

    if (config) {
      this.isDisabled = config.disabled;
      target = config.target || target;
      shouldIgnoreEvent = config.shouldIgnoreEvent;
    }

    this.copyEventSub = fromEvent<ClipboardEvent>(target, 'copy')
      .pipe(filter((e) => !this.isDisabled && !shouldIgnoreEvent?.(e)))
      .subscribe((e) => {
        const isDisabled = this.isDisabled || shouldIgnoreEvent?.(e);
        if (isDisabled) return;

        this._isCutAction = false;
        this.copy$.next(e);
      });

    this.cutEventSub = fromEvent<ClipboardEvent>(target, 'cut')
      .pipe(filter((e) => !this.isDisabled && !shouldIgnoreEvent?.(e)))
      .subscribe((e) => {
        const isDisabled = this.isDisabled || shouldIgnoreEvent?.(e);
        if (isDisabled) return;

        this._isCutAction = true;
        this.copy$.next(e);
      });

    this.pasteEventSub = fromEvent<ClipboardEvent>(target, 'paste')
      .pipe(filter((e) => !this.isDisabled && !shouldIgnoreEvent?.(e)))
      .subscribe((e) => {
        const isDisabled = this.isDisabled || shouldIgnoreEvent?.(e);
        if (isDisabled) return;

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

  enable() {
    this.isDisabled = false;
  }

  disable() {
    this.isDisabled = true;
  }

  destroy() {
    this.copyEventSub.unsubscribe();
    this.cutEventSub.unsubscribe();
    this.pasteEventSub.unsubscribe();
    this.copy$.complete();
    this.cut$.complete();
    this.paste$.complete();
    this.isDisabled = this.copyEventSub = this.cutEventSub = this.pasteEventSub = undefined;
  }

  read() {
    const data: ClipboardData = {
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

  write(matrix: string[][]) {
    this.matrix = matrix;

    const t: string[] = [];
    for (const items of matrix) {
      t.push(_.map(items, 'text').join(TAB_CHAR));
    }
    navigator.clipboard.writeText((this.nativeText = t.join(NEWLINE_CHAR)));
  }
}
