import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DataType, FieldConfig } from '../spreadsheet/field/interfaces/field.interface';
import { buildField } from '../spreadsheet/field/field.helper';

export interface TableDefinition {
  tableName: string;
  tableComment: string;
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

  getTableData(tableName: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${tableName}`).pipe(map((res) => res.data));
  }

  bulkCreateTableRecords(tableName: string, records: any[]) {
    return this.http.post<Response<{ insertedCount: number }>>(
      `${this.apiUrl}/${tableName}/bulk-create`,
      records,
    );
  }

  bulkDeleteTableRecords(tableName: string, recordIds: any[]) {
    return this.http.post<Response<{ deletedCount: number }>>(
      `${this.apiUrl}/${tableName}/bulk-delete`,
      { ids: recordIds },
    );
  }

  getFieldType(pgType: string) {
    const normalizedType = pgType
      .toLowerCase()
      .split('(')[0]
      .trim()
      .split(' without')[0]
      .split(' with')[0];

    const mapping = {
      // Integer
      smallint: DataType.Number,
      integer: DataType.Number,
      bigint: DataType.Number,
      smallserial: DataType.Number,
      serial: DataType.Number,
      bigserial: DataType.Number,

      // Number
      numeric: DataType.Number,
      real: DataType.Number,
      'double precision': DataType.Number,
      money: DataType.Number,

      // Text
      character: DataType.Text,
      'character varying': DataType.Text,
      text: DataType.Text,
      uuid: DataType.Text,
      bit: DataType.Text,
      'bit varying': DataType.Text,

      // Checkbox
      boolean: DataType.Checkbox,

      // Date
      date: DataType.Date,
      timestamp: DataType.Date,
      time: DataType.Date,

      // JSON
      json: DataType.Text,
      jsonb: DataType.Text,
    };

    return mapping[normalizedType] || DataType.Text;
  }

  getFieldConfig(column: ColumnDefinition) {
    return {
      id: column.columnName,
      name: column.columnName,
      description: column.comment,
      required: !column.isNullable,
      initialData: column.defaultValue,
      params: column,
    } as FieldConfig;
  }

  buildField(column: ColumnDefinition) {
    const dataType = this.getFieldType(column.dataType);
    const config = this.getFieldConfig(column);
    return buildField(dataType, config);
  }
}
