import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { IntegerData, IntegerFieldConfig } from './field.interface';

export class IntegerField extends Field<IntegerData> {
  static readonly dataType = DataType.Integer;

  readonly dataType: DataType = DataType.Integer;
  readonly icon: string = FIELD_ICON_MAP[DataType.Integer];

  min?: number;
  max?: number;

  constructor(config: IntegerFieldConfig) {
    super(config);

    this.min = config.min;
    this.max = config.max;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (data < this.min) {
        errors = {
          ...errors,
          [FieldValidationKey.Min]: {
            field: this,
            data,
            min: this.min,
          },
        };
      }

      if (data > this.max) {
        errors = {
          ...errors,
          [FieldValidationKey.Max]: {
            field: this,
            data,
            max: this.max,
          },
        };
      }
    }

    return errors;
  }

  override convertTextToData(text: string) {
    const data: IntegerData = parseInt(text);

    if (this.validate(data) !== null) {
      return null;
    }

    return data;
  }

  override toJson() {
    return {
      ...super.toJson(),
      min: this.min,
      max: this.max,
      params: JSON.parse(
        JSON.stringify({
          min: this.min,
          max: this.max,
        }),
      ),
    };
  }
}
