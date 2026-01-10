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
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';

import { DrawerComponent } from '@app/core/components/drawer.component';
import { sanitizeEmptyStrings } from '@app/core/utils';
import { DataType, FIELD_ICON_MAP } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { SelectField } from '@app/shared/field-system/models/select/field.object';
import { MultiSelectField } from '@app/shared/field-system/models/multi-select/field.object';
import { TextFieldEditorComponent } from '@app/shared/field-system/editors/text/editor.component';
import { LongTextFieldEditorComponent } from '@app/shared/field-system/editors/long-text/editor.component';
import { IntegerFieldEditorComponent } from '@app/shared/field-system/editors/integer/editor.component';
import { NumberFieldEditorComponent } from '@app/shared/field-system/editors/number/editor.component';
import { SelectFieldEditorComponent } from '@app/shared/field-system/editors/select/editor.component';
import { MultiSelectFieldEditorComponent } from '@app/shared/field-system/editors/multi-select/editor.component';
import { CheckboxFieldEditorComponent } from '@app/shared/field-system/editors/checkbox/editor.component';
import { DateFieldEditorComponent } from '@app/shared/field-system/editors/date/editor.component';
import { EmailFieldEditorComponent } from '@app/shared/field-system/editors/email/editor.component';
import { UrlFieldEditorComponent } from '@app/shared/field-system/editors/url/editor.component';
import { JSONFieldEditorComponent } from '@app/shared/field-system/editors/json/editor.component';
import { GeoPointFieldEditorComponent } from '@app/shared/field-system/editors/geo-point/editor.component';
import { SchemaService } from '../../services/schema.service';
import {
  ColumnFormData,
  ColumnDefinition,
  TableDefinition,
  TableService,
} from '../../services/table.service';

const DEFAULT_VALUE = {
  nullable: true,
  foreignKey: {
    table: null,
    column: null,
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  },
  options: [],
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
    SelectButtonModule,
    TooltipModule,
    TextFieldEditorComponent,
    LongTextFieldEditorComponent,
    IntegerFieldEditorComponent,
    NumberFieldEditorComponent,
    SelectFieldEditorComponent,
    MultiSelectFieldEditorComponent,
    CheckboxFieldEditorComponent,
    DateFieldEditorComponent,
    EmailFieldEditorComponent,
    UrlFieldEditorComponent,
    JSONFieldEditorComponent,
    GeoPointFieldEditorComponent,
  ],
})
export class ColumnEditorDrawerComponent extends DrawerComponent {
  table = input<TableDefinition>();
  column = input<ColumnDefinition>();
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
  protected internalField: Field;

  // Select & MultiSelect types
  protected enumTypeMenuItems: MenuItem[] | undefined;

  // Reference type
  protected tableOptions: { name: string; value: string }[] | undefined;
  protected referentialActions: { name: string; value: string; help: string }[] = [
    {
      name: 'No Action',
      value: 'NO ACTION',
      help: 'Prevents changes if related data exists.',
    },
    {
      name: 'Set Null',
      value: 'SET NULL',
      help: 'Keeps record but clears the connection.',
    },
    {
      name: 'Cascade',
      value: 'CASCADE',
      help: 'Automatically syncs updates and deletions.',
    },
  ];

  constructor(
    private destroyRef: DestroyRef,
    private schemaService: SchemaService,
    private tblService: TableService,
  ) {
    super();

    effect(() => {
      const column = { ...DEFAULT_VALUE, ...this.column() };
      column.validation ??= {};
      this.selectedDataType.set(column.dataType);
      this.columnFormData = column;
    });

    effect(() => {
      this.selectedDataType();
      this.internalField = this.tblService.buildField(this.columnFormData as ColumnDefinition);
    });

    effect(() => {
      this.tableOptions = [];
      for (const table of this.tblService.tables()) {
        this.tableOptions.push({ name: table.tableName, value: table.tableName });
      }
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.close();
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

    // Sanitize the column form data by removing empty strings
    const formData = sanitizeEmptyStrings(this.columnFormData);

    // Handle option and foreign key field removal depending on selected data type
    switch (this.selectedDataType()) {
      case DataType.Select:
      case DataType.MultiSelect:
        // For Select and MultiSelect, retain 'options' property as needed
        delete formData.foreignKey;
        break;
      case DataType.Reference:
        // For Reference type, retain 'foreignKey' property as needed
        delete formData.options;
        break;
      default:
        // For all other types, remove 'options' and 'foreignKey' to avoid sending unnecessary data
        delete formData.options;
        delete formData.foreignKey;
    }

    // Remove empty 'validation' object if no validation rules are present
    if (!Object.keys(formData.validation).length) {
      delete formData.validation;
    }

    if (this.mode() === 'edit') {
      fn = this.tblService.updateColumn(this.table().tableName, this.column().name, formData);
    } else {
      fn = this.tblService.createColumn(this.table().tableName, formData);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ data: column }) => {
      this.onSave.emit(column);
      this.reset();
      this.close();
    });
  }

  protected onDataTypeSelect(dataType: DataType) {
    this.columnFormData.dataType = dataType;
    this.columnFormData.defaultValue = null;
    this.columnFormData.validation = { ...DEFAULT_VALUE.validation };
    this.columnFormData.foreignKey = { ...DEFAULT_VALUE.foreignKey };
  }

  protected addOption() {
    this.columnFormData.options.push('');
    this.onOptionsUpdate();
  }

  protected editOption(idx: number, option: string) {
    this.columnFormData.options[idx] = option;
    this.onOptionsUpdate();
  }

  protected removeOption(idx: number) {
    this.columnFormData.options.splice(idx, 1);
    this.onOptionsUpdate();
  }

  protected onEnumTypesMenuOpen() {
    if (this.enumTypeMenuItems?.length) return;

    this.schemaService
      .getEnumTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enumTypes) => {
        this.enumTypeMenuItems = [];
        for (const enumType of enumTypes) {
          this.enumTypeMenuItems.push({
            label: enumType.enumName,
            options: enumType.enumValues.join(', '),
            command: () => {
              this.columnFormData.options = [...enumType.enumValues];
            },
          });
        }
      });
  }

  protected onTableSelect(tableName: string) {
    const table = this.tblService.tables().find((t) => t.tableName === tableName);
    if (!table) return;

    this.columnFormData.foreignKey.table = table.tableName;
    this.columnFormData.foreignKey.column = table.tablePrimaryKey;
  }

  private onOptionsUpdate() {
    const options = this.columnFormData.options;
    switch (this.internalField?.dataType) {
      case DataType.Select:
        (this.internalField as SelectField).options = [...options];
        break;
      case DataType.MultiSelect:
        (this.internalField as MultiSelectField).options = [...options];
    }
  }
}
