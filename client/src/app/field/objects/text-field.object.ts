import _ from 'lodash';

import { ITextField, TTextData } from '../interfaces/text-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class TextField extends Field<TTextData> implements ITextField {
  static readonly dataType = EDataType.Text;

  get dataType() {
    return TextField.dataType;
  }

  override convertTextToData(text: string) {
    if (this.validate(text) !== null) return;

    return text;
  }
}
