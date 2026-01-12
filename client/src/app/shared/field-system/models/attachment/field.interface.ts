import { FieldConfig } from '../field.interface';

export interface FileMetadata {
  id: string; // Unique identifier (UUID or Database ID)
  name: string; // Original filename (e.g., "vacation.jpg")
  key: string; // Unique path/key in the storage provider
  size: number; // Size in bytes
  mimeType: string; // e.g., "image/jpeg"
  provider: 'local' | 's3' | 'gcs'; // Tracking the source
  url?: string; // Publicly accessible URL (optional)
  createdAt: Date;
}

export type AttachmentData = FileMetadata;
export interface AttachmentFieldConfig extends FieldConfig<AttachmentData> {}
