import _ from 'lodash';
import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

import { TableColumn } from '../spreadsheet/models/table-column';
import { TextField } from '../spreadsheet/field/objects/text-field.object';
import { NumberField } from '../spreadsheet/field/objects/number-field.object';
import { CheckboxField } from '../spreadsheet/field/objects/checkbox-field.object';
import { DropdownField } from '../spreadsheet/field/objects/dropdown-field.object';
import { DateField } from '../spreadsheet/field/objects/date-field.object';
// import { CalculateType } from '../spreadsheet/utils/calculate';
import { TableRow } from '../spreadsheet/models/table-row';
import { TableConfig } from '../spreadsheet/models/table';
import { SpreadsheetComponent } from '../spreadsheet/spreadsheet.component';

@Component({
  selector: 'app-table-detail',
  imports: [TabsModule, SpreadsheetComponent],
  templateUrl: './table-detail.html',
})
export class AppTableDetail {
  console = console;
  columns: TableColumn[] = [
    {
      id: _.uniqueId(),
      field: new TextField({ name: 'Text', required: true }),
    },
    {
      id: _.uniqueId(),
      field: new TextField({ name: 'Text 1', required: true }),
    },
    {
      id: _.uniqueId(),
      field: new TextField({ name: 'Text 2', required: true }),
    },
    {
      id: _.uniqueId(),
      field: new NumberField({ name: 'Number' }),
    },
    {
      id: _.uniqueId(),
      field: new CheckboxField({ name: 'Checkbox', description: 'Description' }),
    },
    {
      id: _.uniqueId(),
      field: new DropdownField({
        name: 'Dropdown',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6'],
      }),
    },
    {
      id: _.uniqueId(),
      field: new DateField({ name: 'Date' }),
    },
  ];
  rows: TableRow[] = _.map(_.range(1, 100), (index: number) => {
    return { id: _.uniqueId(), data: { [this.columns[0].id]: index } } as TableRow;
  });
  config: TableConfig = {
    // streamData: true,
    sideSpacing: 20,
    row: { size: 'S' },
    // calculateBy: [
    //   [this.columns[0], CalculateType.Empty],
    //   [this.columns[2], CalculateType.Sum],
    //   [this.columns[3], CalculateType.Empty],
    // ],
    // groupBy: [[this.columns[2], 'asc']],
    // sortBy: [[this.columns[3], 'asc']],
  };
}
