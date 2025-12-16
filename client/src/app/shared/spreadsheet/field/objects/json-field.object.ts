import _ from 'lodash';

import { JSONData } from '../interfaces/json-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class JSONField extends Field<JSONData> {
  static readonly dataType: DataType = DataType.JSON;

  readonly dataType: DataType = DataType.JSON;
  readonly icon: string = 'icon icon-braces';

  override convertTextToData(text: string) {
    try {
      return !_.isNil(text) && text.length > 0 ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  override toString(data = this.data): string {
    return !_.isNil(data) && !_.isString(data) ? JSON.stringify(data) : '';
  }
}
