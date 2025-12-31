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
import { CommonModule } from '@angular/common';
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
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { DataType, FIELD_ICON_MAP } from '@app/shared/spreadsheet/field/interfaces/field.interface';
import { Field } from '@app/shared/spreadsheet/field/objects/field.object';
import { SelectField } from '@app/shared/spreadsheet/field/objects/select-field.object';
import { MultiSelectField } from '@app/shared/spreadsheet/field/objects/multi-select-field.object';
import { TextFieldEditorComponent } from '../field-editors/text/editor.component';
import { LongTextFieldEditorComponent } from '../field-editors/long-text/editor.component';
import { IntegerFieldEditorComponent } from '../field-editors/integer/editor.component';
import { NumberFieldEditorComponent } from '../field-editors/number/editor.component';
import { SelectFieldEditorComponent } from '../field-editors/select/editor.component';
import { MultiSelectFieldEditorComponent } from '../field-editors/multi-select/editor.component';
import { CheckboxFieldEditorComponent } from '../field-editors/checkbox/editor.component';
import { DateFieldEditorComponent } from '../field-editors/date/editor.component';
import { EmailFieldEditorComponent } from '../field-editors/email/editor.component';
import { JSONFieldEditorComponent } from '../field-editors/json/editor.component';
import { SchemaService } from '../../services/schema.service';
import {
  ColumnFormData,
  ColumnDefinition,
  TableDefinition,
  TableService,
} from '../../services/table.service';

const DEFAULT_VALUE = {
  nullable: true,
  validation: {},
} as ColumnFormData;

@Component({
  selector: 'column-editor-drawer',
  templateUrl: './column-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
    DatePickerModule,
    FluidModule,
    MenuModule,
    TextFieldEditorComponent,
    LongTextFieldEditorComponent,
    IntegerFieldEditorComponent,
    NumberFieldEditorComponent,
    SelectFieldEditorComponent,
    MultiSelectFieldEditorComponent,
    CheckboxFieldEditorComponent,
    DateFieldEditorComponent,
    EmailFieldEditorComponent,
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
  protected dataTypes = Object.keys(DataType).map((t) => ({
    name: t,
    value: DataType[t],
    icon: FIELD_ICON_MAP[DataType[t]],
  }));
  protected selectedDataType = signal<DataType>(null);
  protected options = signal<string[]>([]);
  protected enumTypeMenuItems: MenuItem[] | undefined;
  protected internalField: Field;

  constructor(
    private destroyRef: DestroyRef,
    private schemaService: SchemaService,
    private tblService: TableService,
  ) {
    effect(() => {
      const column = { ...DEFAULT_VALUE, ...this.column() };
      column.validation ??= {};
      this.columnFormData = column;
      this.selectedDataType.set(column.dataType);
      this.options.set(column.options || []);
    });

    effect(() => {
      this.internalField = this.field();
    });

    effect(() => {
      const options = this.options() || [];
      this.columnFormData.options = [...options];

      switch (this.internalField?.dataType) {
        case DataType.Select:
          (this.internalField as SelectField).options = [...options];
          break;
        case DataType.MultiSelect:
          (this.internalField as MultiSelectField).options = [...options];
      }
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.visible.set(false);
  }

  protected reset() {
    this.columnForm().reset();
    this.columnFormData = { ...DEFAULT_VALUE };
    this.isSaving.set(false);
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
    ).subscribe(({ data: column }) => {
      this.visible.set(false);
      this.onSave.emit(column);
      this.reset();
    });
  }

  protected onSelectDataType(dataType: DataType) {
    this.columnFormData.dataType = dataType;
    this.columnFormData.defaultValue = null;
    this.columnFormData.validation = {};
    this.internalField = this.tblService.buildField(this.columnFormData as ColumnDefinition);
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

  protected onEnumTypesMenuOpen() {
    if (this.enumTypeMenuItems?.length) return;

    this.schemaService
      .getEnumTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enumTypes) => {
        console.log(enumTypes);
        this.enumTypeMenuItems = [];
        for (const enumType of enumTypes) {
          this.enumTypeMenuItems.push({
            label: enumType.enumName,
            options: enumType.enumValues.join(', '),
            command: () => {
              this.options.set(enumType.enumValues);
            },
          });
        }
      });
  }
}
