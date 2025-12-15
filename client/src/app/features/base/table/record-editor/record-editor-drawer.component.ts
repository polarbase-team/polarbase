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
import { FormsModule } from '@angular/forms';
import { finalize, Observable, map } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AutoFocusModule } from 'primeng/autofocus';

import { JSONEditorDrawerComponent } from '../../../../shared/json-editor/json-editor-drawer.component';
import { RichTextEditorDrawerComponent } from '../../../../shared/rich-text-editor/rich-text-editor-drawer.component';
import { DataType } from '../../../../shared/spreadsheet/field/interfaces/field.interface';
import { Field } from '../../../../shared/spreadsheet/field/objects/field.object';
import { TableDefinition, TableService } from '../table.service';

@Component({
  selector: 'record-editor-drawer',
  templateUrl: './record-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    InputTextModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
    DividerModule,
    InputNumberModule,
    CheckboxModule,
    DatePickerModule,
    ToastModule,
    AutoFocusModule,
    RichTextEditorDrawerComponent,
    JSONEditorDrawerComponent,
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
  protected visibleRichTextEditor = false;
  protected editingRichTextField: Field;
  protected editingRichText = '';
  protected visibleJSONEditor = false;
  protected editingJSONField: Field;
  protected editingJSONText = '';

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
        fn = this.tblService
          .bulkCreateRecords(tableName, [data])
          .pipe(map(({ data }) => data.returning[0]));
        break;
      case 'edit':
        fn = this.tblService.bulkUpdateRecords(tableName, [
          {
            where: { [tableColumnPk]: id },
            data,
          },
        ]);
        break;
    }

    this.isSaving.set(true);
    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((record) => {
      this.visible.set(false);
      this.onSave.emit(record);
    });
  }

  protected cancel() {
    this.visible.set(false);
  }

  protected openRichTextEditor(field: Field) {
    this.editingRichTextField = field;
    this.editingRichText = field.toString(this.updatedRecord[field.name]);
    this.visibleRichTextEditor = true;
  }

  protected openJSONEditor(field: Field) {
    this.editingJSONField = field;
    this.editingJSONText = field.toString(this.updatedRecord[field.name]);
    this.visibleJSONEditor = true;
  }
}
