import { getRecordDisplayLabel } from '@app/core/utils';
import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { ReferenceData, ReferenceFieldConfig, ReferenceResources } from './field.interface';

export const getReferenceValue = (data: ReferenceData) => {
  return typeof data === 'object' ? data?.id : data;
};

export const getReferenceDisplayLabel = (data: ReferenceData) => {
  return getRecordDisplayLabel(data as Record<string, any>);
};

export const parseReferenceData = (data: ReferenceData) => {
  const value = getReferenceValue(data);
  const displayLabel = getReferenceDisplayLabel(data);

  return { value, displayLabel };
};

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

  override toString(data: ReferenceData = this.data) {
    return String(getReferenceValue(data));
  }
}
