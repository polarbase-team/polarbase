import _ from 'lodash';

import { IntegerData, IntegerFieldConfig } from '../interfaces/integer-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class IntegerField extends Field<IntegerData> {
  static readonly dataType = DataType.Integer;

  readonly icon = 'icon icon-hash';

  allowNegative: boolean | undefined;

  get dataType() {
    return IntegerField.dataType;
  }

  constructor(config: IntegerFieldConfig) {
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
    const data: IntegerData = parseInt(text);

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
