import { FileMetadata } from '@app/shared/file/file-uploader/file-uploader.component';
import { FieldConfig } from '../field.interface';

export type AttachmentData = FileMetadata[];
export interface AttachmentFieldConfig extends FieldConfig<AttachmentData> {
  maxFiles?: number;
}
