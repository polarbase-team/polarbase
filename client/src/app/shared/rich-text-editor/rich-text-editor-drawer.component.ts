import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { EditorModule } from 'primeng/editor';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { DrawerComponent } from '@app/core/components/drawer/drawer.component';

@Component({
  selector: 'rich-text-editor-drawer',
  templateUrl: './rich-text-editor-drawer.component.html',
  styleUrl: './rich-text-editor-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DrawerModule, ButtonModule, ConfirmDialogModule, EditorModule],
  providers: [ConfirmationService],
})
export class RichTextEditorDrawerComponent extends DrawerComponent {
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
