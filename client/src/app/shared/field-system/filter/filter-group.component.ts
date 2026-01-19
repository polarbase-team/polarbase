import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { AutoFocusModule } from 'primeng/autofocus';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';

import { Field } from '../models/field.object';
import { DataType } from '../models/field.interface';
import {
  Conjunction,
  FilterGroup,
  FilterRule,
  FilterType,
  getOperatorsByDataType,
  SymOp,
} from './models';

@Component({
  selector: 'filter-group',
  templateUrl: './filter-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    InputNumberModule,
    CheckboxModule,
    DatePickerModule,
    FluidModule,
    AutoFocusModule,
    MultiSelectModule,
    TextareaModule,
  ],
})
export class FilterGroupComponent {
  group = model.required<FilterGroup>();
  isRoot = input(true);
  fields = input<Field[]>([]);

  removeGroup = output();

  protected readonly DataType = DataType;
  protected readonly SymOp = SymOp;
  protected conjunctionOptions = [
    { label: 'And', value: Conjunction.AND },
    { label: 'Or', value: Conjunction.OR },
  ];
  protected autoFocusIdx = -1;

  protected getField(fieldName: string) {
    return this.fields().find((f) => f.name === fieldName);
  }

  protected getOps(fieldName: string) {
    const field = this.fields().find((f) => f.name === fieldName);
    return field ? getOperatorsByDataType(field.dataType) : [];
  }

  protected onFieldChange(rule: FilterRule) {
    const ops = this.getOps(rule.field);
    const op = ops.find((o) => o.value === SymOp.Equal) || ops[0];
    rule.operator = op.value;
    rule.value = null;
  }

  protected onOperatorChange(rule: FilterRule) {
    rule.value = null;
  }

  protected addRule() {
    const field = this.fields()[0];
    const ops = this.getOps(field.name);
    const op = ops.find((o) => o.value === SymOp.Equal) || ops[0];

    this.group.update((group) => {
      this.autoFocusIdx =
        group.children.push({
          type: FilterType.Rule,
          field: field.name,
          operator: op.value,
          value: '',
        }) - 1;
      return { ...group };
    });
  }

  protected addGroup() {
    this.group.update((group) => {
      group.children.push({
        type: FilterType.Group,
        conjunction: Conjunction.AND,
        children: [],
      });
      return { ...group };
    });
  }

  protected removeChild(index: number) {
    this.group.update((group) => {
      group.children.splice(index, 1);
      return { ...group };
    });
  }
}
