import _ from 'lodash';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { finalize, Observable, map } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { DataType } from '@app/shared/spreadsheet/field/interfaces/field.interface';
import { Field } from '@app/shared/spreadsheet/field/objects/field.object';
import { TextFieldEditorComponent } from '../field-editors/text/editor.component';
import { LongTextFieldEditorComponent } from '../field-editors/long-text/editor.component';
import { IntegerFieldEditorComponent } from '../field-editors/integer/editor.component';
import { NumberFieldEditorComponent } from '../field-editors/number/editor.component';
import { SelectFieldEditorComponent } from '../field-editors/select/editor.component';
import { MultiSelectFieldEditorComponent } from '../field-editors/multi-select/editor.component';
import { CheckboxFieldEditorComponent } from '../field-editors/checkbox/editor.component';
import { DateFieldEditorComponent } from '../field-editors/date/editor.component';
import { EmailFieldEditorComponent } from '../field-editors/email/editor.component';
import { UrlFieldEditorComponent } from '../field-editors/url/editor.component';
import { JSONFieldEditorComponent } from '../field-editors/json/editor.component';
import { TableDefinition, TableService } from '../../services/table.service';

@Component({
  selector: 'record-editor-drawer',
  templateUrl: './record-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    DividerModule,
    ToastModule,
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
  ],
  providers: [MessageService],
})
export class RecordEditorDrawerComponent {
  table = input<TableDefinition>();
  fields = input<Field[]>([]);
  record = input({});
  mode = input<'add' | 'edit' | 'view'>('add');
  visible = model(false);

  onSave = output<Record<string, any>>();

  protected viewOnly = computed(() => this.mode() === 'view');
  protected requiredFields = signal<Field[]>([]);
  protected optionalFields = signal<Field[]>([]);
  protected isSaving = signal<boolean>(false);
  protected DataType = DataType;
  protected updatedRecord: Record<string, any> = {};

  constructor(
    private destroyRef: DestroyRef,
    private messageService: MessageService,
    private tblService: TableService,
  ) {
    effect(() => {
      this.updatedRecord = { ...(this.record() || {}) };
    });

    effect(() => {
      const requiredFields = [];
      const optionalFields = [];
      for (const field of this.fields()) {
        if (field.required) {
          requiredFields.push(field);
        } else {
          optionalFields.push(field);
        }
      }
      this.requiredFields.set(requiredFields);
      this.optionalFields.set(optionalFields);
    });
  }

  protected save() {
    const isInvalid = this.requiredFields().find(
      (field: Field) => !field.params.primary && _.isNil(this.updatedRecord[field.name]),
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

    const { tableName, tableColumnPk } = this.tblService.selectedTable();
    const id = this.record()[tableColumnPk] ?? undefined;
    const data = { ...this.updatedRecord };

    let fn: Observable<any>;
    switch (this.mode()) {
      case 'add':
        if (_.isNil(data[tableColumnPk])) data[tableColumnPk] = id;
        fn = this.tblService.createRecords(tableName, [data]);
        break;
      case 'edit':
        fn = this.tblService.updateRecords(tableName, [{ id, data }]);
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
      this.reset();
    });
  }

  protected cancel() {
    this.visible.set(false);
  }

  protected reset() {
    this.updatedRecord = {};
    this.isSaving.set(false);
  }
}
