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

import { TableFormData, TableDefinition, TableService } from '../table.service';

@Component({
  selector: 'table-editor-drawer',
  templateUrl: './table-editor-drawer.component.html',
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
  ],
})
export class TableEditorDrawerComponent {
  visible = model(false);
  table = input<TableDefinition>();
  mode = input<'add' | 'edit'>('add');

  onSave = output<TableFormData>();

  protected tableForm = viewChild<NgForm>('tableForm');
  protected tableFormData: TableFormData;
  protected isSaving = signal(false);

  constructor(
    private destroyRef: DestroyRef,
    private tblService: TableService,
  ) {
    effect(() => {
      this.tableFormData = { autoAddingPrimaryKey: true, timestamps: true, ...this.table() };
    });
  }

  protected async onSubmit() {
    if (!this.tableForm().valid) return;

    this.isSaving.set(true);

    let fn: Observable<any>;

    if (this.mode() === 'edit') {
      fn = this.tblService.updateTable(this.table().tableName, this.tableFormData);
    } else {
      fn = this.tblService.createTable(this.tableFormData);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.visible.set(false);
      this.onSave.emit(this.tableFormData);
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.visible.set(false);
  }
}
