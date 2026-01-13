import { Injectable, SimpleChanges } from '@angular/core';

import type { SpreadsheetComponent } from '../spreadsheet.component';
import type { TableService } from './table.service';
import type { TableColumnService } from './table-column.service';
import type { TableRowService } from './table-row.service';
import type { TableCellService } from './table-cell.service';
import type { TableGroupService } from './table-group.service';

@Injectable()
export class TableBaseService {
  host!: SpreadsheetComponent;
  state: any = {};

  get tableService(): TableService {
    return this.host.tableService;
  }

  get tableColumnService(): TableColumnService {
    return this.host.tableColumnService;
  }

  get tableRowService(): TableRowService {
    return this.host.tableRowService;
  }

  get tableCellService(): TableCellService {
    return this.host.tableCellService;
  }

  get tableGroupService(): TableGroupService {
    return this.host.tableGroupService;
  }

  onChanges(changes: SimpleChanges) {}

  onInit() {}

  afterContentInit() {}

  afterContentChecked() {}

  afterViewInit() {}

  afterViewChecked() {}

  onDestroy() {}
}
