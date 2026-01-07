import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { EmailData, EmailPattern } from './field.interface';

export class EmailField extends Field<EmailData> {
  static readonly dataType: DataType = DataType.Email;

  readonly dataType: DataType = DataType.Email;
  readonly icon: string = FIELD_ICON_MAP[DataType.Email];

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (!EmailPattern.test(data)) {
        errors = {
          ...errors,
          [FieldValidationKey.Pattern]: {
            field: this,
            data,
          },
        };
      }
    }

    return errors;
  }
}
