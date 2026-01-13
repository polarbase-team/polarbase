import { ChangeDetectionStrategy, Component, computed, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ImageModule } from 'primeng/image';
import { GalleriaModule } from 'primeng/galleria';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { FileMetadata } from '../file-uploader/file-uploader.component';
import { formatSize, getFileIcon, getPublicUrl, isImage } from '../utils';

@Component({
  selector: 'file-list',
  templateUrl: './file-list.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ImageModule,
    GalleriaModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
})
export class FileListComponent {
  files = model<FileMetadata[]>([]);

  onDelete = output<FileMetadata>();

  protected filesWithMetadata = computed(() => {
    const files = this.files() || [];
    return files.map((file) => ({
      ...file,
      icon: getFileIcon(file.mimeType),
      size: formatSize(file.size),
      url: getPublicUrl(file.key),
      isImage: isImage(file.mimeType),
    }));
  });
  protected visibleGalleriaDialog = false;
  protected activeIndex = 0;

  constructor(private confirmationService: ConfirmationService) {}

  protected openGalleria(index: number) {
    this.activeIndex = index;
    this.visibleGalleriaDialog = true;
  }

  protected downloadFile(file: FileMetadata) {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  protected confirmDelete(event: Event, file: FileMetadata) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      header: 'Delete file',
      message: `Are you sure you want to delete "${file.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: () => {
        this.deleteFile(file);
      },
    });
  }

  private deleteFile(file: FileMetadata) {
    this.onDelete.emit(file);

    if (this.filesWithMetadata().length === 0) {
      this.visibleGalleriaDialog = false;
    }
  }
}
