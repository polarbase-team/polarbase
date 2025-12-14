import { LongTextData } from '../interfaces/long-text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class LongTextField extends Field<LongTextData> {
  static readonly dataType = DataType.LongText;

  readonly icon = 'icon icon-text-initial';

  get dataType() {
    return LongTextField.dataType;
  }

  override convertTextToData(text: string) {
    return text;
  }
}
