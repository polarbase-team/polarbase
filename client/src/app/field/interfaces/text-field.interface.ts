import { IField } from './field.interface';

export type TTextData = string;

export interface ITextField extends IField<TTextData> {
  notAllowDuplicate?: boolean;
}
