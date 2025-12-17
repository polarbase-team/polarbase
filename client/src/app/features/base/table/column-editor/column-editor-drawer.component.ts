import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, Observable } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { AutoFocusModule } from 'primeng/autofocus';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';

import { DataType } from '../../../../shared/spreadsheet/field/interfaces/field.interface';
import { Field } from '../../../../shared/spreadsheet/field/objects/field.object';
import { TextFieldEditorComponent } from '../field-editors/text/editor.component';
import { LongTextFieldEditorComponent } from '../field-editors/long-text/editor.component';
import { IntegerFieldEditorComponent } from '../field-editors/integer/editor.component';
import { NumberFieldEditorComponent } from '../field-editors/number/editor.component';
import { SelectFieldEditorComponent } from '../field-editors/select/editor.component';
import { CheckboxFieldEditorComponent } from '../field-editors/checkbox/editor.component';
import { DateFieldEditorComponent } from '../field-editors/date/editor.component';
import { JSONFieldEditorComponent } from '../field-editors/json/editor.component';
import { ColumnFormData, ColumnDefinition, TableDefinition, TableService } from '../table.service';

@Component({
  selector: 'column-editor-drawer',
  templateUrl: './column-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    MessageModule,
    AutoFocusModule,
    DividerModule,
    SelectModule,
    InputNumberModule,
    SelectButtonModule,
    DatePickerModule,
    FluidModule,
    TextFieldEditorComponent,
    LongTextFieldEditorComponent,
    IntegerFieldEditorComponent,
    NumberFieldEditorComponent,
    SelectFieldEditorComponent,
    CheckboxFieldEditorComponent,
    DateFieldEditorComponent,
    JSONFieldEditorComponent,
  ],
})
export class ColumnEditorDrawerComponent {
  visible = model(false);
  table = input<TableDefinition>();
  column = input<ColumnDefinition>();
  field = input<Field>();
  mode = input<'add' | 'edit'>('add');

  onSave = output<ColumnFormData>();

  protected readonly DataType = DataType;
  protected columnForm = viewChild<NgForm>('columnForm');
  protected columnFormData: ColumnFormData;
  protected isSaving = signal(false);
  protected dataTypes = Object.keys(DataType).map((t) => ({ name: t, value: DataType[t] }));
  protected selectedDataType = signal<DataType>(null);
  protected options = signal<string[]>([]);
  protected selectionState: string | undefined = 'Single';
  protected readonly selectionStateOptions = ['Single', 'Multiple'];
  protected internalField: Field;

  constructor(
    private destroyRef: DestroyRef,
    private tblService: TableService,
  ) {
    effect(() => {
      const column = { ...this.column() };
      this.columnFormData = column;
      this.selectedDataType.set(column.dataType);
    });

    effect(() => {
      this.internalField = this.field();
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.visible.set(false);
  }

  protected async onSubmit() {
    if (!this.columnForm().valid) return;

    this.isSaving.set(true);

    let fn: Observable<any>;

    if (this.mode() === 'edit') {
      fn = this.tblService.updateColumn(
        this.table().tableName,
        this.column().name,
        this.columnFormData,
      );
    } else {
      fn = this.tblService.createColumn(this.table().tableName, this.columnFormData);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.visible.set(false);
      this.onSave.emit(this.columnFormData);
    });
  }

  protected onSelectDataType(dataType: DataType) {
    this.columnFormData.dataType = dataType;
    this.columnFormData.minLength =
      this.columnFormData.maxLength =
      this.columnFormData.minValue =
      this.columnFormData.maxValue =
      this.columnFormData.defaultValue =
        null;
    this.internalField = this.tblService.buildField(this.columnFormData);
  }

  protected addOption() {
    this.options.update((arr) => [...arr, '']);
  }

  protected editOption(idx: number, option: string) {
    this.options.update((arr) => arr.map((o, i) => (i === idx ? option : o)));
  }

  protected removeOption(idx: number) {
    this.options.update((arr) => arr.filter((o, i) => i !== idx));
  }
}
