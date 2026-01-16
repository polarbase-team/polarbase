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
import { RadioButtonModule } from 'primeng/radiobutton';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { DrawerComponent } from '@app/core/components/drawer.component';
import { sanitizeEmptyStrings } from '@app/core/utils';
import { TableFormData, TableDefinition, TableService } from '../../services/table.service';

const DEFAULT_VALUE = { idType: 'integer', timestamps: true } as TableFormData;

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
    RadioButtonModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
})
export class TableEditorDrawerComponent extends DrawerComponent {
  table = input<TableDefinition>();
  mode = input<'add' | 'edit'>('add');

  onSave = output<TableFormData>();

  protected tableForm = viewChild<NgForm>('tableForm');
  protected tableFormData: TableFormData;
  protected isSaving = signal(false);

  constructor(
    private destroyRef: DestroyRef,
    private confirmationService: ConfirmationService,
    private tblService: TableService,
  ) {
    super();

    effect(() => {
      this.tableFormData = { ...DEFAULT_VALUE, ...this.table() };
    });
  }

  protected override onHide() {
    super.onHide();

    if (this.tableForm().dirty) {
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
          severity: 'primary',
        },
        accept: () => {
          this.close();
          this.reset();
        },
      });
      return;
    }

    this.close();
    this.reset();
  }

  protected async onSubmit() {
    if (!this.tableForm().valid) return;

    this.isSaving.set(true);

    let fn: Observable<any>;

    const formData = sanitizeEmptyStrings(this.tableFormData);
    if (this.mode() === 'edit') {
      fn = this.tblService.updateTable(this.table().tableName, formData);
    } else {
      fn = this.tblService.createTable(formData);
    }

    fn.pipe(
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.onSave.emit(this.tableFormData);
      this.reset();
      this.close();
    });
  }

  protected save() {
    this.onSubmit();
  }

  protected cancel() {
    this.close();
  }

  protected reset() {
    this.tableForm().reset();
    this.tableFormData = { ...DEFAULT_VALUE };
    this.isSaving.set(false);
  }
}
