import { Component, output, model, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { JSONEditorComponent } from './json-editor.component';

@Component({
  selector: 'json-editor-drawer',
  templateUrl: './json-editor-drawer.component.html',
  styleUrl: './json-editor-drawer.component.scss',
  imports: [DrawerModule, ButtonModule, JSONEditorComponent],
})
export class JSONEditorDrawerComponent {
  value = model('');
  visible = model(false);
  viewOnly = input(false);

  onSave = output<string>();
  onCancel = output();
  onOpen = output();
  onClose = output();

  protected onShow() {
    this.onOpen.emit();
  }

  protected onHide() {
    this.onClose.emit();
  }

  protected save() {
    this.visible.set(false);
    this.onSave.emit(this.value());
  }

  protected cancel() {
    this.visible.set(false);
    this.onCancel.emit();
  }
}
