import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { AttachmentData } from './field.interface';

export class AttachmentField extends Field<AttachmentData> {
  static readonly dataType: DataType = DataType.Attachment;

  readonly dataType: DataType = DataType.Attachment;
  readonly icon: string = FIELD_ICON_MAP[DataType.Attachment];
}
