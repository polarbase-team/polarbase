import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { ReferenceData, ReferenceFieldConfig, ReferenceResources } from './field.interface';

export class ReferenceField extends Field<ReferenceData> {
  static readonly dataType: DataType = DataType.Reference;

  readonly dataType: DataType = DataType.Reference;
  readonly icon: string = FIELD_ICON_MAP[DataType.Reference];

  referenceTo?: string;
  resources?: ReferenceResources;

  constructor(config: ReferenceFieldConfig) {
    super(config);

    this.referenceTo = config.referenceTo;
    this.resources = config.resources;
  }
}
