import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { FormulaData, FormulaFieldConfig } from './field.interface';

export class FormulaField extends Field<FormulaData> {
  static readonly dataType: DataType = DataType.Formula;

  readonly dataType: DataType = DataType.Formula;
  readonly icon: string = FIELD_ICON_MAP[DataType.Formula];

  expression?: string;

  constructor(config: FormulaFieldConfig) {
    super(config);
    this.expression = config.expression;
  }
}
