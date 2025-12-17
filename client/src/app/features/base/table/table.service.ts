import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  DataType,
  FieldConfig,
} from '../../../shared/spreadsheet/field/interfaces/field.interface';
import { SelectFieldConfig } from '../../../shared/spreadsheet/field/interfaces/select-field.interface';
import { buildField } from '../../../shared/spreadsheet/field/utils';

export interface TableDefinition {
  tableName: string;
  tableComment: string;
  tableColumnPk: string;
}

export interface ColumnDefinition {
  name: string;
  dataType: DataType;
  pgDataType: string;
  pgRawType: string;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  minLength: number | null;
  maxLength: number | null;
  minValue: number | Date | null;
  maxValue: number | Date | null;
  defaultValue: any;
  hasSpecialDefault: boolean;
  comment: string | null;
  options: string[] | null;
  foreignKey: { table: string; column: string };
}

export interface TableFormData {
  tableName: string;
  tableComment?: string;
  columns?: ColumnDefinition[];
  autoAddingPrimaryKey?: boolean;
  timestamps?: boolean;
}

export interface ColumnFormData extends ColumnDefinition {}

interface Response<T = any> {
  success: boolean;
  message: string;
  data: T;
}

const DATA_TYPE_MAPPING = {
  integer: DataType.Integer,
  number: DataType.Number,
  text: DataType.Text,
  'long-text': DataType.LongText,
  checkbox: DataType.Checkbox,
  date: DataType.Date,
  json: DataType.JSON,
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

  createTable(table: TableFormData) {
    return this.http.post<Response>(`${this.apiUrl}/tables`, table);
  }

  updateTable(tableName: string, table: Pick<TableFormData, 'tableName' | 'tableComment'>) {
    return this.http.patch<Response>(`${this.apiUrl}/tables/${tableName}`, table);
  }

  deleteTable(tableName: string, casecade = false) {
    return this.http.delete<Response>(`${this.apiUrl}/tables/${tableName}?cascade=${casecade}`);
  }

  createColumn(tableName: string, column: ColumnFormData) {
    return this.http.post(`${this.apiUrl}/tables/${tableName}/columns`, column);
  }

  updateColumn(tableName: string, columnName: string, column: ColumnFormData) {
    return this.http.patch(`${this.apiUrl}/tables/${tableName}/columns/${columnName}`, column);
  }

  deleteColumn(tableName: string) {
    return this.http.delete(`${this.apiUrl}/tables/${tableName}/columns`);
  }

  getRecords(tableName: string): Observable<Record<string, any>[]> {
    return this.http.get(`${this.apiUrl}/${tableName}`).pipe(map((res) => res['data']['rows']));
  }

  bulkCreateRecords(tableName: string, records: Record<string, any>[]) {
    return this.http.post<Response<{ insertedCount: number; returning: Record<string, any>[] }>>(
      `${this.apiUrl}/${tableName}/bulk-create`,
      records,
    );
  }

  bulkUpdateRecords(
    tableName: string,
    recordUpdates: { where: Record<string, any>; data: Record<string, any> }[],
  ) {
    return this.http.patch<Response<{ updatedCount: number; returning: any[] }>>(
      `${this.apiUrl}/${tableName}/bulk-update`,
      recordUpdates,
    );
  }

  bulkDeleteRecords(tableName: string, recordIds: (string | number)[]) {
    return this.http.post<Response<{ deletedCount: number }>>(
      `${this.apiUrl}/${tableName}/bulk-delete`,
      { ids: recordIds },
    );
  }

  buildField(column: ColumnDefinition) {
    const dataType: DataType = DATA_TYPE_MAPPING[column.dataType] || DataType.Text;
    const config: FieldConfig = {
      name: column.name,
      description: column.comment,
      required: !column.nullable,
      initialData: column.defaultValue,
      params: column,
    };

    if (dataType === DataType.Select) {
      (config as SelectFieldConfig).options = column.options;
    }

    return buildField(dataType, config);
  }
}
