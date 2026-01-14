import _ from 'lodash';

import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { SelectField } from '@app/shared/field-system/models/select/field.object';
import { SelectData } from '@app/shared/field-system/models/select/field.interface';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';

@Component({
  selector: 'select-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'select-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, TagModule],
})
export class SelectFieldCellComponent extends FieldCellEditable<SelectData> {
  declare field: SelectField;

  menu = viewChild<Menu>('menu');
  items: MenuItem[] | undefined;

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.openMenu(e);
  }

  protected onMenuOpen() {
    this.items = _.chain(this.field.options)
      .without(this.data)
      .map((option) => ({
        label: option,
        command: ({ item }) => this.save(item.label),
      }))
      .value();

    if (!this.items.length) {
      this.items = [{ label: 'No items available', disabled: true }];
    }

    this.markAsEditStarted();
  }

  protected onMenuClose() {
    this.markAsEditEnded();
  }

  protected openMenu(event: Event) {
    const fakeEvent = {
      ...event,
      currentTarget: this.eleRef.nativeElement,
      target: this.eleRef.nativeElement,
    };

    this.menu().show(fakeEvent);
  }
}
