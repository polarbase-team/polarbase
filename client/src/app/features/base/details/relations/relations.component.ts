import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';

import { TableDefinition, TableService } from '../../studio/table/services/table.service';
import { FlowComponent } from './components/flow/flow.component';

@Component({
  selector: 'relations',
  templateUrl: './relations.component.html',
  styleUrl: './relations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlowComponent],
})
export class RelationsComponent implements OnInit {
  protected tables = signal<TableDefinition[]>([]);

  constructor(private tableService: TableService) {}

  async ngOnInit() {
    try {
      const tables = await this.tableService.getTables(true);
      this.tables.set(tables);
    } catch (err) {
      console.error('Failed to load tables for relations', err);
    }
  }
}
