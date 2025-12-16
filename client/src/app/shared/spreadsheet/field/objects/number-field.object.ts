import _ from 'lodash';

import { NumberData, NumberFieldConfig } from '../interfaces/number-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class NumberField extends Field<NumberData> {
  static readonly dataType: DataType = DataType.Number;

  readonly dataType: DataType = DataType.Number;
  readonly icon: string = 'icon icon-decimals-arrow-right';

  allowNegative?: boolean | undefined;

  constructor(config: NumberFieldConfig) {
    super(config);

    this.allowNegative = config.allowNegative;
  }

  override validate(data = this.data!) {
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
    const data: NumberData = Number(text);

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
        }),
      ),
    };
  }
}
