import _ from 'lodash';

import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
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
