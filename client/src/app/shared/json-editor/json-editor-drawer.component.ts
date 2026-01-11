import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { DrawerComponent } from '@app/core/components/drawer.component';
import { JSONEditorComponent } from './json-editor.component';

@Component({
  selector: 'json-editor-drawer',
  templateUrl: './json-editor-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, JSONEditorComponent],
})
export class JSONEditorDrawerComponent extends DrawerComponent {
  value = model('');
  viewOnly = input(false);

  onSave = output<string>();
  onCancel = output();

  protected save() {
    this.onSave.emit(this.value());
    this.close();
  }

  protected cancel() {
    this.onCancel.emit();
    this.close();
  }
}
