import { TextData } from '../interfaces/text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class TextField extends Field<TextData> {
  static readonly dataType = DataType.Text;

  readonly icon = 'icon icon-case-sensitive';

  get dataType() {
    return TextField.dataType;
  }

  override convertTextToData(text: string) {
    return text;
  }
}
