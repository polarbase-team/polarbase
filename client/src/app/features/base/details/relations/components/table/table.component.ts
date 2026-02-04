import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FFlowModule } from '@foblex/flow';

import { ButtonModule } from 'primeng/button';

import { TableDefinition } from '@app/features/base/studio/table/services/table.service';
import { DataType } from '@app/shared/field-system/models/field.interface';

const DATA_TYPES = Object.keys(DataType).reduce(
  (acc, t) => {
    acc[DataType[t]] = t;
    return acc;
  },
  {} as Record<DataType, string>,
);

@Component({
  selector: 'table',
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FFlowModule, ButtonModule],
})
export class TableComponent {
  table = input<TableDefinition>();
  usePresentationMode = input(false);

  protected readonly dataTypes = DATA_TYPES;

  constructor(private router: Router) {}

  protected openTable() {
    this.router.navigate(['/base/studio'], { queryParams: { table: this.table()?.name } });
  }
}
