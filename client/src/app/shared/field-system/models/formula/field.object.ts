import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import {
  FormulaData,
  FormulaFieldConfig,
  FormulaResultType,
  FormulaStrategy,
} from './field.interface';

export class FormulaField extends Field<FormulaData> {
  static readonly dataType: DataType = DataType.Formula;

  readonly dataType: DataType = DataType.Formula;
  readonly icon: string = FIELD_ICON_MAP[DataType.Formula];

  resultType?: FormulaResultType;
  expression?: string;
  strategy?: FormulaStrategy;

  constructor(config: FormulaFieldConfig) {
    super(config);

    this.resultType = config.resultType;
    this.expression = config.expression;
    this.strategy = config.strategy;
  }
}
