import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { AttachmentData, AttachmentFieldConfig } from './field.interface';

export class AttachmentField extends Field<AttachmentData> {
  static readonly dataType: DataType = DataType.Attachment;

  readonly dataType: DataType = DataType.Attachment;
  readonly icon: string = FIELD_ICON_MAP[DataType.Attachment];

  maxFiles?: number;

  constructor(config: AttachmentFieldConfig) {
    super(config);

    this.maxFiles = config.maxFiles;
  }

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (data.length > this.maxFiles) {
        errors = {
          ...errors,
          [FieldValidationKey.MaxFiles]: {
            field: this,
            data,
            maxFiles: this.maxFiles,
          },
        };
      }
    }

    return errors;
  }

  override convertTextToData(text: string): AttachmentData | null {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  override toString(data?: AttachmentData) {
    return data ? JSON.stringify(data) : '';
  }
}
