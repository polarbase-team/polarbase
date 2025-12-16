import { TextData } from '../interfaces/text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class TextField extends Field<TextData> {
  static readonly dataType: DataType = DataType.Text;

  readonly dataType: DataType = DataType.Text;
  readonly icon: string = 'icon icon-case-sensitive';

  override convertTextToData(text: string) {
    return text;
  }
}
