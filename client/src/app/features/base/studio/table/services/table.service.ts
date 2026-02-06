import { effect, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { environment } from '@environments/environment';

import { ApiResponse } from '@app/core/models/api-response';
import { DataType, FieldConfig } from '@app/shared/field-system/models/field.interface';
import { IntegerFieldConfig } from '@app/shared/field-system/models/integer/field.interface';
import { SelectFieldConfig } from '@app/shared/field-system/models/select/field.interface';
import { EmailFieldConfig } from '@app/shared/field-system/models/email/field.interface';
import { NumberFieldConfig } from '@app/shared/field-system/models/number/field.interface';
import { TextFieldConfig } from '@app/shared/field-system/models/text/field.interface';
import { LongTextFieldConfig } from '@app/shared/field-system/models/long-text/field.interface';
import { JSONFieldConfig } from '@app/shared/field-system/models/json/field.interface';
import { DateFieldConfig } from '@app/shared/field-system/models/date/field.interface';
import {
  FormulaFieldConfig,
  FormulaResultType,
  FormulaStrategy,
} from '@app/shared/field-system/models/formula/field.interface';
import { buildField } from '@app/shared/field-system/models/utils';
import { ReferenceFieldConfig } from '@app/shared/field-system/models/reference/field.interface';
import { AttachmentFieldConfig } from '@app/shared/field-system/models/attachment/field.interface';
import { ViewLayoutService } from './view-layout.service';

export interface TableDefinition {
  name: string;
  comment: string;
  primaryKey: { name: string; type: string };
  presentation: {
    uiName?: string;
  } | null;
  schema?: ColumnDefinition[];
}

export interface TableFormData extends Omit<TableDefinition, 'primaryKey'> {
  idType: 'integer' | 'biginteger' | 'uuid' | 'shortid';
  timestamps: boolean;
}

export interface ColumnDefinition {
  name: string;
  dataType: DataType;
  primary: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: any | null;
  comment: string | null;
  presentation: {
    uiName?: string;
    format?: any;
  } | null;
  validation: {
    minLength?: number | null;
    maxLength?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
    minDate?: string | null;
    maxDate?: string | null;
    maxSize?: number | null;
    maxFiles?: number | null;
    allowedDomains?: string | null;
  } | null;
  options: string[] | null;
  foreignKey: {
    table: string;
    column: { name: string; type: string };
    onUpdate?: string;
    onDelete?: string;
  } | null;
  formula: {
    resultType: FormulaResultType;
    expression: string;
    strategy?: FormulaStrategy;
  } | null;
  metadata: any;
}

export interface ColumnFormData extends Omit<ColumnDefinition, 'primary' | 'metadata'> {}

export interface RecordData {
  id: string | number;
  [key: string]: any;
}

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
  'geo-point': DataType.GeoPoint,
  reference: DataType.Reference,
  attachment: DataType.Attachment,
  'auto-number': DataType.AutoNumber,
  'auto-date': DataType.AutoDate,
  formula: DataType.Formula,
};

