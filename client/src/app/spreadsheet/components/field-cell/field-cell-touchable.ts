import { afterNextRender, Directive, HostBinding, HostListener } from '@angular/core';

import { FieldCell } from './field-cell';

export type CellTouchEvent = MouseEvent | TouchEvent | KeyboardEvent;

@Directive()
export class FieldCellTouchable<T = any> extends FieldCell<T> {
  @HostBinding('attr.tabindex')
  protected readonly tabindex: number = 0;
  @HostBinding('class.field-cell-touchable')
  protected override readonly hostClass: boolean = true;

  constructor() {
    super();

    afterNextRender(() => {
      setTimeout(() => this.focus());
    });
  }

  focus() {
    this.elementRef.nativeElement.focus({ preventScroll: true });
  }

  blur() {
    this.elementRef.nativeElement.blur();
  }

  touch(e: CellTouchEvent = new MouseEvent('click')) {
    this.onTouch(e);
  }

  protected override onSelect() {
    super.onSelect();
    setTimeout(() => this.focus());
  }

  protected override onDeselect() {
    super.onDeselect();
    this.blur();
  }

  protected onTouch(_e: CellTouchEvent) {}

  @HostListener('dblclick', ['$event'])
  @HostListener('touchend', ['$event'])
  protected onDblClick(e: MouseEvent | TouchEvent) {
    this.touch(e);
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    const keyCode = e.keyCode;

    // https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
    if (
      (keyCode >= 48 && keyCode <= 90) ||
      (keyCode >= 96 && keyCode <= 111) ||
      (keyCode >= 186 && keyCode <= 222)
    ) {
      this.touch(e);
    }
  }
}
