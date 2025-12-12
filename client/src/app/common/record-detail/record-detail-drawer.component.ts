import _ from 'lodash';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

import { JSONEditorDrawerComponent } from '../json-editor/json-editor-drawer.component';
import { RichTextEditorDrawerComponent } from '../rich-text-editor/rich-text-editor-drawer.component';
import { DataType } from '../spreadsheet/field/interfaces/field.interface';
import { Field } from '../spreadsheet/field/objects/field.object';

export interface RecordDetailSavedEvent {
  id?: string | number;
  data: Record<string, any>;
}

@Component({
  selector: 'record-detail-drawer',
  templateUrl: './record-detail-drawer.component.html',
  standalone: true,
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
export class RecordDetailDrawerComponent {
  id = input<string | number>();
  fields = input<Field[]>([]);
  data = input({});
  mode = input<'add' | 'edit' | 'view'>('add');
  visible = model(false);

  saved = output<RecordDetailSavedEvent>();
  canceled = output();
  opened = output();
  closed = output();

  protected viewOnly = computed(() => this.mode() === 'view');
  protected requiredFields = signal<Field[]>([]);
  protected optionalFields = signal<Field[]>([]);
  protected DataType = DataType;
  protected internalData: Record<string, any> = {};
  protected visibleJSONEditor = false;
  protected editingJSONField: Field;
  protected editingJSONText = '';

  constructor(private messageService: MessageService) {
    effect(() => {
      this.internalData = { ...(this.data() || {}) };
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

  protected onShow() {
    this.opened.emit();
  }

  protected onHide() {
    this.closed.emit();
  }

  protected save() {
    const isInvalid = this.requiredFields().find(
      (field: Field) => !field.params.isPrimary && _.isNil(this.internalData[field.name]),
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

    this.visible.set(false);
    this.saved.emit({ id: this.id(), data: this.internalData });
  }

  protected cancel() {
    this.visible.set(false);
    this.canceled.emit();
  }

  protected openJSONEditor(field: Field) {
    this.editingJSONField = field;
    this.editingJSONText = field.toString(this.internalData[field.name]);
    this.visibleJSONEditor = true;
  }
}
