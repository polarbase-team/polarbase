import { Directive, HostBinding, ViewChild } from '@angular/core';

import { CellTouchEvent } from './field-cell-touchable';
import { FieldCellEditable } from './field-cell-editable';
import { InputBoxComponent, InputBoxContent } from './input-box.component';

@Directive()
export class FieldCellInputable<T = any> extends FieldCellEditable<T> {
  @ViewChild(InputBoxComponent) inputBox: InputBoxComponent;

  @HostBinding('class.field-cell-inputable')
  protected override readonly hostClass = true;

  @HostBinding('class.field-cell-inputable--inputting')
  protected isInputting: boolean;

  input(e?: CellTouchEvent) {
    this.isInputting = true;
    this.cdRef.detectChanges();

    if (e instanceof KeyboardEvent) {
      e.preventDefault(); // Prevent double key
      this.inputBox.keypress(e);
    }

    setTimeout(() => {
      if (!this.inputBox.isFocusing) {
        this.inputBox.focus();
      }
    }, 17);

    this.onInput(e);
  }

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.input(e);
  }

  protected override onDataChange() {
    this.markAsEditEnded();
    this.isInputting = false;
  }

  protected onInput(e: CellTouchEvent) {}

  protected onInputBoxEdited(content: InputBoxContent) {
    this.save(content as T);
  }

  protected onInputBoxChange(content: string) {}

  protected onInputBoxInput(e: Event) {}

  protected onInputBoxFocus(e: FocusEvent) {
    this.markAsEditStarted();

    const el: HTMLElement = this.elementRef.nativeElement;

    el.scrollLeft = el.scrollWidth;
    el.scrollTop = el.scrollHeight;
  }

  protected onInputBoxBlur(e: FocusEvent) {}
}
