import { Directive, input, model } from '@angular/core';

import { Field } from '@app/shared/spreadsheet/field/objects/field.object';

@Directive()
export abstract class FieldEditorComponent<F = Field, T = any> {
  field = input.required<F>();
  label = input<string | boolean>();
  placeholder = input<string>();
  data = model<T>();
  autoFocus = input(false);
  viewOnly = input(false);
}
