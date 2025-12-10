import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TextData } from '../../../field/interfaces/text-field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';
import { RichTextEditorDrawerComponent } from '../../../../rich-text-editor/rich-text-editor-drawer.component';

@Component({
  selector: 'text-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'text-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent, RichTextEditorDrawerComponent],
})
export class TextFieldCellComponent extends FieldCellInputable<TextData> {
  protected visibleRichTextEditor = false;
}
