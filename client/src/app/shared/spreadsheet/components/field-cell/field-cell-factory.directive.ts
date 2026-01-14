import _ from 'lodash';
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
  output,
  SimpleChanges,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { FieldCell } from './field-cell';
import { FieldCellEditable } from './field-cell-editable';
import type { ReferenceViewDetailEvent } from './reference/cell.component';
import { FieldCellSelectingState, FieldCellService } from './field-cell.service';
import { TableRow } from '../../models/table-row';
import { TableColumn } from '../../models/table-column';
import { TableCell } from '../../models/table-cell';

const FIELD_CELL_CMP_MAP = new Map<DataType, () => Promise<Type<FieldCell>>>([
  [DataType.Text, () => import('./text/cell.component').then((m) => m.TextFieldCellComponent)],
  [
    DataType.LongText,
    () => import('./long-text/cell.component').then((m) => m.LongTextFieldCellComponent),
  ],
  [
    DataType.Integer,
    () => import('./integer/cell.component').then((m) => m.IntegerFieldCellComponent),
  ],
  [
    DataType.Number,
    () => import('./number/cell.component').then((m) => m.NumberFieldCellComponent),
  ],
  [DataType.Date, () => import('./date/cell.component').then((m) => m.DateFieldCellComponent)],
  [
    DataType.Checkbox,
    () => import('./checkbox/cell.component').then((m) => m.CheckboxFieldCellComponent),
  ],
  [
    DataType.Select,
    () => import('./select/cell.component').then((m) => m.SelectFieldCellComponent),
  ],
  [
    DataType.MultiSelect,
    () => import('./multi-select/cell.component').then((m) => m.MultiSelectFieldCellComponent),
  ],
  [DataType.Email, () => import('./email/cell.component').then((m) => m.EmailFieldCellComponent)],
  [DataType.Url, () => import('./url/cell.component').then((m) => m.UrlFieldCellComponent)],
  [DataType.JSON, () => import('./json/cell.component').then((m) => m.JSONFieldCellComponent)],
  [
    DataType.GeoPoint,
    () => import('./geo-point/cell.component').then((m) => m.GeoPointFieldCellComponent),
  ],
  [
    DataType.Reference,
    () => import('./reference/cell.component').then((m) => m.ReferenceFieldCellComponent),
  ],
  [
    DataType.Attachment,
    () => import('./attachment/cell.component').then((m) => m.AttachmentFieldCellComponent),
  ],
  [
    DataType.AutoNumber,
    () => import('./auto-number/cell.component').then((m) => m.AutoNumberFieldCellComponent),
  ],
]);

@Directive({
  selector: '[fieldCellFactory]',
  exportAs: 'fieldCellFactory',
})
export class FieldCellFactoryDirective implements OnChanges, OnDestroy {
  @Input() row: TableRow;
  @Input() column: TableColumn;
  @Input() field: Field;
  @Input() data: any;
  @Input() readonly: boolean;
  @Input() selecting: boolean;

  viewDetail = output<ReferenceViewDetailEvent>();

