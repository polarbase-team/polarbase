import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  input,
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
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { environment } from '@environments/environment';

import { DrawerComponent } from '@app/core/components/drawer/drawer.component';
import { sanitizeEmptyValues } from '@app/core/utils';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { NumberFormat } from '@app/shared/field-system/models/number/field.interface';
import { SelectField } from '@app/shared/field-system/models/select/field.object';
import { MultiSelectField } from '@app/shared/field-system/models/multi-select/field.object';
import { FieldIconPipe } from '@app/shared/field-system/pipes/field-icon.pipe';
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
import {
  ColumnFormData,
  ColumnDefinition,
  TableDefinition,
  TableService,
} from '../../services/table.service';

const DEFAULT_VALUE = {
  nullable: true,
  unique: false,
  defaultValue: null,
  comment: null,
  presentation: {},
  validation: {},
  options: [],
  foreignKey: {
    table: null,
    column: null,
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  },
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
    SelectButtonModule,
    TooltipModule,
    ConfirmDialogModule,
    ToggleSwitchModule,
    FieldIconPipe,
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
  providers: [ConfirmationService],
})
export class ColumnEditorDrawerComponent extends DrawerComponent {
  table = input<TableDefinition>();
  column = input<ColumnDefinition>();
  mode = input<'add' | 'edit'>('add');

  onSave = output<ColumnFormData>();

  protected columnForm = viewChild<NgForm>('columnForm');
  protected columnFormData: ColumnFormData = { ...DEFAULT_VALUE };
  protected isSaving = signal(false);
  protected readonly DataType = DataType;
  protected dataTypes = Object.keys(DataType).map((t) => ({
    name: t,
    value: DataType[t],
  }));
  protected selectedDataType = signal<DataType>(null);
  protected internalField: Field;

  // Number type
  protected readonly NumberFormat = NumberFormat;
  protected numberFormats = [
    { value: NumberFormat.Comma, label: 'Comma separated', example: '1,000' },
    { value: NumberFormat.Percentage, label: 'Percentage', example: '100%' },
    { value: NumberFormat.Currency, label: 'Currency', example: '$1,000' },
  ];
  protected currencies = [
    { value: 'USD', label: 'USD', example: '$1,000' },
    { value: 'EUR', label: 'EUR', example: '€1,000' },
    { value: 'VND', label: 'VND', example: '₫1,000' },
  ];

  // Date & AutoDate types
  protected dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
    { value: 'YYYY/DD/MM', label: 'YYYY/DD/MM' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
    { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'YYYY-DD-MM', label: 'YYYY-DD-MM' },
  ];

  // Reference type
  protected tableOptions = computed(() => this.tblService.tables());
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
  protected referenceDisplayColumnOptions: ColumnDefinition[];

  constructor(
    private destroyRef: DestroyRef,
    private confirmationService: ConfirmationService,
    private tblService: TableService,
  ) {
    super();

    effect(() => {
      const selectedDataType = this.selectedDataType();
      if (!selectedDataType) return;

      this.initPresentation(selectedDataType);
      this.initValidation(selectedDataType);
      this.internalField = this.tblService.buildField(this.columnFormData as ColumnDefinition);
    });
  }

  protected override onShow() {
    super.onShow();

    this.isSaving.set(false);

    const column = { ...DEFAULT_VALUE, ...this.column() };
    const { primary, metadata, ...rest } = column;
    this.columnFormData = {
      ...rest,
      presentation: { ...DEFAULT_VALUE.presentation, ...rest.presentation },
      validation: { ...DEFAULT_VALUE.validation, ...rest.validation },
      foreignKey: { ...DEFAULT_VALUE.foreignKey, ...rest.foreignKey },
    };

    this.selectedDataType.set(column.dataType);
  }

  protected override onHide() {
    super.onHide();

    if (this.columnForm().dirty) {
      this.confirmationService.confirm({
        target: null,
        header: 'Discard changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        rejectButtonProps: {
          label: 'Cancel',
          severity: 'secondary',
          outlined: true,
        },
        acceptButtonProps: {
          label: 'Discard',
          severity: 'danger',
        },
        accept: () => {
          this.close();
        },
      });
      return;
    }

    this.close();
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.close();
  }

  protected async onSubmit() {
    if (!this.columnForm().valid) return;

    this.isSaving.set(true);

    // Sanitize the column form data by removing empty values
    const formData = sanitizeEmptyValues(this.columnFormData);

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

    let fn: Observable<any>;
    if (this.mode() === 'edit') {
      fn = this.tblService.updateColumn(this.table().name, this.column().name, formData);
    } else {
      fn = this.tblService.createColumn(this.table().name, formData);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ data: column }) => {
      this.onSave.emit(column);
      this.close();
    });
  }

  protected onDataTypeSelect(dataType: DataType) {
    this.columnFormData.dataType = dataType;
    this.columnFormData.defaultValue = null;
    this.columnFormData.presentation = { ...DEFAULT_VALUE.presentation };
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

  protected onTableSelect(tableName: string) {
    const table = this.tblService.tables().find((t) => t.name === tableName);
    if (!table) return;

    this.columnFormData.foreignKey.table = table.name;
    this.columnFormData.foreignKey.column = table.primaryKey;
  }

  protected loadReferenceDisplayColumnOptions() {
    if (!this.columnFormData.foreignKey.table) {
      this.referenceDisplayColumnOptions = [];
      return;
    }

    this.tblService
      .getTableSchema(this.columnFormData.foreignKey.table)
      .subscribe((columns: ColumnDefinition[]) => {
        this.referenceDisplayColumnOptions = columns;
      });
  }

  private onOptionsUpdate() {
    const options = this.columnFormData.options;
    this.columnFormData.options = [...options];

    switch (this.internalField?.dataType) {
      case DataType.Select:
        (this.internalField as SelectField).options = [...options];
        break;
      case DataType.MultiSelect:
        (this.internalField as MultiSelectField).options = [...options];
    }
  }

  private initValidation(dataType: DataType) {
    switch (dataType) {
      case DataType.Text:
        this.columnFormData.validation.minLength = null;
        this.columnFormData.validation.maxLength = 255;
        break;
    }
  }

  private initPresentation(dataType: DataType) {
    switch (dataType) {
      case DataType.Number:
        this.columnFormData.presentation.format ??= {
          numberFormat: NumberFormat.Comma,
        };
        break;
      case DataType.Date:
      case DataType.AutoDate:
        this.columnFormData.presentation.format ??= {
          dateFormat: environment.defaultDateFormat,
          showTime: false,
        };
        break;
      case DataType.Reference:
        this.columnFormData.presentation.format ??= {
          displayColumn: null,
        };
        this.loadReferenceDisplayColumnOptions();
        break;
    }
  }
}
