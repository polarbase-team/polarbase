import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';

import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { AttachmentField } from '@app/shared/field-system/models/attachment/field.object';
import { AttachmentData } from '@app/shared/field-system/models/attachment/field.interface';
import { FileListComponent } from '@app/shared/file/file-list/file-list.component';
import {
  FileUploaderComponent,
  FileMetadata,
} from '@app/shared/file/file-uploader/file-uploader.component';
import { FieldCellEditable } from '../field-cell-editable';
import { CellTouchEvent } from '../field-cell-touchable';

@Component({
  selector: 'attachment-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', './cell.component.scss'],
  host: { class: 'attachment-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PopoverModule, TooltipModule, FileListComponent, FileUploaderComponent],
})
export class AttachmentFieldCellComponent extends FieldCellEditable<AttachmentData> {
  declare field: AttachmentField;

  popover = viewChild<Popover>('popover');

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.openPopover(e);
  }

  protected onPopoverOpen() {
    this.markAsEditStarted();
  }

  protected onPopoverClose() {
    this.markAsEditEnded();
  }

  protected openPopover(event: Event) {
    const fakeEvent = {
      ...event,
      currentTarget: this.eleRef.nativeElement,
      target: this.eleRef.nativeElement,
    };

    this.popover().show(fakeEvent);
  }

  protected onUpload(files: FileMetadata[]) {
    this.data = [...(this.data || []), ...files];
    this.save();
  }

  protected onDelete(file: FileMetadata) {
    const data = this.data.filter((f) => f.id !== file.id);
    this.data = data.length ? data : null;
    this.save();
  }
}
