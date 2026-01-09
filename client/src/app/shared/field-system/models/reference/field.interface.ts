import { Observable } from 'rxjs';

import { FieldConfig } from '../field.interface';
import { Field } from '../field.object';

export type ReferenceResources<S = any, R = any> = {
  loadSchema: (...args) => Observable<S>;
  loadRecords: (...args) => Observable<R>;
  buildField: (...args) => Field;
};
export type ReferenceData = string | number;
export interface ReferenceFieldConfig extends FieldConfig<ReferenceData> {
  referenceTo: string;
  resources: ReferenceResources;
}
