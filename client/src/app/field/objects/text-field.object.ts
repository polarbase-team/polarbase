import _ from 'lodash';

import { ITextField, TTextData } from '../interfaces/text-field.interface';
import { EDataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class TextField extends Field<TTextData> implements ITextField {
  public static readonly dataType: EDataType = EDataType.Text;

  get dataType(): EDataType {
    return TextField.dataType;
  }

  public override convertTextToData(text: string) {
    if (this.validate(text) !== null) return;

    return text;
  }
}
