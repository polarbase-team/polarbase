import _ from 'lodash';

import { environment } from '@environments/environment';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { NumberData, NumberFieldConfig, NumberFormat } from './field.interface';

export const formatNumber = (value: number, format?: NumberFormat, currency?: string) => {
  if (format === NumberFormat.Comma) {
    return value.toLocaleString();
  }

  if (format === NumberFormat.Percentage) {
    return `${value * 100}%`;
  }

  if (format === NumberFormat.Currency) {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: currency || environment.defaultCurrency,
    });
  }

  return value;
};

export class NumberField extends Field<NumberData> {
  static readonly dataType: DataType = DataType.Number;

  readonly dataType: DataType = DataType.Number;
  readonly icon: string = FIELD_ICON_MAP[DataType.Number];

  minValue?: number;
  maxValue?: number;

  constructor(config: NumberFieldConfig) {
    super(config);

    this.minValue = config.minValue;
    this.maxValue = config.maxValue;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (data < this.minValue) {
        errors = {
          ...errors,
          [FieldValidationKey.MinValue]: {
            field: this,
            data,
            minValue: this.minValue,
          },
        };
      }

      if (data > this.maxValue) {
        errors = {
          ...errors,
          [FieldValidationKey.MaxValue]: {
            field: this,
            data,
            maxValue: this.maxValue,
          },
        };
      }
    }

    return errors;
  }

  override convertTextToData(text: string) {
    const data: NumberData = Number(text);

    if (this.validate(data) !== null) {
      return null;
    }

    return data;
  }

  override toJson() {
    return {
      ...super.toJson(),
      minValue: this.minValue,
      maxValue: this.maxValue,
      params: JSON.parse(
        JSON.stringify({
          minValue: this.minValue,
          maxValue: this.maxValue,
        }),
      ),
    };
  }
}
