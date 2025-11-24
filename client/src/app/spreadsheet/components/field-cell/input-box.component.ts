import _ from 'lodash';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

const NUMBER_REPLACER: RegExp = /^(-)|^e|^([0-9]+)([.e])[.e]*([0-9]*)[.e]*|[^0-9.e\n]+/gm;
const INTEGER_REPLACER: RegExp = /^(-)|^e|^([0-9]+)(e)e*([0-9]*)e*|[^0-9e\n]+/gm;
const POSITIVE_NUMBER_REPLACER: RegExp = /^e|^([0-9]+)([.e])[.e]*([0-9]*)[.e]*|[^0-9.e\n]+/gm;
const POSITIVE_INTEGER_REPLACER: RegExp = /^e|^([0-9]+)(e)e*([0-9]*)e*|[^0-9e\n]+/gm;

function omitNonNumericChars(
  text: string,
  allowNegative: boolean = true,
  isInteger: boolean = false,
): string {
  return allowNegative
    ? text.replace(isInteger ? INTEGER_REPLACER : NUMBER_REPLACER, `$1$2$3$4`)
    : text.replace(isInteger ? POSITIVE_INTEGER_REPLACER : POSITIVE_NUMBER_REPLACER, `$1$2$3`);
}

export const InputBoxType = {
  Text: 'text',
  Number: 'number',
  Integer: 'integer',
  PositiveNumber: 'positive-number',
  PositiveInteger: 'positive-integer',
} as const;
export type InputBoxType = (typeof InputBoxType)[keyof typeof InputBoxType];

export type InputBoxContent = string | number;

@Component({
  selector: 'input-box',
  template: '',
  styleUrls: ['./input-box.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// export class InputBoxComponent implements AfterViewInit {
export class InputBoxComponent implements OnChanges {
  @HostBinding('attr.contenteditable')
  protected readonly attrContentEditable: string = 'plaintext-only';

  @HostBinding('attr.type')
  @Input()
  type: InputBoxType | string = InputBoxType.Text;
  @Input() content: InputBoxContent;
  @HostBinding('attr.placeholder')
  @Input()
  placeholder: string;

  @Output() edited: EventEmitter<InputBoxContent> = new EventEmitter<InputBoxContent>();
  @Output() contentChange: EventEmitter<string> = new EventEmitter<string>();

  private eleRef: ElementRef = inject(ElementRef);

  private bkContent: InputBoxContent;

  get editor(): HTMLElement {
    return this.eleRef.nativeElement;
  }

  get textContent(): string {
    return this.editor.textContent;
  }
  set textContent(content: string) {
    this.editor.textContent = content;
  }

  get isFocusing(): boolean {
    return document.activeElement === this.editor;
  }

  get isGenericNumberType(): boolean {
    return (
      this.type === InputBoxType.Number ||
      this.type === InputBoxType.Integer ||
      this.type === InputBoxType.PositiveNumber ||
      this.type === InputBoxType.PositiveInteger
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.writeContent((this.bkContent = this.content), false);
    }
  }

  revert() {
    this.writeContent(this.bkContent);
  }

  keypress(e: KeyboardEvent) {
    if (!this.validateKeyPress(e)) return;
    this.writeContent(e.key);
    this.markAsEdited();
  }

  focus() {
    this.editor.focus({ preventScroll: false });
    this.setCaretAtEnd();
  }

  blur() {
    this.editor.blur();
  }

  @HostListener('click', ['$event'])
  @HostListener('contextmenu', ['$event'])
  @HostListener('wheel', ['$event'])
  @HostListener('copy', ['$event'])
  @HostListener('cut', ['$event'])
  @HostListener('paste', ['$event'])
  protected onEvents(e: Event) {
    e.stopPropagation();
  }

  @HostListener('input', ['$event'])
  protected onInput(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    this.writeContent(this.textContent);
    this.markAsEdited();
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent) {
    if (!e.isComposing && (e.code === 'Tab' || (!e.shiftKey && e.code === 'Enter'))) {
      this.blur();
      return;
    }

    if (e.code === 'Escape') {
      this.revert();
      this.blur();
      return;
    }

    this.validateKeyPress(e) ? e.stopPropagation() : e.preventDefault();
  }

  private markAsEdited() {
    let content: InputBoxContent = this.textContent;
    if (this.isGenericNumberType) {
      content = content ? parseFloat(content) : null;
    } else if (_.isString(content)) {
      content = content.trim();
    }
    this.edited.emit(content);
  }

  private validateKeyPress(e: KeyboardEvent) {
    return !e.shiftKey || e.code !== 'Enter';
  }

  private writeContent(content: InputBoxContent, emitEvent = true) {
    let text = String(content ?? '');

    if (text) {
      switch (this.type) {
        case InputBoxType.Number:
          text = omitNonNumericChars(text);
          break;
        case InputBoxType.Integer:
          text = omitNonNumericChars(text, true, true);
          break;
        case InputBoxType.PositiveNumber:
          text = omitNonNumericChars(text, false);
          break;
        case InputBoxType.PositiveInteger:
          text = omitNonNumericChars(text, false, true);
          break;
      }
    }

    if (this.textContent !== text) {
      this.textContent = text;
      this.setCaretAtEnd();
    }

    if (!emitEvent) return;
    this.contentChange.emit(text);
  }

  private setCaretAtEnd() {
    const range: Range = document.createRange();
    range.selectNodeContents(this.editor);
    range.collapse(false);

    const selection: Selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
