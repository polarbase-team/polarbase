import _ from 'lodash';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';

const NUMBER_REPLACER = /^(-)|^e|^([0-9]+)([.e])[.e]*([0-9]*)[.e]*|[^0-9.e\n]+/gm;
const INTEGER_REPLACER = /^(-)|^e|^([0-9]+)(e)e*([0-9]*)e*|[^0-9e\n]+/gm;
const POSITIVE_NUMBER_REPLACER = /^e|^([0-9]+)([.e])[.e]*([0-9]*)[.e]*|[^0-9.e\n]+/gm;
const POSITIVE_INTEGER_REPLACER = /^e|^([0-9]+)(e)e*([0-9]*)e*|[^0-9e\n]+/gm;

function omitNonNumericChars(text: string, allowNegative = true, isInteger = false) {
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
  styleUrl: './input-box.component.scss',
  host: {
    '[attr.type]': 'type()',
    '[attr.placeholder]': 'placeholder()',
  },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputBoxComponent {
  type = input<InputBoxType | string>(InputBoxType.Text);
  placeholder = input<string>();
  content = input<InputBoxContent>();

  edited = output<InputBoxContent>();
  contentChange = output<string>();

  @HostBinding('attr.contenteditable')
  protected readonly attrContentEditable = 'plaintext-only';

  private eleRef = inject(ElementRef);
  private bkContent: InputBoxContent;

  get editor(): HTMLElement {
    return this.eleRef.nativeElement;
  }

  get textContent() {
    return this.editor.textContent;
  }
  set textContent(content: string) {
    this.editor.textContent = content;
  }

  get isFocusing() {
    return document.activeElement === this.editor;
  }

  get isGenericNumberType() {
    const type = this.type();
    return (
      type === InputBoxType.Number ||
      type === InputBoxType.Integer ||
      type === InputBoxType.PositiveNumber ||
      type === InputBoxType.PositiveInteger
    );
  }

  constructor() {
    effect(() => {
      this.writeContent((this.bkContent = this.content()), false);
    });
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
      switch (this.type()) {
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
    const range = document.createRange();
    range.selectNodeContents(this.editor);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
