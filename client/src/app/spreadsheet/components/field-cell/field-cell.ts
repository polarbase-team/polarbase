import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  SimpleChanges,
} from '@angular/core';

import { Field } from '../../field/objects/field.object';
import { TableRow } from '../../models/table-row';

export interface InputContext {
  row: TableRow;
  other: any;
}

@Directive()
export class FieldCell<T = any> {
  @Input() field: Field;
  @Input() data: T;

  @HostBinding('class.field-cell')
  protected readonly hostClass: boolean = true;
  protected readonly cdRef = inject(ChangeDetectorRef);
  protected readonly elementRef = inject(ElementRef);
  protected isDetached: boolean;
  @HostBinding('class.field-cell--selecting')
  @Input()
  protected selecting: boolean;

  ngOnChanges(changes: SimpleChanges) {
    if ('data' in changes) {
      this.onDataChange();
    }

    if ('selecting' in changes) {
      this.selecting ? this.onSelect() : this.onDeselect();
    }
  }

  @HostListener('wheel', ['$event'])
  protected onWheel(e: WheelEvent) {
    const { clientWidth, clientHeight, scrollWidth, scrollHeight }: HTMLElement =
      this.elementRef.nativeElement;

    if (clientWidth === scrollWidth && clientHeight === scrollHeight) {
      return;
    }

    e.stopPropagation();
  }

  protected onDataChange() {}

  protected onSelect() {}

  protected onDeselect() {}
}
