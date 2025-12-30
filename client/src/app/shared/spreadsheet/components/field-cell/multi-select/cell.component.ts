import _ from 'lodash';

import { ChangeDetectionStrategy, Component, SimpleChanges, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { MultiSelectField } from '../../../field/objects/multi-select-field.object';
import {
  MultiSelectData,
  MultiSelectOption,
} from '../../../field/interfaces/multi-select-field.interface';
import { CellTouchEvent } from '../field-cell-touchable';
import { FieldCellEditable } from '../field-cell-editable';

@Component({
  selector: 'multi-select-field-cell',
  templateUrl: './cell.component.html',
  styleUrl: '../field-cell.scss',
  host: { class: 'multi-select-field-cell' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, TagModule],
})
export class MultiSelectFieldCellComponent extends FieldCellEditable<MultiSelectData> {
  declare field: MultiSelectField;

  menu = viewChild<Menu>('menu');
  items: MenuItem[] | undefined;

  protected parsedData: string[] = [];

  override ngOnChanges(changes: SimpleChanges): void {
    if ('data' in changes) {
      const data = this.data;
      if (data?.length > 0) {
        if (typeof data === 'string') {
          const str = (data as string).replace(/\{|\}/g, '').trim();
          if (str.length > 0) this.parsedData = str.split(',');
        } else {
          this.parsedData = [...data];
        }
      }
    }
  }

  ngOnInit() {
    this.items = _.map(this.field.options, (option) => ({
      label: option,
      command: ({ item }) => {
        this.parsedData.push(item.label);
        this.save(this.parsedData);
      },
    }));
  }

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.menu().show(e);
  }

  protected onMenuOpen() {
    this.items = _.chain(this.field.options)
      .difference(this.parsedData)
      .map((option) => ({ label: option }))
      .value();

    if (!this.items.length) {
      this.items = [{ label: 'No items available', disabled: true }];
    }

    this.markAsEditStarted();
  }

  protected onMenuClose() {
    this.markAsEditEnded();
  }

  protected addOption(option: MultiSelectOption) {
    this.parsedData.push(option);
    this.save(this.parsedData);
  }

  protected removeSelectedOption(option: MultiSelectOption) {
    this.parsedData = this.parsedData.filter((o) => o !== option);
    this.save(this.parsedData);
  }
}
