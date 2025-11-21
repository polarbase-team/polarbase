import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  NgZone,
  SimpleChanges,
} from '@angular/core';

import { Field } from '../../../field/objects';
import { Row } from '../../services/table-row.service';

export interface IFieldCell<T = any> {
  field: Field;
  data: T;
}

export type InputContext = {
  row: Row;
  other: any;
};

@Directive()
export class FieldCell<T = any> implements IFieldCell<T> {
  @Input() field: Field;
  @Input() data: T;

  @HostBinding('class.field-cell')
  protected readonly hostClass: boolean = true;
  protected readonly ngZone = inject(NgZone);
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
