import { IField } from './field.interface';

export type TNumberData = number;

export interface INumberParams {
  allowNegative?: boolean;
}

export interface INumberField extends IField<TNumberData>, INumberParams {}
