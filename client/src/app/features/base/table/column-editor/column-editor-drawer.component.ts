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

import { ColumnCreation, ColumnDefinition, TableDefinition, TableService } from '../table.service';

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
  ],
})
export class ColumnEditorDrawerComponent {
  visible = model(false);
  table = input<TableDefinition>();
  column = input<ColumnDefinition>();
  mode = input<'add' | 'edit'>('add');

  onSave = output<ColumnCreation>();

  protected columnForm = viewChild<NgForm>('columnForm');
  protected updatedColumn: ColumnCreation;
  protected isSaving = signal(false);

  constructor(
    private destroyRef: DestroyRef,
    private tblService: TableService,
  ) {
    effect(() => {
      this.updatedColumn = { ...this.column() };
    });
  }

  protected async onSubmit() {
    if (!this.columnForm().valid) return;

    this.isSaving.set(true);

    let fn: Observable<any>;

    if (this.mode() === 'edit') {
      fn = this.tblService.updateColumn(
        this.table().tableName,
        this.column().name,
        this.updatedColumn,
      );
    } else {
      fn = this.tblService.createColumn(this.table().tableName, this.updatedColumn);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.visible.set(false);
      this.onSave.emit(this.updatedColumn);
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.visible.set(false);
  }
}
