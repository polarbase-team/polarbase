export interface FileMetadata {
  id: string; // Unique identifier (UUID or Database ID)
  name: string; // Original filename (e.g., "vacation.jpg")
  key: string; // Unique path/key in the storage provider
  size: number; // Size in bytes
  mimeType: string; // e.g., "image/jpeg"
  provider: 'local' | 's3' | 'gcs'; // Tracking the source
  url?: string; // Publicly accessible URL (optional)
  uploadedAt: Date;
}

export interface StorageProvider {
  /**
   * Uploads a file and returns the metadata
   */
  upload(file: File | Blob, path?: string): Promise<Partial<FileMetadata>>;

  /**
   * Retrieves a file as a Buffer or Blob
   */
  download(key: string): Promise<Uint8Array>;

  /**
   * Deletes a file from the provider
   */
  delete(key: string): Promise<void>;

  /**
   * Generates a signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

export const getSafeFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const lastDotIndex = originalName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalName.slice(lastDotIndex) : '';
  const nameWithoutExt =
    lastDotIndex !== -1 ? originalName.slice(0, lastDotIndex) : originalName;
  const safeName = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return `${timestamp}-${safeName}${extension}`;
};
