import {
  afterNextRender,
  ChangeDetectorRef,
  ComponentRef,
  DestroyRef,
  Directive,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import _ from 'lodash';

import { EDataType } from '../../../field/interfaces';
import { Field } from '../../../field/objects';
import { Cell, Column, Row } from '../../spreadsheet.component';
import { FieldCell, IFieldCell } from './field-cell';
import { FieldCellEditable } from './field-cell-editable';
import { CheckboxFieldCellComponent } from './checkbox/cell.component';
import { DateFieldCellComponent } from './date/cell.component';
import { NumberFieldCellComponent } from './number/cell.component';
import { TextFieldCellComponent } from './text/cell.component';
import { DropdownFieldCellComponent } from './dropdown/cell.component';
import { FieldCellSelectingState, FieldCellService } from './field-cell.service';

const FIELD_CELL_CMP_MAP = new Map<EDataType, Type<FieldCell>>([
  [EDataType.Checkbox, CheckboxFieldCellComponent],
  [EDataType.Date, DateFieldCellComponent],
  [EDataType.Number, NumberFieldCellComponent],
  [EDataType.Text, TextFieldCellComponent],
  [EDataType.Dropdown, DropdownFieldCellComponent],
]) as ReadonlyMap<EDataType, Type<FieldCell>>;

@Directive({
  selector: '[fieldCellFactory]',
  exportAs: 'fieldCellFactory',
})
export class FieldCellFactoryDirective implements IFieldCell, OnChanges, OnDestroy {
  @Input() row: Row;
  @Input() column: Column;
  @Input() field: Field;
  @Input() data: any;
  @Input() readonly: boolean;
  @Input() selecting: boolean;

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _cdRef = inject(ChangeDetectorRef);
  private readonly _vcRef = inject(ViewContainerRef);
  private readonly _fieldCellService = inject(FieldCellService);
  private _cmpRef: ComponentRef<FieldCell>;
  private _isCreated: boolean;
  private _revert$$: Subscription;

  constructor() {
    this._cdRef.detach();

    afterNextRender(() => {
      this._createCmp();

      this._cdRef.reattach();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this._isCreated) return;

    if (
      'field' in changes &&
      !changes['field'].firstChange &&
      changes['field'].previousValue?.dataType !== changes['field'].currentValue?.dataType
    ) {
      this._createCmp(true);
      return;
    }

    if ('field' in changes) {
      this._forwardCmpInput('field');
    }

    if ('data' in changes) {
      this._forwardCmpInput('data');
    }

    if ('readonly' in changes) {
      this._forwardCmpInput('readonly');
    }

    if ('selecting' in changes) {
      this._forwardCmpInput('selecting');

      if (this.selecting) {
        this._keepSelectingState();
      } else {
        this._resetSelectingState();
      }
    }
  }

  ngOnDestroy() {
    this._revert$$?.unsubscribe();
    this._clean();
  }

  /**
   * Cleans up the container.
   */
  private _clean() {
    this._storeCmp();
    this._vcRef.detach();
    this._cmpRef = null;
  }

  /**
   * Creates a field component.
   * @param isRecreate Re-creates the component when the field type is changed.
   */
  private _createCmp(isRecreate = false) {
    if (isRecreate) {
      this._clean();
    }

    this._insertCmp();
    this._isCreated = true;
  }

  /**
   * Inserts the created component or create new.
   * @param cmp A reference of created component or a component type.
   * @returns The ComponentRef<FieldCell> of the created component.
   */
  private _insertCmp() {
    if (!this._cmpRef) {
      const dataType = this.field.dataType;
      if (!dataType || !FIELD_CELL_CMP_MAP.has(dataType)) {
        throw new Error(`FieldCellFactoryDirective: Unsupported field data type: ${dataType}`);
      }

      let cmp = this._fieldCellService.get(dataType);
      if (cmp) {
        this._vcRef.insert(cmp.hostView);
      } else {
        cmp = this._vcRef.createComponent(FIELD_CELL_CMP_MAP.get(dataType));
      }
      this._cmpRef = cmp;

      this._forwardCmpInput('field');
      this._forwardCmpInput('data');
      this._forwardCmpInput('readonly');
      this._forwardCmpInput('selecting');
      cmp.changeDetectorRef.detectChanges();
    }

    return this._cmpRef;
  }

  /**
   * Stores the lite component reference in the cache,
   * if it is valid and not destroyed.
   */
  private _storeCmp() {
    if (!this._cmpRef || this._cmpRef.hostView.destroyed) {
      return;
    }
    this._fieldCellService.set(this.field.dataType, this._cmpRef);
  }

  /**
   * Forwards input data to a specified input property of a created component.
   * @param cmpRef A reference to the created component.
   * @param inputName The name of the input property on the component.
   * @param inputData The data to forward to the input property.
   * Defaults to the value of the input property from the current context.
   */
  private _forwardCmpInput(inputName: string, inputData = this[inputName]) {
    const cmpRef = this._cmpRef;
    if (!cmpRef || cmpRef.hostView.destroyed || !(cmpRef as any)._tNode.inputs[inputName]) {
      return;
    }
    cmpRef.setInput(inputName, inputData);
  }

  /**
   * Preserves the selecting state of the full component reference if it exists.
   * - Ensures the instance is of `FieldCellEditable` before proceeding.
   * - Retrieves the current selecting state from `_fieldCellService`.
   * - If the retrieved state matches the current row and column context,
   *   it restores the `data` from the state instance.
   * - Registers the instance with `_fieldCellService` to maintain the selecting state.
   * - Adds a cleanup function on component destruction:
   *   - If the instance is invalid, it skips further actions.
   *   - Otherwise, it clones the instance’s data and triggers necessary updates.
   *   - Calls `_onDataChanges()` to propagate changes.
   *   - Forwards the updated data to the lightweight component reference (`_liteCmpRef`).
   */
  private _keepSelectingState() {
    if (!this._cmpRef) return;
    const { instance } = this._cmpRef;
    if (!(instance instanceof FieldCellEditable)) return;

    const cell: Cell = { row: this.row, column: this.column };
    let state = this._fieldCellService.getSelectingState();
    let data = this.data;

    if (state?.matchCell(cell)) {
      data = state.savedData === undefined ? state.data : state.savedData;
    } else {
      state = {
        cell,
        data: _.cloneDeep(this.data),
        savedData: undefined,
      } as FieldCellSelectingState;
      this._fieldCellService.setSelectingState(state);
    }

    instance.setData(_.cloneDeep(data));
    instance.onSaveCallback = (savedData) => {
      state.savedData = _.cloneDeep(savedData);
    };
    instance.onEditCallback = (isEditing) => {
      state.isEditing = isEditing;
      if (isEditing) state.validate$.next(null);
    };

    this._revert$$?.unsubscribe();
    this._revert$$ = state.revert$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
      if (!state.matchCell(cell)) return;
      instance.setData(_.cloneDeep(state.data));
    });
  }

  private _resetSelectingState() {
    if (!this._cmpRef) return;
    const { instance } = this._cmpRef;
    if (!(instance instanceof FieldCellEditable)) return;
    instance.setData(_.cloneDeep(this.data));
    this._revert$$?.unsubscribe();
  }
}
