import { EDataType } from '../interfaces/field.interface';
import { TField } from '../interfaces/field.interface';
import { CheckboxField } from '../objects/checkbox-field.object';
import { DateField } from '../objects/date-field.object';
import { DropdownField } from '../objects/dropdown-field.object';
import { NumberField } from '../objects/number-field.object';
import { TextField } from '../objects/text-field.object';

export type TFieldType = {
  object: TField;
  args: string[];
};

export const FIELD_TYPES: ReadonlyMap<EDataType, TFieldType> = new Map([
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
