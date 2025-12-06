import _ from 'lodash';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { DropdownField } from '../../../field/objects/dropdown-field.object';
import { DropdownData } from '../../../field/interfaces/dropdown-field.interface';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';

@Component({
  selector: 'dropdown-field-cell',
  templateUrl: './cell.html',
  styleUrls: ['../field-cell.scss'],
  host: { class: 'dropdown-field-cell' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, TagModule],
})
export class DropdownFieldCellComponent extends FieldCellEditable<DropdownData> {
  declare field: DropdownField;

  @ViewChild('menu') menu: Menu;

  items: MenuItem[] | undefined;

  ngOnInit() {
    this.items = _.map(this.field.options, (option) => ({
      label: option,
      command: ({ item }) => this.save(item.label),
    }));
  }

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.menu.show(e);
  }

  protected onMenuOpened() {
    this.markAsEditStarted();
  }

  protected onMenuClosed() {
    this.markAsEditEnded();
  }
}
