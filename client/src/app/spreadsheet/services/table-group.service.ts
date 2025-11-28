import _ from 'lodash';
import { Injectable, signal, computed } from '@angular/core';
import { Point } from '@angular/cdk/drag-drop';
import { MenuItem } from 'primeng/api';

import { calculateBy, makeUpCalculatedData } from '../utils/calculate';
import { GroupView } from '../components/virtual-scroll/virtual-scroll-group-repeater.directive';
import { getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
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
      const { viewProps } = childGroup as GroupView;
      const gs = viewProps.rect.top;
      const ge = viewProps.rect.top + viewProps.rect.height;

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

function findGroupByItemIndex(itemIndex: number, group?: TableGroup) {
  if (group?.children) {
    let start = 0;
    let end = group.children.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const childGroup = group.children[mid];
      const { viewProps } = childGroup as GroupView;

      if (itemIndex < viewProps.startItemIndex) {
        end = mid - 1;
        continue;
      }

      if (itemIndex > viewProps.startItemIndex + childGroup.rows.length - 1) {
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

  groupDepth = computed(() => {
    return this.rootGroup().totalChildrenDepth;
  });

  isGrouping = computed(() => {
    return !!this.rootGroup();
  });

  hasNoGroups = computed(() => {
    return !this.isGrouping() || !this.rootGroup()?.children.length;
  });

  expandGroup(group: TableGroup) {
    this._expandGroup(group);
    this.markGroupAsChanged();
  }

  collapseGroup(group: TableGroup) {
    this._collapseGroup(group);
    this.markGroupAsChanged();
  }

  expandGroupRecursive(group: TableGroup) {
    this._expandGroup(group);
    if (group.children?.length) {
      for (const child of group.children) {
        this.expandGroupRecursive(child);
      }
    }
    this.markGroupAsChanged();
  }

  collapseGroupRecursive(group: TableGroup) {
    this._collapseGroup(group);
    if (group.children?.length) {
      for (const child of group.children) {
        this.collapseGroupRecursive(child);
      }
    }
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
      const data: any = {};

      let g = group;
      do {
        data[g.column.id] = g.data;
        g = g.parent;
      } while (g?.depth > 0);

      newRow = this.tableRowService.insertRow(data, position, (row) => {
        group.addRows([row], position);
        this.markGroupAsChanged();
      });
    } else {
      newRow = this.tableRowService.insertRow(undefined, position);
      this.tableService.group();
    }

    if (group.isCollapsed) {
      let g = group;
      do {
        this.collapseGroup(g);
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

  getFirstGroup() {
    let group = this.rootGroup();
    while (group.children?.length) {
      group = group.children[0];
    }
    return group;
  }

  getSelectingGroup() {
    const rowIndex = this.tableService.layoutProps.cell.selection?.primary.rowIndex;
    if (!_.isFinite(rowIndex)) return void 0;
    return this.findGroupByRowIndex(rowIndex);
  }

  getRowCellOffsetInGroup({ rowIndex, columnIndex }: CellIndex) {
    const group = this.findGroupByRowIndex(rowIndex);
    if (!group || group.depth < this.groupDepth()) return null;

    const { viewProps } = group as GroupView;
    const left = getColumnOffset(this.tableColumnService.findColumnByIndex(columnIndex));
    const top =
      viewProps.rect.top +
      Dimension.GroupHeaderHeight +
      (rowIndex - viewProps.startItemIndex) * this.tableRowService.rowHeight();

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

    const { viewProps: groupViewProps } = group as GroupView;
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

  openGroupActionMenu(e: Event) {
    const items: MenuItem[] = [
      {
        label: 'Expand all',
        icon: 'pi pi-arrow-up-right-and-arrow-down-left-from-center',
        command: () => {
          this.expandGroupRecursive(this.rootGroup());
        },
      },
      {
        label: 'Collapse all',
        icon: 'pi pi-arrow-down-left-and-arrow-up-right-to-center',
        command: () => {
          this.collapseGroupRecursive(this.rootGroup());
        },
      },
    ];
    this.host.menuItems = items;
    this.host.contextMenu.show(e);
  }

  private _expandGroup(group: TableGroup) {
    this.collapsedState.set(group.id, (group.isCollapsed = false));
  }

  private _collapseGroup(group: TableGroup) {
    this.collapsedState.set(group.id, (group.isCollapsed = true));
  }
}
