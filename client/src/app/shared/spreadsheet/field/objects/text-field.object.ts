import _ from 'lodash';

import { TextData, TextFieldConfig } from '../interfaces/text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class TextField extends Field<TextData> {
  static readonly dataType: DataType = DataType.Text;

  readonly dataType: DataType = DataType.Text;
  readonly icon: string = 'icon icon-case-sensitive';

  minLength?: number;
  maxLength?: number;

  constructor(config: TextFieldConfig) {
    super(config);

    this.minLength = config.minLength;
    this.maxLength = config.maxLength;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (data.length < this.minLength) {
        errors = {
          ...errors,
          [FieldValidationKey.MinLength]: {
            field: this,
            data,
            minLength: this.minLength,
          },
        };
      }

      if (data.length > this.maxLength) {
        errors = {
          ...errors,
          [FieldValidationKey.MaxLength]: {
            field: this,
            data,
            maxLength: this.maxLength,
          },
        };
      }
    }

    return errors;
  }

  override convertTextToData(text: string) {
    return text;
  }
}
