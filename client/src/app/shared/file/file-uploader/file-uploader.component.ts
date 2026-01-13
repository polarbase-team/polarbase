import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';

import { FileUpload, FileUploadEvent, FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';

import { environment } from '@environments/environment';

import { formatSize, getFileIcon, isImage } from '../utils';

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

const UPLOAD_URL = `${environment.apiUrl}/rest${environment.uploadUrl}`;

@Component({
  selector: 'file-uploader',
  templateUrl: './file-uploader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FileUploadModule, ButtonModule, BadgeModule],
})
export class FileUploaderComponent {
  uploadUrl = input(UPLOAD_URL);

  onUploadOutput = output<FileMetadata[]>({ alias: 'onUpload' });

  fileUpload = viewChild<FileUpload>('fileUpload');

  protected getFileIcon = getFileIcon;
  protected formatSize = formatSize;
  protected isImage = isImage;

  protected onUpload(e: FileUploadEvent) {
    for (let file of e.files) {
      (file as any).status = 'completed';
    }

    this.onUploadOutput.emit((e.originalEvent as HttpResponse<{ data: FileMetadata[] }>).body.data);
  }

  protected onRemoveFile(file: any) {
    const fileUpload = this.fileUpload();

    // 1. Remove from the pending queue (files not yet uploaded)
    const pendingIndex = fileUpload.files.indexOf(file);
    if (pendingIndex > -1) {
      fileUpload.remove(null, pendingIndex);
    }

    // 2. Remove from the uploaded history (files already sent)
    const uploadedIndex = fileUpload.uploadedFiles.indexOf(file);
    if (uploadedIndex > -1) {
      fileUpload.uploadedFiles.splice(uploadedIndex, 1);

      // Trigger a new reference so Angular change detection picks it up
      fileUpload.uploadedFiles = [...fileUpload.uploadedFiles];
    }
  }
}
