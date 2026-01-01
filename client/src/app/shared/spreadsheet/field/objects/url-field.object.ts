import _ from 'lodash';

import { UrlData, UrlPattern } from '../interfaces/url-field.interface';
import { DataType, FIELD_ICON_MAP } from '../interfaces/field.interface';
import { Field, FieldValidationKey } from './field.object';

export class UrlField extends Field<UrlData> {
  static readonly dataType: DataType = DataType.Url;

  readonly dataType: DataType = DataType.Url;
  readonly icon: string = FIELD_ICON_MAP[DataType.Url];

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (!UrlPattern.test(data)) {
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
