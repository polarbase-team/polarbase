import _ from 'lodash';

import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { SelectField } from '../../../field/objects/select-field.object';
import { SelectData } from '../../../field/interfaces/select-field.interface';
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
    this.menu().show(e);
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
}
