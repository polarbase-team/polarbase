import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { JSONData, JSONFieldConfig } from './field.interface';

export class JSONField extends Field<JSONData> {
  static readonly dataType: DataType = DataType.JSON;

  readonly dataType: DataType = DataType.JSON;
  readonly icon: string = FIELD_ICON_MAP[DataType.JSON];

  maxSize?: number;

  constructor(config: JSONFieldConfig) {
    super(config);

    this.maxSize = config.maxSize;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (new Blob([JSON.stringify(data)]).size > this.maxSize) {
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
    try {
      return !_.isNil(text) && text.length > 0 ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  override toString(data = this.data) {
    return !_.isNil(data) ? JSON.stringify(data) : '';
  }
}
