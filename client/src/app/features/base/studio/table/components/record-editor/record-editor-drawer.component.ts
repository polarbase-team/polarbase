import _ from 'lodash';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Observable, map } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FluidModule } from 'primeng/fluid';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { DrawerComponent } from '@app/core/components/drawer/drawer.component';
import { DataType } from '@app/shared/field-system/models/field.interface';
import { Field } from '@app/shared/field-system/models/field.object';
import { DateFormatPipe } from '@app/shared/field-system/pipes/date-format.pipe';
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
import { ReferenceFieldEditorComponent } from '@app/shared/field-system/editors/reference/editor.component';
import { AttachmentFieldEditorComponent } from '@app/shared/field-system/editors/attachment/editor.component';
import { RecordData, TableDefinition, TableService } from '../../services/table.service';

@Component({
  selector: 'record-editor-drawer',
  templateUrl: './record-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    ButtonModule,
    DividerModule,
    ToastModule,
    InputTextModule,
    InputNumberModule,
    FluidModule,
    InputTextModule,
    ConfirmDialogModule,
    DateFormatPipe,
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
    ReferenceFieldEditorComponent,
    AttachmentFieldEditorComponent,
  ],
  providers: [MessageService, ConfirmationService],
})
export class RecordEditorDrawerComponent extends DrawerComponent {
  table = input<TableDefinition>();
  fields = input<Field[]>([]);
  record = input<RecordData>({ id: undefined });
  mode = input<'add' | 'edit' | 'view'>('add');

  onSave = output<RecordData>();

  protected readonly DataType = DataType;
  protected viewOnly = computed(() => this.mode() === 'view');
  protected fieldsByNames = new Map<string, Field>();
  protected requiredFields = signal<Field[]>([]);
  protected optionalFields = signal<Field[]>([]);
  protected isSaving = signal<boolean>(false);
  protected updatedRecord: RecordData = { id: undefined };
  protected isDataChanged = false;

  constructor(
    private destroyRef: DestroyRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private tableService: TableService,
  ) {
    super();
  }

  protected override onShow() {
    super.onShow();

    this.isSaving.set(false);
    this.isDataChanged = false;

    const fields = this.fields();
    const fieldsByNames = new Map<string, Field>();
    const requiredFields: Field[] = [];
    const optionalFields: Field[] = [];

    if (fields) {
      for (const field of fields) {
        fieldsByNames.set(field.name, field);
        if (field.required) {
          requiredFields.push(field);
        } else {
          optionalFields.push(field);
        }
      }
    }

    this.fieldsByNames = fieldsByNames;
    this.requiredFields.set(requiredFields);
    this.optionalFields.set(optionalFields);
    this.updatedRecord = { id: undefined, ...this.record() };
  }

  protected override onHide() {
    super.onHide();

    if (this.isDataChanged) {
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
          this.isDataChanged = false;
        },
      });
      return;
    }

    this.close();
    this.isDataChanged = false;
  }

  protected save() {
    const isInvalid = !!this.requiredFields().find(
      (field) =>
        !field.params.primary &&
        field.dataType !== DataType.AutoNumber &&
        field.dataType !== DataType.AutoDate &&
        field.params.defaultValue === undefined &&
        _.isNil(this.updatedRecord[field.name]),
    );

    if (isInvalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill the required fields.',
        life: 3000,
      });
      return;
    }

    const { name: tableName } = this.table();
    const id = this.record().id ?? undefined;
    const data = Object.keys(this.updatedRecord).reduce((acc, key) => {
      if (this.fieldsByNames.has(key)) {
        acc[key] = this.updatedRecord[key];
      }
      return acc;
    }, {} as RecordData);

    let fn: Observable<any>;
    switch (this.mode()) {
      case 'add':
        fn = this.tableService.createRecords(tableName, [data]);
        break;
      case 'edit':
        fn = this.tableService.updateRecords(tableName, [{ id, data }]);
        break;
    }

    this.isSaving.set(true);
    fn.pipe(
      map(({ data }) => data.returning[0]),
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((record) => {
      this.visible.set(false);
      this.onSave.emit(record);
    });
  }

  protected cancel() {
    this.close();
  }
}
