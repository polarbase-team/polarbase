import _ from 'lodash';
import { Injectable, signal, computed } from '@angular/core';
import { Point } from '@angular/cdk/drag-drop';
import { MenuItem } from 'primeng/api';

import { calculateBy, makeUpCalculatedData } from '../utils/calculate';
import { _GroupView } from '../components/virtual-scroll/virtual-scroll-group-repeater.directive';
import { _getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { Dimension } from './table.service';
import type { CellIndex } from './table-cell.service';
import { TableBaseService } from './table-base.service';
import { TableGroup } from '../models/table-group';
import { TableColumn } from '../models/table-column';
import { TableRow, TableRowCellData } from '../models/table-row';

function calculateInGroup(
  group: TableGroup,
  columns: TableColumn[],
  calculatePredicate?: (...args: any) => any,
) {
  if (group.calculatedResult) {
    group.calculatedResult.clear();
  } else {
    group.calculatedResult = new Map();
  }

  for (const column of columns) {
    const data = [];
    for (const row of group.rows) {
      data.push(makeUpCalculatedData(row.data[column.id], column.calculateType));
    }
    group.calculatedResult.set(column.id, calculateBy(data, column.calculateType));
  }

  if (!group.children) return;

  for (const childGroup of group.children) {
    calculateInGroup(childGroup, columns, calculatePredicate);
  }
}

function findGroupAtPointerOffset(group: TableGroup, pointerOffsetY: number) {
  if (group.children) {
    let start = 0;
    let end = group.children.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const childGroup = group.children[mid];
      const { _viewProps } = childGroup as _GroupView;
      const gs = _viewProps.rect.top;
      const ge = _viewProps.rect.top + _viewProps.rect.height;

      if (pointerOffsetY < gs) {
        end = mid - 1;
        continue;
      }

      if (pointerOffsetY > ge) {
        start = mid + 1;
        continue;
      }

      return findGroupAtPointerOffset(childGroup, pointerOffsetY);
    }
  }

  return group;
}

function findGroupByItemIndex(itemIndex: number, group?: TableGroup): TableGroup {
  if (group?.children) {
    let start = 0;
    let end = group.children.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const childGroup = group.children[mid];
      const { _viewProps } = childGroup as _GroupView;

      if (itemIndex < _viewProps.startItemIndex) {
        end = mid - 1;
        continue;
      }

      if (itemIndex > _viewProps.startItemIndex + childGroup.rows.length - 1) {
        start = mid + 1;
        continue;
      }

      return findGroupByItemIndex(itemIndex, childGroup) || childGroup;
    }
  }

  return group;
}

@Injectable()
export class TableGroupService extends TableBaseService {
  rootGroup = signal<TableGroup>(null);
  collapsedState = new Map<number, boolean>();
  groupActionItems: MenuItem[] | undefined;

  groupDepth = computed(() => {
    return this.rootGroup().totalChildrenDepth;
  });

  isGrouping = computed(() => {
    return !!this.rootGroup();
  });

  hasNoGroups = computed(() => {
    return !this.isGrouping() || !this.rootGroup()?.children.length;
  });

  protected toggleAllGroup(collapsed: boolean, group = this.rootGroup()) {
    this._toggleGroupRecursive(group, collapsed);
    this.markGroupAsChanged();
  }

  toggleGroup(group: TableGroup) {
    this._toggleGroup(group, !group.collapsed);
    this.markGroupAsChanged();
  }

  calculateInGroup(columns: TableColumn[]) {
    if (!columns?.length) return;
    calculateInGroup(this.rootGroup(), columns);
  }

  sortInGroup(columns: TableColumn[]) {
    if (!columns?.length) return;
    this.rootGroup().sortRows(columns);
    this.markGroupAsChanged();
  }

  unsortInGroup() {
    this.rootGroup().unsortRows();
  }

  insertRowInGroup(group = this.getSelectingGroup() || this.getFirstGroup(), position?: number) {
    let newRow: TableRow;
    if (group !== this.rootGroup()) {
      let g = group;
      const data: any = {};
      do {
        data[g.column.id] = g.data;
        g = g.parent;
      } while (g?.depth > 0);
      newRow = this.tableRowService.insertRow(data, position, (row: TableRow) => {
        group.addRows([row], position);
        this.markGroupAsChanged();
      });
    } else {
      newRow = this.tableRowService.insertRow(undefined, position);
      this.tableService.group();
    }

    if (group.collapsed) {
      let g = group;
      do {
        this._toggleGroup(g, false);
        g = g.parent;
      } while (g);
    }
    return newRow;
  }

  deleteRowsInGroup(deletedRows: TableRow[]) {
    this.rootGroup().removeRows(deletedRows);
    this.markGroupAsChanged();
  }

