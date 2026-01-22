import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FileListComponent } from '@app/shared/file/file-list/file-list.component';
import {
  FileUploaderComponent,
  FileMetadata,
} from '@app/shared/file/file-uploader/file-uploader.component';
import { AttachmentField } from '../../models/attachment/field.object';
import { AttachmentData } from '../../models/attachment/field.interface';
import { FieldEditorComponent } from '../editor.component';

@Component({
  selector: 'attachment-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FileListComponent, FileUploaderComponent],
})
export class AttachmentFieldEditorComponent extends FieldEditorComponent<
  AttachmentField,
  AttachmentData
> {
  protected onUpload(files: FileMetadata[]) {
    this.data.update((arr) => [...(arr || []), ...files]);
  }

  protected onDelete(file: FileMetadata) {
    this.data.update((arr) => {
      const data = arr.filter((f) => f.id !== file.id);
      return data.length ? [...data] : null;
    });
  }
}
