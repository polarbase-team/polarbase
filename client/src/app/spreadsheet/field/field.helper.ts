import _ from 'lodash';

import { EDataType } from './interfaces/field.interface';
import { TField } from './interfaces/field.interface';
import { Field } from './objects/field.object';
import { CheckboxField } from './objects/checkbox-field.object';
import { DateField } from './objects/date-field.object';
import { DropdownField } from './objects/dropdown-field.object';
import { NumberField } from './objects/number-field.object';
import { TextField } from './objects/text-field.object';

export class FieldFactory {
  static readonly dictionary: ReadonlyMap<
    EDataType,
    {
      object: TField;
      args: string[];
    }
  > = new Map([
    [
      EDataType.Checkbox,
      {
        object: CheckboxField,
        args: [],
      },
    ],
    [
      EDataType.Date,
      {
        object: DateField,
        args: [],
      },
    ],
    [
      EDataType.Dropdown,
      {
        object: DropdownField,
        args: ['options'],
      },
    ],
    [
      EDataType.Number,
      {
        object: NumberField,
        args: ['allowNegative'],
      },
    ],
    [
      EDataType.Text,
      {
        object: TextField,
        args: [],
      },
    ],
  ]);

  static create(field: TField) {
    const fieldType: any = FieldFactory.dictionary.get(field.dataType);

    if (!fieldType) {
      throw new Error(`Unknown field type for dataType: ${field.dataType}`);
    }

    const params: any = field.params || {};
    const args = _.map(fieldType.args, (arg: string) => params[arg]);
    const _field: Field = new fieldType.object(field.name, undefined, ...args);
    _field.description = field.description;
    _field.required = field.required;
    _field.initialData = field.initialData || _field.initialData;
    _field.params = field;

    return _field;
  }
}
