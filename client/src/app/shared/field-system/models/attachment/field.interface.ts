import { FileMetadata } from '@app/shared/file/file-upload.service';
import { FieldConfig } from '../field.interface';

export type AttachmentData = FileMetadata[];
export interface AttachmentFieldConfig extends FieldConfig<AttachmentData> {
  maxFiles?: number;
}
