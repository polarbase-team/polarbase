import _ from 'lodash';

import { ChangeDetectionStrategy, Component, SimpleChanges, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { MultiSelectField } from '@app/shared/field-system/models/multi-select/field.object';
import {
  MultiSelectData,
  MultiSelectOption,
} from '@app/shared/field-system/models/multi-select/field.interface';
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

  protected items: MenuItem[] | undefined;

  ngOnInit() {
    this.items = _.map(this.field.options, (option) => ({
      label: option,
      command: ({ item }) => {
        this.data.push(item.label);
        this.save(this.data);
      },
    }));
  }

  protected override onTouch(e: CellTouchEvent) {
    if (this.readonly) return;
    this.openMenu(e);
  }

  protected onMenuOpen() {
    this.items = _.chain(this.field.options)
      .difference(this.data)
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

  protected openMenu(event: Event) {
    const fakeEvent = {
      ...event,
      currentTarget: this.eleRef.nativeElement,
      target: this.eleRef.nativeElement,
    };

    this.menu().show(fakeEvent);
  }

  protected addOption(option: MultiSelectOption) {
    this.data.push(option);
    this.save(this.data);
  }

  protected removeSelectedOption(option: MultiSelectOption) {
    this.data = this.data.filter((o) => o !== option);
    this.save(this.data);
  }
}