  moveRowsInGroup(movedRows: TableRow[], movedIndex: number, targetGroup: TableGroup) {
    const targetGroups = [...targetGroup.findClosest(), targetGroup];
    const rowDataNeedUpdate: TableRowCellData = {};

    for (const group of targetGroups) {
      if (group.column) {
        rowDataNeedUpdate[group.column.id] = group.data;
      }
    }

    let newMovedIndex = movedIndex;
    for (const movedRow of movedRows) {
      movedRow.data = {
        ...movedRow.data,
        ...rowDataNeedUpdate,
      };
      const i = this.findRowGroupIndex(targetGroup, movedRow);
      if (i < 0 || i >= movedIndex) continue;
      newMovedIndex--;
    }

    this.rootGroup().removeRows(movedRows);
    targetGroup.rows.splice(newMovedIndex, 0, ...movedRows);

    this.tableCellService.updateCellsData(movedRows, rowDataNeedUpdate);
    this.markGroupAsChanged();
  }

  protected getFirstGroup() {
    let group = this.rootGroup();
    while (group.children?.length) {
      group = group.children[0];
    }
    return group;
  }

  protected getSelectingGroup() {
    const rowIndex = this.tableService.layoutProps.cell.selection?.primary.rowIndex;
    if (!_.isFinite(rowIndex)) return void 0;
    return this.findGroupByRowIndex(rowIndex);
  }

  getRowCellOffsetInGroup({ rowIndex, columnIndex }: CellIndex) {
    const group = this.findGroupByRowIndex(rowIndex);
    if (!group || group.depth < this.groupDepth()) return null;

    const { _viewProps } = group as _GroupView;
    const left = _getColumnOffset(this.tableColumnService.findColumnByIndex(columnIndex));
    const top =
      _viewProps.rect.top +
      Dimension.GroupHeaderHeight +
      (rowIndex - _viewProps.startItemIndex) * this.tableRowService.rowHeight();

    return { left, top };
  }

  getLastRowIndexInGroup() {
    return this.rootGroup().rows.length - 1;
  }

  findGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;
    return findGroupAtPointerOffset(this.rootGroup(), pointerOffsetY);
  }

  findGroupAtPointerOffset(pointerOffsetY: number) {
    return findGroupAtPointerOffset(this.rootGroup(), pointerOffsetY);
  }

  findGroupByRowIndex(rowIndex: number) {
    return findGroupByItemIndex(rowIndex, this.rootGroup());
  }

  findRowInGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;

    const group = this.findGroupAtPointerOffset(pointerOffsetY);
    if (!group || group.depth < this.groupDepth()) return null;

    const { _viewProps: groupViewProps } = group as _GroupView;
    const startOffset = groupViewProps.rect.top + Dimension.GroupHeaderHeight;
    const endOffset = startOffset + groupViewProps.rect.height;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) return null;

    const index = Math.floor((pointerOffsetY - startOffset) / this.tableRowService.rowHeight());

    return {
      group,
      rowIndex: index,
      rowOffset: startOffset + index * this.tableRowService.rowHeight(),
    };
  }

  findRowGroupIndex(group: TableGroup, row: TableRow) {
    return _.indexOf(group.rows, row);
  }

  findRowIndexInGroup(row: TableRow) {
    return _.indexOf(this.rootGroup().rows, row);
  }

  findRowIndexInGroupByID(id: TableRow['id']) {
    return _.findIndex(this.rootGroup().rows, { id });
  }

  findRowInGroupByIndex(index: number) {
    return this.rootGroup().rows[index];
  }

  markGroupAsChanged() {
    this.rootGroup.update(() => this.rootGroup().clone());
  }

  openActionMenu(e: Event) {
    const items: MenuItem[] = [
      {
        label: 'Expand all',
        icon: 'pi pi-arrow-up-right-and-arrow-down-left-from-center',
        command: () => {
          this.toggleAllGroup(false);
        },
      },
      {
        label: 'Collapse all',
        icon: 'pi pi-arrow-down-left-and-arrow-up-right-to-center',
        command: () => {
          this.toggleAllGroup(true);
        },
      },
    ];
    this.groupActionItems = items;
    this.host.groupActionMenu.show(e);
  }

  private _toggleGroup(group: TableGroup, collapsed: boolean) {
    group.collapsed = collapsed;
    this.collapsedState.set(group.id, collapsed);
  }

  private _toggleGroupRecursive(group: TableGroup, collapsed: boolean) {
    this._toggleGroup(group, collapsed);
    if (group.children?.length) {
      for (const child of group.children) {
        this._toggleGroupRecursive(child, collapsed);
      }
    }
  }
}
