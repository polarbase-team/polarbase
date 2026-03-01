import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { environment } from '@environments/environment';

export interface FileMetadata {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  provider: 'local' | 's3' | 'gcs';
  url?: string;
  uploadedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private readonly uploadUrl = `${environment.apiUrl}/rest${environment.uploadUrl}`;

  constructor(private http: HttpClient) {}

  upload(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    return lastValueFrom(this.http.post<FileMetadata[]>(this.uploadUrl, formData));
  }
}
