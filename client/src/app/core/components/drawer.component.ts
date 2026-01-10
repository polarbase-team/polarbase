import { output, model, input, Directive } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

export const usingModules = [DrawerModule, ButtonModule];

@Directive()
export class DrawerComponent {
  visible = model(false);

  onOpen = output();
  onClose = output();

  protected open() {
    this.visible.set(true);
  }

  protected close() {
    this.visible.set(false);
  }

  protected onShow() {
    this.onOpen.emit();
  }

  protected onHide() {
    this.onClose.emit();
  }
}
