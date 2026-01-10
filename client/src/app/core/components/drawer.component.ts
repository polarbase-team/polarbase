import { output, model, input, Directive } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

export const usingModules = [DrawerModule, ButtonModule];

@Directive()
export class DrawerComponent<T = any, E = T> {
  value = model<T | null>(null);
  visible = model(false);
  viewOnly = input(false);

  onSave = output<E | T | null>();
  onCancel = output();
  onOpen = output();
  onClose = output();

  protected onShow() {
    this.onOpen.emit();
  }

  protected onHide() {
    this.onClose.emit();
  }

  protected save(value: E | T = this.value()) {
    this.visible.set(false);
    this.onSave.emit(value);
  }

  protected cancel() {
    this.visible.set(false);
    this.onCancel.emit();
  }
}
