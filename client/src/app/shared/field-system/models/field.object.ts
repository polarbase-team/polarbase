import _ from 'lodash';

import { DataType, FieldConfig } from './field.interface';

export const FieldValidationKey = {
  Required: 'required',
  Pattern: 'pattern',
  MinLength: 'min-length',
  MaxLength: 'max-length',
  Min: 'min',
  Max: 'max',
  MaxSize: 'max-size',
  MaxFiles: 'max-files',
  Other: 'other',
} as const;
export type FieldValidationKey = (typeof FieldValidationKey)[keyof typeof FieldValidationKey];

export type FieldValidationErrors = {
  [key in FieldValidationKey]?: any;
};

export abstract class Field<T = any> {
  name: string;
  data: T | undefined;
  description: string | undefined;
  required: boolean | undefined;
  initialData: T | undefined;
  params: any;

  abstract icon: string;
  abstract dataType: DataType;

  constructor(config: FieldConfig<T>) {
    this.name = config.name;
    this.data = config.data;
    this.description = config.description;
    this.required = config.required;
    this.initialData = config.initialData;
    this.params = config.params;
  }

  validate(data: T = this.data, isAllowEmpty?: boolean): FieldValidationErrors | null {
    if (!isAllowEmpty && this.required && _.isNil(data)) {
      return { [FieldValidationKey.Required]: true };
    }
    return null;
  }

  convertTextToData(text: string): T | undefined {
    return text as T;
  }

  compareData(source: T, destination = this.data) {
    return _.isEqual(source, destination);
  }

  toJson(): any {
    return { data: _.cloneDeep(this.data) };
  }

  toString(data = this.data) {
    return _.toString(data);
  }
}
