import { TextData } from '../interfaces/text-field.interface';
import { DataType } from '../interfaces/field.interface';
import { Field } from './field.object';

export class TextField extends Field<TextData> {
  static readonly dataType = DataType.Text;

  get dataType() {
    return TextField.dataType;
  }

  override convertTextToData(text: string) {
    if (this.validate(text) !== null) return null;

    return text;
  }
}
