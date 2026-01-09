import { output, model, input, Directive } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

export const usingModules = [DrawerModule, ButtonModule];

@Directive()
export class DrawerComponent<T = any> {
  value = model<T>(null);
  visible = model(false);
  viewOnly = input(false);

  onSave = output<T>();
  onCancel = output();
  onOpen = output();
  onClose = output();

  protected onShow() {
    this.onOpen.emit();
  }

  protected onHide() {
    this.onClose.emit();
  }

  protected save() {
    this.visible.set(false);
    this.onSave.emit(this.value());
  }

  protected cancel() {
    this.visible.set(false);
    this.onCancel.emit();
  }
}
