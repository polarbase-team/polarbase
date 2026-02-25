import { Elysia, t } from 'elysia';

import { LocalStorageProvider } from '../../shared/plugins/storage/local-storage';

const storage = new LocalStorageProvider();

/**
 * REST routes for file storage operations.
 */
export const storageRoutes = new Elysia()

  /**
   * POST /rest/files/upload → upload file to storage
   */
  .post(
    '/upload',
    async ({ body: { files } }) => {
      const uploadedMetadata = [];
      for (const file of files) {
        const meta = await storage.upload(file, 'user-uploads');
        uploadedMetadata.push(meta);
      }
      return uploadedMetadata;
    },
    {
      body: t.Object({
        files: t.Files({
          maxItems: 10,
          maxSize: '5m',
        }),
      }),
    }
  );
