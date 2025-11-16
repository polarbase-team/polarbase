import _ from 'lodash';

import { EDataType, IField } from '../interfaces/field.interface';

export enum FieldValidationKey {
  Required = 'required',
  Pattern = 'pattern',
  Min = 'min',
  Max = 'max',
  Other = 'other',
}

export type FieldValidationErrors = {
  [key in FieldValidationKey]?: any;
};

export abstract class Field<T = any> implements IField<T> {
  name: string;
  data: T | undefined;
  description: string | undefined;
  required: boolean | undefined;
  initialData: T | undefined;
  params: any;

  abstract get dataType(): EDataType;

  constructor(
    name: string,
    data?: T,
    description?: string,
    required?: boolean,
    initialData?: T,
    params?: any
  ) {
    this.name = name;
    this.data = data;
    this.description = description;
    this.required = required;
    this.initialData = initialData;
    this.params = params;
  }

  validate(data: T = this.data!, isAllowEmpty?: boolean): FieldValidationErrors | null {
    if (!isAllowEmpty && this.required && _.isEmpty(data)) {
      return { [FieldValidationKey.Required]: true };
    }

    return null;
  }

  convertTextToData(_text: string): T | undefined {
    return undefined;
  }

  compareData(source: T, destination: T = this.data!): boolean {
    return _.isEqual(source, destination);
  }

  toJson(): any {
    return { data: _.cloneDeep(this.data) };
  }

  toString(data: T = this.data!): string {
    return _.toString(data);
  }
}
