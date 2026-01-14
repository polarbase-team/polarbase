import { environment } from '@environments/environment';

export const getPublicUrl = (key: string) => {
  const baseUrl = environment.assetUrl || '/static';
  return `${baseUrl}/${key}`;
};

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (mime: string) => {
  // Image files
  if (mime.includes('image')) {
    return { name: 'image', color: 'text-blue-500' };
  }

  // PDF documents
  if (mime.includes('pdf')) {
    return { name: 'file-text', color: 'text-red-500' };
  }

  // Spreadsheet files (Excel, CSV, etc.)
  if (
    mime.includes('excel') ||
    mime.includes('spreadsheetml') ||
    mime.includes('csv') ||
    mime.includes('sheet')
  ) {
    return { name: 'file-spreadsheet', color: 'text-green-600' };
  }

  // Word processing documents (Docx, etc.)
  if (mime.includes('word') || mime.includes('officedocument.wordprocessingml')) {
    return { name: 'file-text', color: 'text-blue-600' };
  }

  // Presentation files (PowerPoint)
  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return { name: 'presentation', color: 'text-orange-500' };
  }

  // Video files
  if (mime.includes('video')) {
    return { name: 'video', color: 'text-purple-500' };
  }

  // Audio files
  if (mime.includes('audio')) {
    return { name: 'music', color: 'text-pink-500' };
  }

  // Compressed/Archive files (Zip, Rar)
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
    return { name: 'file-archive', color: 'text-yellow-600' };
  }

  // Default fallback for unknown file types
  return { name: 'file', color: 'text-gray-500' };
};

export const isImage = (mime: string) => {
  return mime.startsWith('image/');
};