const TABLE_SELECTED_KEY = 'table_selected';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  tables = signal<TableDefinition[]>([]);
  selectedTables = signal<TableDefinition[]>([]);
  activeTable = signal<TableDefinition>(null);

  private apiUrl = `${environment.apiUrl}/rest/db`;
  private schemaCache = new Map<string, Observable<ColumnDefinition[]>>();

  constructor(
    private http: HttpClient,
    private viewLayoutService: ViewLayoutService,
  ) {
    this.selectedTables.set(JSON.parse(localStorage.getItem(TABLE_SELECTED_KEY) || '[]'));
    effect(() => {
      localStorage.setItem(TABLE_SELECTED_KEY, JSON.stringify(this.selectedTables()));
    });
  }

  selectTable(tableName: string) {
    const table = this.tables().find((t) => t.name === tableName);
    if (!table) return;

    this.selectedTables.update((tables) =>
      tables.find((t) => t.name === table.name) ? tables : [...tables, table],
    );
    this.activeTable.set(table);
  }

  removeTable(tableName: string) {
    this.selectedTables.update((tables) => [...tables.filter((t) => t.name !== tableName)]);

    let activeTable = this.activeTable();
    if (activeTable?.name === tableName) {
      this.activeTable.set(null);
      setTimeout(() => {
        activeTable = this.selectedTables().at(0);
        if (activeTable) {
          this.activeTable.set(activeTable);
        }
      }, 0);
    }

    this.viewLayoutService.remove(tableName);
  }

  getTables(includeSchema = false) {
    return this.http
      .get<ApiResponse<TableDefinition[]>>(`${this.apiUrl}/tables?includeSchema=${includeSchema}`)
      .pipe(
        map((res) => {
          const tables = res.data;
          this.tables.set(tables);
          return tables;
        }),
      );
  }

  getTableSchema(tableName: string) {
    if (!this.schemaCache.has(tableName)) {
      const request$ = this.http
        .get<ApiResponse<ColumnDefinition[]>>(`${this.apiUrl}/tables/${tableName}/schema`)
        .pipe(
          map((res) => res.data),
          shareReplay(1, 60 * 60 * 1000), // 1 hour
        );

      this.schemaCache.set(tableName, request$);
    }

    return this.schemaCache.get(tableName)!;
  }

  createTable(table: TableFormData) {
    return this.http.post<ApiResponse<TableDefinition>>(`${this.apiUrl}/tables`, table);
  }

  updateTable(tableName: string, table: Pick<TableFormData, 'name' | 'comment'>) {
    return this.http.patch<ApiResponse<TableDefinition>>(
      `${this.apiUrl}/tables/${tableName}`,
      table,
    );
  }

  deleteTable(tableName: string, casecade = false) {
    return this.http
      .delete<ApiResponse>(`${this.apiUrl}/tables/${tableName}?cascade=${casecade}`)
      .pipe(
        map((res) => {
          this.removeTable(tableName);
          return res;
        }),
      );
  }

  createColumn(tableName: string, column: ColumnFormData) {
    return this.http.post<ApiResponse<ColumnDefinition>>(
      `${this.apiUrl}/tables/${tableName}/columns`,
      column,
    );
  }

  updateColumn(
    tableName: string,
    columnName: string,
    column: ColumnFormData,
    allowPresentationSaveOnFailure = false,
  ) {
    return this.http.put<ApiResponse<ColumnDefinition>>(
      `${this.apiUrl}/tables/${tableName}/columns/${columnName}?allowPresentationSaveOnFailure=${allowPresentationSaveOnFailure}`,
      column,
    );
  }

  deleteColumn(tableName: string, columnName: string) {
    return this.http.delete(`${this.apiUrl}/tables/${tableName}/columns/${columnName}`);
  }

  getRecords(
    tableName: string,
    { fields, filter }: { fields?: string[]; filter?: Record<string, any> } = {},
  ) {
    let url = `${this.apiUrl}/${tableName}?expand=all`;
    if (fields) {
      url += `&fields=${fields.join(',')}`;
    }
    if (filter) {
      url += `&filter=${JSON.stringify(filter)}`;
    }
    return this.http.get(url).pipe(map((res) => res['data'].rows));
  }

  getRecord(tableName: string, recordId: number | string): Observable<RecordData> {
    return this.http
      .get(`${this.apiUrl}/${tableName}/${recordId}?expand=all`)
      .pipe(map((res) => res['data']));
  }

  createRecords(tableName: string, records: RecordData[]) {
    return this.http.post<ApiResponse<{ insertedCount: number; returning: RecordData[] }>>(
      `${this.apiUrl}/${tableName}/bulk-create`,
      records,
    );
  }

  updateRecords(tableName: string, recordUpdates: { id: string | number; data: RecordData }[]) {
    return this.http.patch<ApiResponse<{ updatedCount: number; returning: RecordData[] }>>(
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
        (config as IntegerFieldConfig).minValue = column.validation?.minValue;
        (config as IntegerFieldConfig).maxValue = column.validation?.maxValue;
        break;
      case DataType.Number:
        (config as NumberFieldConfig).minValue = column.validation?.minValue;
        (config as NumberFieldConfig).maxValue = column.validation?.maxValue;
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
        (config as EmailFieldConfig).allowedDomains = column.validation?.allowedDomains;
        break;
      case DataType.Url:
        break;
      case DataType.JSON:
        (config as JSONFieldConfig).maxSize = column.validation?.maxSize;
        break;
      case DataType.GeoPoint:
        break;
      case DataType.Reference:
        (config as ReferenceFieldConfig).referenceTo = column.foreignKey.table;
        (config as ReferenceFieldConfig).resources = {
          loadSchema: this.getTableSchema.bind(this),
          loadRecords: this.getRecords.bind(this),
          buildField: this.buildField.bind(this),
        };
        break;
      case DataType.Attachment:
        (config as AttachmentFieldConfig).maxFiles = column.validation?.maxFiles;
        break;
      case DataType.AutoNumber:
        break;
      case DataType.AutoDate:
        break;
      case DataType.Formula:
        (config as FormulaFieldConfig).resultType = column.formula.resultType;
        (config as FormulaFieldConfig).expression = column.formula.expression;
        (config as FormulaFieldConfig).strategy = column.formula.strategy;
        break;
    }

    return buildField(dataType, config);
  }
}
