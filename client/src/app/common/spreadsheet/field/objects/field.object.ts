import _ from 'lodash';

import { DataType, FieldConfig } from '../interfaces/field.interface';

export const FieldValidationKey = {
  Required: 'required',
  Pattern: 'pattern',
  Min: 'min',
  Max: 'max',
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

  abstract get dataType(): DataType;

  constructor(config: FieldConfig<T>) {
    this.name = config.name;
    this.data = config.data;
    this.description = config.description;
    this.required = config.required;
    this.initialData = config.initialData;
    this.params = config.params;
  }

  validate(data: T = this.data!, isAllowEmpty?: boolean): FieldValidationErrors | null {
    if (!isAllowEmpty && this.required && _.isNil(data)) {
      return { [FieldValidationKey.Required]: true };
    }
    return null;
  }

  convertTextToData(_text: string): T | undefined {
    return undefined;
  }

  compareData(source: T, destination = this.data!) {
    return _.isEqual(source, destination);
  }

  toJson() {
    return { data: _.cloneDeep(this.data) };
  }

  toString(data = this.data!) {
    return _.toString(data);
  }
}
