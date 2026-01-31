import { Component, ChangeDetectionStrategy, model } from '@angular/core';

import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { TableRowSize } from '../../../models/table-row';

@Component({
  selector: 'row-size-options',
  templateUrl: './row-size-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, ButtonModule],
})
export class RowSizeOptionsComponent {
  rowSize = model<TableRowSize>();

  protected menuItems: MenuItem[] = [
    {
      label: 'Small',
      value: 'S',
      command: () => {
        this.rowSize.set('S');
      },
    },
    {
      label: 'Medium',
      value: 'M',
      command: () => {
        this.rowSize.set('M');
      },
    },
    {
      label: 'Large',
      value: 'L',
      command: () => {
        this.rowSize.set('L');
      },
    },
    {
      label: 'X-Large',
      value: 'XL',
      command: () => {
        this.rowSize.set('XL');
      },
    },
  ];
}
