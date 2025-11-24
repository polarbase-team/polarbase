import { Directive, HostBinding, booleanAttribute, Input } from '@angular/core';
import _ from 'lodash';

import { DataType } from '../../field/interfaces';

import { FieldCellTouchable } from './field-cell-touchable';

@Directive()
export class FieldCellEditable<T = any> extends FieldCellTouchable<T> {
  @Input({ transform: booleanAttribute }) readonly: boolean;

  onSaveCallback: (data: T) => void;
  onEditCallback: (isEditing: boolean) => void;

  @HostBinding('class.field-cell-editable')
  protected override readonly hostClass: boolean = true;
  protected readonly DATA_TYPE: typeof DataType = DataType;

  private _isEditing: boolean;
  private _isInvalid: boolean;

  get isEditing(): boolean {
    return this._isEditing;
  }

  get isInvalid(): boolean {
    return this._isInvalid;
  }

  setData(data: T) {
    this.data = data;
    this.cdRef.markForCheck();
    this.onDataChange();
  }

  save(data: T = this.data) {
    this.data = data ?? null;
    this.cdRef.markForCheck();
    this.onSave();
    this.onSaveCallback?.(this.data);
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
