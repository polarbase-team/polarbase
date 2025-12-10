import { Component, output, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { EditorModule } from 'primeng/editor';

@Component({
  selector: 'rich-text-editor-drawer',
  templateUrl: './rich-text-editor-drawer.component.html',
  styleUrl: './rich-text-editor-drawer.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DrawerModule, ButtonModule, EditorModule],
})
export class RichTextEditorDrawerComponent {
  value = model('');
  visible = model(false);
  viewOnly = input(false);

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
