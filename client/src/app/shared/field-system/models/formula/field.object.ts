import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { FormulaData, FormulaFieldConfig, FormulaResultType } from './field.interface';

export class FormulaField extends Field<FormulaData> {
  static readonly dataType: DataType = DataType.Formula;

  readonly dataType: DataType = DataType.Formula;
  readonly icon: string = FIELD_ICON_MAP[DataType.Formula];

  resultType?: FormulaResultType;
  expression?: string;

  constructor(config: FormulaFieldConfig) {
    super(config);

    this.resultType = config.resultType;
    this.expression = config.expression;
  }
}
