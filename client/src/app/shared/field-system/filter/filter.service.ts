import { Injectable } from '@angular/core';

import { Conjunction, FilterGroup, FilterRule, FilterType, SymOp } from './models';

@Injectable()
export class FilterService {
  filter<T = Record<string, any>>(
    items: T[],
    query: FilterGroup,
    valuePredicate?: (item: T, rule: FilterRule) => any,
  ) {
    return items.filter((item) => this.evaluateGroup(item, query, valuePredicate));
  }

  private evaluateGroup<T>(
    item: T,
    group: FilterGroup,
    valuePredicate?: (item: T, rule: FilterRule) => any,
  ) {
    if (!group.children || group.children.length === 0) return true;

    return group.conjunction === Conjunction.AND
      ? group.children.every((child) => this.evaluateChild(item, child, valuePredicate))
      : group.children.some((child) => this.evaluateChild(item, child, valuePredicate));
  }

  private evaluateChild<T>(
    item: T,
    child: FilterRule | FilterGroup,
    valuePredicate?: (item: T, rule: FilterRule) => any,
  ) {
    return child.type === FilterType.Group
      ? this.evaluateGroup(item, child)
      : this.evaluateRule(item, child, valuePredicate);
  }

  private evaluateRule<T>(
    item: T,
    rule: FilterRule,
    valuePredicate?: (item: T, rule: FilterRule) => any,
  ) {
    const value = valuePredicate ? valuePredicate(item, rule) : item[rule.field];
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

      case SymOp.NotContains:
        return !String(value || '')
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
