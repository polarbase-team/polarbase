import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { GeoPointData } from './field.interface';

export const formatPoint = (data: GeoPointData) => {
  if (!data) return '';

  if (typeof data === 'object' && Number.isFinite(data.x) && Number.isFinite(data.y)) {
    return `${data.x}, ${data.y}`;
  }

  return (data as string).replace(/\(|\)/g, '');
};

export class GeoPointField extends Field<GeoPointData> {
  static readonly dataType: DataType = DataType.GeoPoint;

  readonly dataType: DataType = DataType.GeoPoint;
  readonly icon: string = FIELD_ICON_MAP[DataType.GeoPoint];

  override toString(data = this.data) {
    return formatPoint(data);
  }
}