  private cdRef = inject(ChangeDetectorRef);
  private vcRef = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);
  private fieldCellService = inject(FieldCellService);
  private cmpRef: ComponentRef<FieldCell>;
  private dataType: DataType;
  private isCreated: boolean;
  private revert$$: Subscription;

  constructor() {
    this.cdRef.detach();

    afterNextRender(() => {
      this.createCmp();
      this.cdRef.reattach();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.isCreated) return;

    if (
      'field' in changes &&
      !changes['field'].firstChange &&
      changes['field'].previousValue?.dataType !== changes['field'].currentValue?.dataType
    ) {
      this.createCmp(true);
      return;
    }

    if ('field' in changes) {
      this.forwardCmpInput('field');
    }

    if ('data' in changes) {
      this.forwardCmpInput('data');
    }

    if ('readonly' in changes) {
      this.forwardCmpInput('readonly');
    }

    if ('selecting' in changes) {
      this.forwardCmpInput('selecting');

      if (this.selecting) {
        this.keepSelectingState();
      } else {
        this.resetSelectingState();
      }
    }
  }

  ngOnDestroy() {
    this.revert$$?.unsubscribe();
    this.clean();
  }

  /**
   * Cleans up the container.
   */
  private clean() {
    this.storeCmp();
    this.vcRef.detach();
    this.cmpRef = null;
  }

  /**
   * Creates a field component.
   * @param isRecreate Re-creates the component when the field type is changed.
   */
  private async createCmp(isRecreate = false) {
    if (isRecreate) this.clean();
    // Store dataType to ensure the correct cmpRef is saved and retrieved
    this.dataType = this.field.dataType;

    // Wait for the component to be loaded and inserted
    await this.insertCmp();

    this.isCreated = true;

    const { instance } = this.cmpRef;
    // Use a string check or dynamic check to avoid direct class reference if possible
    if (this.dataType === DataType.Reference) {
      (instance as any).viewDetail = this.viewDetail;
    }

    if (this.selecting) {
      this.keepSelectingState();
    } else {
      this.resetSelectingState();
    }
  }

  /**
   * Inserts the created component or create new.
   * @param cmp A reference of created component or a component type.
   * @returns The ComponentRef<FieldCell> of the created component.
   */
  private async insertCmp() {
    if (!this.cmpRef) {
      const dataType = this.dataType;
      const loader = FIELD_CELL_CMP_MAP.get(dataType);

      if (!dataType || !loader) {
        throw new Error(`FieldCellFactoryDirective: Unsupported field data type: ${dataType}`);
      }

      let cmp = this.fieldCellService.get(dataType);
      if (cmp) {
        this.vcRef.insert(cmp.hostView);
      } else {
        // Dynamically load the component class
        const componentClass = await loader();
        cmp = this.vcRef.createComponent(componentClass);
      }
      this.cmpRef = cmp;

      this.forwardCmpInput('field');
      this.forwardCmpInput('data');
      this.forwardCmpInput('readonly');
      this.forwardCmpInput('selecting');
      cmp.changeDetectorRef.detectChanges();
    }

    return this.cmpRef;
  }

  /**
   * Stores the lite component reference in the cache,
   * if it is valid and not destroyed.
   */
  private storeCmp() {
    if (!this.cmpRef || this.cmpRef.hostView.destroyed) return;
    this.fieldCellService.set(this.dataType, this.cmpRef);
  }

  /**
   * Forwards input data to a specified input property of a created component.
   * @param cmpRef A reference to the created component.
   * @param inputName The name of the input property on the component.
   * @param inputData The data to forward to the input property.
   * Defaults to the value of the input property from the current context.
   */
  private forwardCmpInput(inputName: string, inputData = this[inputName]) {
    const cmpRef = this.cmpRef;
    if (!cmpRef || cmpRef.hostView.destroyed || !(cmpRef as any)._tNode.inputs[inputName]) {
      return;
    }
    cmpRef.setInput(inputName, inputData);
  }

  /**
   * Preserves the selecting state of the full component reference if it exists.
   * - Ensures the instance is of `FieldCellEditable` before proceeding.
   * - Retrieves the current selecting state from `fieldCellService`.
   * - If the retrieved state matches the current row and column context,
   *   it restores the `data` from the state instance.
   * - Registers the instance with `fieldCellService` to maintain the selecting state.
   * - Adds a cleanup function on component destruction:
   *   - If the instance is invalid, it skips further actions.
   *   - Otherwise, it clones the instance’s data and triggers necessary updates.
   *   - Calls `_onDataChanges()` to propagate changes.
   *   - Forwards the updated data to the lightweight component reference (`_liteCmpRef`).
   */
  private keepSelectingState() {
    if (!this.cmpRef) return;

    const { instance } = this.cmpRef;
    if (!(instance instanceof FieldCellEditable)) return;

    const cell: TableCell = { row: this.row, column: this.column };
    let state = this.fieldCellService.getSelectingState();
    let data = this.data;

    if (state?.matchCell(cell)) {
      data = state.savedData === undefined ? state.data : state.savedData;
    } else {
      state = {
        cell,
        data: _.cloneDeep(this.data),
        savedData: undefined,
      } as FieldCellSelectingState;
      this.fieldCellService.setSelectingState(state);
    }

    instance.setData(_.cloneDeep(data));
    instance.onSaveCallback = (savedData) => {
      state.savedData = _.cloneDeep(savedData);
    };
    instance.onEditCallback = (isEditing) => {
      state.isEditing = isEditing;
      if (isEditing) state.validate$.next(null);
    };

    this.revert$$?.unsubscribe();
    this.revert$$ = state.revert$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!state.matchCell(cell)) return;
      instance.setData(_.cloneDeep(state.data));
    });
  }

  private resetSelectingState() {
    if (!this.cmpRef) return;

    const { instance } = this.cmpRef;
    if (!(instance instanceof FieldCellEditable)) return;

    instance.setData(_.cloneDeep(this.data));
    this.revert$$?.unsubscribe();
  }
}
