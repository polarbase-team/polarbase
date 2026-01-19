import _ from 'lodash';

import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field, FieldValidationKey } from '../field.object';
import { GeoPointData, GeoPointPattern } from './field.interface';

export const formatPoint = (data: GeoPointData) => {
  if (!data) return '';

  if (Number.isFinite(data.x) && Number.isFinite(data.y)) {
    return `${data.x}, ${data.y}`;
  }

  return '';
};

export class GeoPointField extends Field<GeoPointData> {
  static readonly dataType: DataType = DataType.GeoPoint;

  readonly dataType: DataType = DataType.GeoPoint;
  readonly icon: string = FIELD_ICON_MAP[DataType.GeoPoint];

  override validate(data = this.data) {
    let errors = super.validate(data);

    if (!_.isNil(data)) {
      if (_.isString(data) && !GeoPointPattern.test(data)) {
        errors = {
          ...errors,
          [FieldValidationKey.Pattern]: {
            field: this,
            data,
          },
        };
      }
    }

    return errors;
  }

  override toString(data = this.data) {
    return formatPoint(data);
  }
}
