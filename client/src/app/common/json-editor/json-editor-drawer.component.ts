import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { JSONEditorComponent } from './json-editor.component';

@Component({
  selector: 'json-editor-drawer',
  templateUrl: './json-editor-drawer.component.html',
  styleUrl: './json-editor-drawer.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerModule, ButtonModule, JSONEditorComponent],
})
export class JSONEditorDrawerComponent {
  value = model('');
  viewOnly = input(false);
  visible = model(false);

  saved = output<string>();
  canceled = output();
  opened = output();
  closed = output();

  protected onShow() {
    this.opened.emit();
  }

  protected onHide() {
    this.closed.emit();
  }

  protected save() {
    this.visible.set(false);
    this.saved.emit(this.value());
  }

  protected cancel() {
    this.visible.set(false);
    this.canceled.emit();
  }
}
