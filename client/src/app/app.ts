import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  TextField,
  NumberField,
  CheckboxField,
  DropdownField,
  DateField,
} from './spreadsheet/field/objects';
import { SpreadsheetComponent } from './spreadsheet/spreadsheet.component';
import { TableColumn } from './spreadsheet/models/table-column';
import _ from 'lodash';
import { TableRow } from './spreadsheet/models/table-row';
import { TableConfig } from './spreadsheet/models/table';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpreadsheetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  console = console;
  columns: TableColumn[] = [
    {
      id: _.uniqueId(),
      field: new TextField({ name: 'Text', required: true }),
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
    sideSpacing: 20,
    row: {
      size: 'S',
    },
    // streamData: true,
    // calculating: [
    // 	[ this.columns[ 0 ], CalculateType.Empty ],
    // 	[ this.columns[ 2 ], CalculateType.Sum ],
    // 	[ this.columns[ 3 ], CalculateType.Empty ],
    // ],
    // grouping: [
    // 	[ this.columns[ 2 ], 'asc' ],
    // ],
    // sorting: [
    // 	[ this.columns[ 5 ], 'asc' ],
    // ],
  };
}
