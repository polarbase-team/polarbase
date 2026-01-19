import { Injectable } from '@angular/core';

import { Conjunction, FilterGroup, FilterRule, FilterType, SymOp } from './models';

@Injectable()
export class FilterService {
  filterRecords(records: Record<string, any>[], query: FilterGroup) {
    return records.filter((record) => this.evaluateGroup(record, query));
  }

  private evaluateGroup(record: Record<string, any>, group: FilterGroup) {
    if (!group.children || group.children.length === 0) return true;

    return group.conjunction === Conjunction.AND
      ? group.children.every((child) => this.evaluateItem(record, child))
      : group.children.some((child) => this.evaluateItem(record, child));
  }

  private evaluateItem(record: Record<string, any>, item: FilterRule | FilterGroup) {
    return item.type === FilterType.Group
      ? this.evaluateGroup(record, item)
      : this.evaluateRule(record, item);
  }

  private evaluateRule(record: Record<string, any>, rule: FilterRule) {
    const value = record[rule.field];
    const target = rule.value;

    switch (rule.operator) {
      case SymOp.Equal:
        return value === target;
      case SymOp.NotEqual:
        return value !== target;
      case SymOp.GreaterThan:
        return value > target;
      case SymOp.GreaterEqual:
        return value >= target;
      case SymOp.LessThan:
        return value < target;
      case SymOp.LessEqual:
        return value <= target;

      case SymOp.Contains:
        return String(value || '')
          .toLowerCase()
          .includes(String(target || '').toLowerCase());

      case SymOp.Empty:
        return value === null || value === undefined || value === '';

      case SymOp.NotEmpty:
        return value !== null && value !== undefined && value !== '';

      case SymOp.In:
        return Array.isArray(target) ? target.includes(value) : false;

      case SymOp.NotIn:
        return Array.isArray(target) ? !target.includes(value) : true;

      default:
        return true;
    }
  }
}
