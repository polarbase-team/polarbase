import { NgModule } from '@angular/core';

import {
  IsCheckboxFieldPipe,
  IsDateFieldPipe,
  IsDropdownFieldPipe,
  IsNumberFieldPipe,
  IsTextFieldPipe,
} from './pipes';
import { CalculateTypesPipe } from './calculation';

@NgModule({
  imports: [
    IsCheckboxFieldPipe,
    IsDateFieldPipe,
    IsDropdownFieldPipe,
    IsNumberFieldPipe,
    IsTextFieldPipe,
    CalculateTypesPipe,
  ],
  exports: [
    IsCheckboxFieldPipe,
    IsDateFieldPipe,
    IsDropdownFieldPipe,
    IsNumberFieldPipe,
    IsTextFieldPipe,
    CalculateTypesPipe,
  ],
})
export class FieldModule {}
