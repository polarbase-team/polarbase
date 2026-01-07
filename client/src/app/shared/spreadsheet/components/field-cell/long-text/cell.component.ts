import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RichTextEditorDrawerComponent } from '@app/shared/rich-text-editor/rich-text-editor-drawer.component';
import { LongTextData } from '@app/shared/field-system/models/long-text/field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'long-text-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'long-text-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RichTextEditorDrawerComponent, InputBoxComponent],
})
export class LongTextFieldCellComponent extends FieldCellInputable<LongTextData> {
  protected visibleRichTextEditor = false;
}
