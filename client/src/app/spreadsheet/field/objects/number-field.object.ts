import _ from 'lodash';

import { INumberField, TNumberData } from '../interfaces/number-field.interface';
import { EDataType } from '../interfaces/field.interface';

import { Field, FieldValidationErrors, FieldValidationKey } from './field.object';

export class NumberField extends Field<TNumberData> implements INumberField {
  static readonly dataType = EDataType.Number;

  allowNegative: boolean | undefined;

  get dataType() {
    return NumberField.dataType;
  }

  constructor(
    name: string,
    data?: TNumberData,
    allowNegative?: boolean,
    description?: string,
    required?: boolean,
    initialData?: TNumberData,
    params?: any
  ) {
    super(name, data, description, required, initialData, params);

    this.allowNegative = allowNegative;
  }

  override validate(data: TNumberData = this.data!) {
    let errors = super.validate(data);

    if (!this.allowNegative && _.isFinite(data) && data < 0) {
      errors = {
        ...errors,
        [FieldValidationKey.Min]: {
          field: this,
          data,
          min: 0,
        },
      };
    }

    return errors;
  }

  override convertTextToData(text: string) {
    const data: TNumberData = Number(text);

    if (!_.isFinite(data) || (!this.allowNegative && data < 0) || this.validate(data) !== null) {
      return null;
    }

    return data;
  }

  override toJson() {
    return {
      ...super.toJson(),
      allowNegative: this.allowNegative,
      params: JSON.parse(
        JSON.stringify({
          allowNegative: this.allowNegative,
        })
      ),
    };
  }
}
