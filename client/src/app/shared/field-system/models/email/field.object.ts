import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { EmailData, EmailFieldConfig, EmailPattern } from './field.interface';

export class EmailField extends Field<EmailData> {
  static readonly dataType: DataType = DataType.Email;

  readonly dataType: DataType = DataType.Email;
  readonly icon: string = FIELD_ICON_MAP[DataType.Email];

  allowedDomains?: string;

  constructor(config: EmailFieldConfig) {
    super(config);

    this.allowedDomains = config.allowedDomains;
  }

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

      if (this.allowedDomains) {
        const domain = data.split('@')[1];
        const allowedDomainsArray = this.allowedDomains
          .split(',')
          .map((d) => d.trim().toLowerCase());
        if (!allowedDomainsArray.includes(domain.toLowerCase())) {
          errors = {
            ...errors,
            [FieldValidationKey.AllowedDomains]: {
              field: this,
              data,
            },
          };
        }
      }
    }

    return errors;
  }
}
