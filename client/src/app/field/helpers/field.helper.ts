import _ from 'lodash';

import { Field } from '../objects/field.object';
import { TField } from '../interfaces/field.interface';
import { FIELD_TYPES } from '../resources';

export class FieldHelper {
  public static instance: FieldHelper;

  public static getInstance(): FieldHelper {
    return (FieldHelper.instance ||= new FieldHelper());
  }

  public createField(field: TField) {
    const fieldType: any = FIELD_TYPES.get(field.dataType);

    if (!fieldType) return;

    const args: any[] = this._parseArgs(field);
    const _field: Field = new fieldType.object(field.name, undefined, ...args);
    _field.description = field.description;
    _field.required = field.required;
    _field.initialData = field.initialData || _field.initialData;
    _field.params = field;

    return _field;
  }

  private _parseArgs(field: TField) {
    const fieldType: any = FIELD_TYPES.get(field.dataType);
    const params: any = field.params || {};

    return _.map(fieldType.args, (arg: string) => params[arg]);
  }
}
