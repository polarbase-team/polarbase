import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  TextField,
  NumberField,
  CheckboxField,
  DropdownField,
  DateField,
} from './spreadsheet/field/objects';
import {
  SpreadsheetComponent,
  Column,
  Row,
  Config,
} from './spreadsheet/components/spreadsheet.component';
import _ from 'lodash';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpreadsheetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  columns: Column[] = [
    {
      id: _.uniqueId(),
      field: new TextField('Text', undefined, undefined, true),
    },
    {
      id: _.uniqueId(),
      field: new NumberField('Number'),
    },
    {
      id: _.uniqueId(),
      field: new CheckboxField('Checkbox', undefined, 'asdsad'),
    },
    {
      id: _.uniqueId(),
      field: new DropdownField('Dropdown', undefined, [
        'Option 1',
        'Option 2',
        'Option 3',
        'Option 4',
        'Option 5',
        'Option 6',
      ]),
    },
    {
      id: _.uniqueId(),
      field: new DateField('Date'),
    },
  ];
  rows: Row[] = _.map(_.range(1, 100), (index: number) => {
    return { id: _.uniqueId() } as Row;
  });
  config: Config = {
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
