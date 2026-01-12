import { FileMetadata, StorageProvider } from './storage';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';

export class LocalStorageProvider implements StorageProvider {
  private uploadDir = 'uploads';

  async upload(file: File, path: string = ''): Promise<Partial<FileMetadata>> {
    const key = join(path, `${Date.now()}-${file.name}`);
    const fullPath = join(this.uploadDir, key);

    await Bun.write(fullPath, file);

    return {
      key,
      size: file.size,
      mimeType: file.type,
      provider: 'local',
      name: file.name,
    };
  }

  async download(key: string) {
    const file = Bun.file(join(this.uploadDir, key));
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async delete(key: string) {
    const path = join(this.uploadDir, key);
    await unlink(path);
  }

  async getSignedUrl(key: string): Promise<string> {
    throw new Error('Signed URLs are not supported for Local Storage.');
  }
}
