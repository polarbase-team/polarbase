import _ from 'lodash';

import { LongTextData, LongTextFieldConfig } from '../interfaces/long-text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class LongTextField extends Field<LongTextData> {
  static readonly dataType: DataType = DataType.LongText;

  readonly dataType: DataType = DataType.LongText;
  readonly icon: string = 'icon icon-text-initial';

  maxSize?: number;

  constructor(config: LongTextFieldConfig) {
    super(config);

    this.maxSize = config.maxSize;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (new Blob([data]).size > this.maxSize) {
        errors = {
          ...errors,
          [FieldValidationKey.MaxSize]: {
            field: this,
            data,
            maxSize: this.maxSize,
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
