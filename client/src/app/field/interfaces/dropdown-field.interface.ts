import { IField } from './field.interface';

export type TDropdownData = string;
export type TDropdownOption = string;

export interface IDropdownField extends IField<TDropdownData> {
  options?: TDropdownOption[];
}
