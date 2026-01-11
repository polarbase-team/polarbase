import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { EditorModule } from 'primeng/editor';

import { DrawerComponent } from '@app/core/components/drawer.component';

@Component({
  selector: 'rich-text-editor-drawer',
  templateUrl: './rich-text-editor-drawer.component.html',
  styleUrl: './rich-text-editor-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DrawerModule, ButtonModule, EditorModule],
})
export class RichTextEditorDrawerComponent extends DrawerComponent {
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
