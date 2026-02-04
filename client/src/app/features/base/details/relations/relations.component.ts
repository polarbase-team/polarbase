import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  constructor(
    private destroyRef: DestroyRef,
    private tableService: TableService,
  ) {}

  ngOnInit() {
    this.tableService
      .getTables(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tables) => {
        this.tables.set(tables);
      });
  }
}
