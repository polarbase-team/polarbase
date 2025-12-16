import { LongTextData } from '../interfaces/long-text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class LongTextField extends Field<LongTextData> {
  static readonly dataType: DataType = DataType.LongText;

  readonly dataType: DataType = DataType.LongText;
  readonly icon: string = 'icon icon-text-initial';

  override convertTextToData(text: string) {
    return text;
  }
}
