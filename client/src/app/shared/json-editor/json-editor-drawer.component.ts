import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { DrawerComponent } from '@app/core/components/drawer/drawer.component';
import { JSONEditorComponent } from './json-editor.component';

@Component({
  selector: 'json-editor-drawer',
  templateUrl: './json-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, ConfirmDialogModule, JSONEditorComponent],
  providers: [ConfirmationService],
})
export class JSONEditorDrawerComponent extends DrawerComponent {
  value = model('');
  viewOnly = input(false);

  onSave = output<string>();
  onCancel = output();

  protected isValueChanged = false;

  constructor(private confirmationService: ConfirmationService) {
    super();
  }

  protected override onHide() {
    super.onHide();

    if (this.isValueChanged) {
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
          this.isValueChanged = false;
        },
      });
      return;
    }

    this.close();
    this.isValueChanged = false;
  }

  protected save() {
    this.onSave.emit(this.value());
    this.close();
  }

  protected cancel() {
    this.onCancel.emit();
    this.close();
  }
}
