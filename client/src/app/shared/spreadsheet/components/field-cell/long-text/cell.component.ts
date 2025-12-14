import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LongTextData } from '../../../field/interfaces/long-text-field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';
import { RichTextEditorDrawerComponent } from '../../../../rich-text-editor/rich-text-editor-drawer.component';

@Component({
  selector: 'long-text-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'long-text-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputBoxComponent, RichTextEditorDrawerComponent],
})
export class LongTextFieldCellComponent extends FieldCellInputable<LongTextData> {
  protected visibleRichTextEditor = false;
}
