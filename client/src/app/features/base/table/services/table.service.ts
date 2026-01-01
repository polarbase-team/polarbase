import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '@environments/environment';

import { ApiResponse } from '@app/core/models/api-response';
import { DataType, FieldConfig } from '@app/shared/spreadsheet/field/interfaces/field.interface';
import { IntegerFieldConfig } from '@app/shared/spreadsheet/field/interfaces/integer-field.interface';
import { SelectFieldConfig } from '@app/shared/spreadsheet/field/interfaces/select-field.interface';
import { buildField } from '@app/shared/spreadsheet/field/utils';
import { NumberFieldConfig } from '@app/shared/spreadsheet/field/interfaces/number-field.interface';
import { TextFieldConfig } from '@app/shared/spreadsheet/field/interfaces/text-field.interface';
import { LongTextFieldConfig } from '@app/shared/spreadsheet/field/interfaces/long-text-field.interface';
import { JSONFieldConfig } from '@app/shared/spreadsheet/field/interfaces/json-field.interface';
import { DateFieldConfig } from '@app/shared/spreadsheet/field/interfaces/date-field.interface';

export interface TableDefinition {
  tableName: string;
  tableComment: string;
  tableColumnPk: string;
}

export interface TableFormData {
  tableName: string;
  tableComment?: string;
  idType?: 'integer' | 'biginteger' | 'uuid' | 'shortid';
  timestamps?: boolean;
}

export interface ColumnDefinition {
  name: string;
  dataType: DataType;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: any | null;
  comment: string | null;
  options: string[] | null;
  foreignKey: { table: string; column: string } | null;
  validation: {
    minLength?: number | null;
    maxLength?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
    minDate?: string | null;
    maxDate?: string | null;
    maxSize?: number | null;
  } | null;
  metadata: any;
}

export interface ColumnFormData extends Omit<ColumnDefinition, 'primary'> {}

const DATA_TYPE_MAPPING = {
  integer: DataType.Integer,
  number: DataType.Number,
  text: DataType.Text,
  'long-text': DataType.LongText,
  checkbox: DataType.Checkbox,
  date: DataType.Date,
  select: DataType.Select,
  'multi-select': DataType.MultiSelect,
  email: DataType.Email,
  url: DataType.Url,
  json: DataType.JSON,
};

@Injectable({
  providedIn: 'root',
})
export class TableService {
  selectedTable = signal<TableDefinition>(null);

  private apiUrl = `${environment.apiUrl}/rest`;

  constructor(private http: HttpClient) {}

  getEnumTypes() {
    return this.http
      .get<ApiResponse<ColumnDefinition[]>>(`${this.apiUrl}/enum-types`)
      .pipe(map((res) => res.data));
  }

  getTables() {
    return this.http
      .get<ApiResponse<TableDefinition[]>>(`${this.apiUrl}/tables`)
      .pipe(map((res) => res.data));
  }

  getTableSchema(tableName: string) {
    return this.http
      .get<ApiResponse<ColumnDefinition[]>>(`${this.apiUrl}/tables/${tableName}/schema`)
      .pipe(map((res) => res.data));
  }

  createTable(table: TableFormData) {
    return this.http.post<ApiResponse<TableDefinition>>(`${this.apiUrl}/tables`, table);
  }

  updateTable(tableName: string, table: Pick<TableFormData, 'tableName' | 'tableComment'>) {
    return this.http.patch<ApiResponse<TableDefinition>>(
      `${this.apiUrl}/tables/${tableName}`,
      table,
    );
  }

  deleteTable(tableName: string, casecade = false) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/tables/${tableName}?cascade=${casecade}`);
  }

  createColumn(tableName: string, column: ColumnFormData) {
    return this.http.post<ApiResponse<ColumnDefinition>>(
      `${this.apiUrl}/tables/${tableName}/columns`,
      column,
    );
  }

  updateColumn(tableName: string, columnName: string, column: ColumnFormData) {
    return this.http.put<ApiResponse<ColumnDefinition>>(
      `${this.apiUrl}/tables/${tableName}/columns/${columnName}`,
      column,
    );
  }

  deleteColumn(tableName: string, columnName: string) {
    return this.http.delete(`${this.apiUrl}/tables/${tableName}/columns/${columnName}`);
  }

  getRecords(tableName: string): Observable<Record<string, any>[]> {
    return this.http.get(`${this.apiUrl}/${tableName}`).pipe(map((res) => res['data']['rows']));
  }

  createRecords(tableName: string, records: Record<string, any>[]) {
    return this.http.post<ApiResponse<{ insertedCount: number; returning: Record<string, any>[] }>>(
      `${this.apiUrl}/${tableName}/bulk-create`,
      records,
    );
  }

  updateRecords(
    tableName: string,
    recordUpdates: { id: string | number; data: Record<string, any> }[],
  ) {
    return this.http.patch<ApiResponse<{ updatedCount: number; returning: any[] }>>(
      `${this.apiUrl}/${tableName}/bulk-update`,
      recordUpdates,
    );
  }

  deleteRecords(tableName: string, recordIds: (string | number)[]) {
    return this.http.post<ApiResponse<{ deletedCount: number }>>(
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

    switch (dataType) {
      case DataType.Text:
        (config as TextFieldConfig).minLength = column.validation?.minLength;
        (config as TextFieldConfig).maxLength = column.validation?.maxLength;
        break;
      case DataType.LongText:
        (config as LongTextFieldConfig).maxSize = column.validation?.maxSize;
        break;
      case DataType.Integer:
        (config as IntegerFieldConfig).min = column.validation?.minValue;
        (config as IntegerFieldConfig).max = column.validation?.maxValue;
        break;
      case DataType.Number:
        (config as NumberFieldConfig).min = column.validation?.minValue;
        (config as NumberFieldConfig).max = column.validation?.maxValue;
        break;
      case DataType.Date:
        (config as DateFieldConfig).minDate = column.validation?.minDate;
        (config as DateFieldConfig).maxDate = column.validation?.maxDate;
        break;
      case DataType.Select:
      case DataType.MultiSelect:
        (config as SelectFieldConfig).options = column.options;
        break;
      case DataType.Email:
      case DataType.Url:
        break;
      case DataType.JSON:
        (config as JSONFieldConfig).maxSize = column.validation?.maxSize;
        break;
    }

    return buildField(dataType, config);
  }
}
