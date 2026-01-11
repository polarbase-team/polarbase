import _ from 'lodash';
import { Directive, HostBinding, booleanAttribute, Input } from '@angular/core';

import { FieldCellTouchable } from './field-cell-touchable';

@Directive()
export class FieldCellEditable<T = any> extends FieldCellTouchable<T> {
  @Input({ transform: booleanAttribute }) readonly: boolean;

  onSaveCallback: (data: T) => void;
  onEditCallback: (isEditing: boolean) => void;

  @HostBinding('class.field-cell-editable')
  protected override readonly hostClass = true;

  private _isEditing: boolean;
  private _isInvalid: boolean;

  @HostBinding('class.field-cell-editable--editing')
  get isEditing() {
    return this._isEditing;
  }

  get isInvalid() {
    return this._isInvalid;
  }

  setData(data: T) {
    this.data = data;
    this.cdRef.markForCheck();
    this.onDataChange();
  }

  save(data?: T) {
    if (data !== undefined) {
      this.data = data;
      this.cdRef.markForCheck();
    } else {
      data = this.data;
    }
    this.onSave();
    this.onSaveCallback?.(data ?? null);
  }

  protected override onDeselect() {
    super.onDeselect();
    this.markAsEditEnded();
  }

  protected onSave() {}

  protected onEditStarted() {}

  protected onEditEnded() {}

  protected markAsEditStarted() {
    this._isEditing = true;
    this.onEditStarted();
    this.onEditCallback?.(true);
  }

  protected markAsEditEnded() {
    this._isEditing = false;
    this.onEditEnded();
    this.onEditCallback?.(false);
  }
}
