import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DataType, FieldConfig } from '../common/spreadsheet/field/interfaces/field.interface';
import { DropdownFieldConfig } from '../common/spreadsheet/field/interfaces/dropdown-field.interface';
import { buildField } from '../common/spreadsheet/field/utils';

export interface TableDefinition {
  tableName: string;
  tableComment: string;
  tableColumnPk: string;
}

export interface ColumnDefinition {
  columnName: string;
  dataType: string;
  rawType: string;
  isPrimary: boolean;
  isNullable: boolean;
  maxLength: number | null;
  defaultValue: any;
  comment: string | null;
  enumValues: string[] | null;
}

interface Response<T = any> {
  success: boolean;
  message: string;
  data: T;
}

const PG_TYPE_MAPPING = {
  // Integer
  smallint: DataType.Integer,
  integer: DataType.Integer,
  bigint: DataType.Integer,
  smallserial: DataType.Integer,
  serial: DataType.Integer,
  bigserial: DataType.Integer,

  // Number
  numeric: DataType.Number,
  real: DataType.Number,
  'double precision': DataType.Number,

  // Text
  character: DataType.Text,
  'character varying': DataType.Text,
  uuid: DataType.Text,
  bit: DataType.Text,
  'bit varying': DataType.Text,

  // Long Text
  text: DataType.LongText,

  // Checkbox
  boolean: DataType.Checkbox,

  // Date
  date: DataType.Date,
  timestamp: DataType.Date,
  time: DataType.Date,

  // JSON
  json: DataType.JSON,
  jsonb: DataType.JSON,
};

@Injectable({
  providedIn: 'root',
})
export class TableService {
  selectedTable = signal<TableDefinition>(null);

  private apiUrl = 'http://localhost:3000/rest';

  constructor(private http: HttpClient) {}

  getTables() {
    return this.http
      .get<Response<TableDefinition[]>>(`${this.apiUrl}/tables`)
      .pipe(map((res) => res.data));
  }

  getTableSchema(tableName: string) {
    return this.http
      .get<Response<ColumnDefinition[]>>(`${this.apiUrl}/tables/${tableName}/schema`)
      .pipe(map((res) => res.data));
  }

  getTableData(tableName: string): Observable<Record<string, any>[]> {
    return this.http.get(`${this.apiUrl}/${tableName}`).pipe(map((res) => res['data']['rows']));
  }

  bulkCreateTableRecords(tableName: string, records: Record<string, any>[]) {
    return this.http.post<Response<{ insertedCount: number; returning: Record<string, any>[] }>>(
      `${this.apiUrl}/${tableName}/bulk-create`,
      records,
    );
  }

  bulkUpdateTableRecords(
    tableName: string,
    recordUpdates: { where: Record<string, any>; data: Record<string, any> }[],
  ) {
    return this.http.patch<Response<{ updatedCount: number; returning: any[] }>>(
      `${this.apiUrl}/${tableName}/bulk-update`,
      recordUpdates,
    );
  }

  bulkDeleteTableRecords(tableName: string, recordIds: (string | number)[]) {
    return this.http.post<Response<{ deletedCount: number }>>(
      `${this.apiUrl}/${tableName}/bulk-delete`,
      { ids: recordIds },
    );
  }

  buildField(column: ColumnDefinition) {
    let dataType: DataType;
    const config: FieldConfig = {
      name: column.columnName,
      description: column.comment,
      required: !column.isNullable,
      initialData: column.defaultValue,
      params: column,
    };

    if (column.enumValues) {
      dataType = DataType.Dropdown;
      (config as DropdownFieldConfig).options = column.enumValues;
    } else {
      const pgType = column.dataType;
      const normalizedType = pgType
        .toLowerCase()
        .split('(')[0]
        .trim()
        .split(' without')[0]
        .split(' with')[0];
      dataType = PG_TYPE_MAPPING[normalizedType] || DataType.Text;
    }

    return buildField(dataType, config);
  }
}
