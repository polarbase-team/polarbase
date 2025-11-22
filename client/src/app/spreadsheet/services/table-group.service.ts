import _ from 'lodash';
import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { Point } from '@angular/cdk/drag-drop';
import { calculateBy, calculateFieldPredicate } from '../utils/calculate';
import type { _GroupView } from '../components/virtual-scroll/virtual-scroll-group-repeater.directive';
import { Dimension } from './table.service';
import type { CellIndex } from './table-cell.service';
import { _getColumnOffset } from '../components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { FIELD_READONLY } from '../field/resources/field';
import { TableBaseService } from './table-base.service';
import { TableGroup } from '../models/table-group';
import { TableColumn } from '../models/table-column';
import { TableRow, TableRowCellData } from '../models/table-row';

function calculateInGroup(
  group: TableGroup,
  columns: TableColumn[],
  calculatePredicate?: (...args: any) => any,
) {
  if (group.metadata.calculatedResult) {
    group.metadata.calculatedResult.clear();
  } else {
    group.metadata.calculatedResult = new Map();
  }

  for (const column of columns) {
    group.metadata.calculatedResult.set(
      column.id,
      calculateBy(
        _.map(group.items, 'data'),
        column.calculateType,
        calculatePredicate?.bind(this, column.field),
        column?.field,
      ),
    );
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

function findGroupByItemIndex(itemIndex: number, group?: TableGroup) {
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

      if (itemIndex > _viewProps.startItemIndex + childGroup.items.length - 1) {
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
  collapsedGroupState = new Map<number, boolean>();
  rootGroup: TableGroup;
  disableAddRowInGroup: boolean;

  private readonly _cdRef = inject(ChangeDetectorRef);

  get groupDepth() {
    return this.tableColumnService.groupingColumns?.size;
  }

  get isGrouping() {
    return !!this.rootGroup;
  }

  get isGroupingWithoutGroup() {
    return this.isGrouping && !this.rootGroup?.children?.length;
  }

  override updateStates() {
    this.state.groupDepth = this.groupDepth;
    this.state.isGrouping = this.isGrouping;
    this.state.isGroupingWithoutGroup = this.isGroupingWithoutGroup;
  }

  protected toggleAllGroup(isCollapse: boolean, group = this.rootGroup) {
    this._toggleGroupRecursive(group, isCollapse);
    this.markGroupAsChanged();
    this._cdRef.detectChanges();
  }

  toggleGroup(group: TableGroup) {
    this._toggleGroup(group, !group.metadata.collapsed);
    this.markGroupAsChanged();
  }

  calculateInGroup(columns: TableColumn[]) {
    if (!columns?.length) return;
    calculateInGroup(this.rootGroup, columns, calculateFieldPredicate);
  }

  sortInGroup(columns: TableColumn[]) {
    if (!columns?.length) return;
    this.rootGroup.sortItem(
      this.tableColumnService.sortColumnPredicate.bind(this, columns),
      columns.length,
    );
    this.markGroupAsChanged();
  }

  unsortInGroup() {
    this.rootGroup.unsortItem();
    this.markGroupAsChanged();
  }

  createRowInGroup(group = this.getSelectingGroup() || this.getFirstGroup(), position?: number) {
    let newRow: TableRow;
    if (group !== this.rootGroup) {
      let g = group;
      const data: any = {};
      do {
        const { metadata } = g;
        data[metadata.column.id] = metadata.data;
        g = g.parent;
      } while (g?.depth > 0);
      newRow = this.tableRowService.createRow(data, position, (row: TableRow) => {
        group.addItems([row], position);
        this.markGroupAsChanged();
      });
    } else {
      newRow = this.tableRowService.createRow(undefined, position);
      this.tableService.group();
    }

    if (group.metadata.collapsed) {
      let g = group;
      do {
        this._toggleGroup(g, false);
        g = g.parent;
      } while (g);
    }
    return newRow;
  }

  deleteRowsInGroup(deletedRows: TableRow[]) {
    this.rootGroup.removeItems(deletedRows);
    this.markGroupAsChanged();
  }

  moveRowsInGroup(movedRows: TableRow[], movedIndex: number, targetGroup: TableGroup) {
    const targetGroups = [...targetGroup.findClosest(), targetGroup];
    const rowDataNeedUpdate: TableRowCellData = {};

    for (const group of targetGroups) {
      if (!group.metadata) continue;
      rowDataNeedUpdate[group.metadata.column.id] = group.metadata.data;
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

    this.rootGroup.removeItems(movedRows);
    targetGroup.items.splice(newMovedIndex, 0, ...movedRows);

    this.tableCellService.updateCellsData(movedRows, rowDataNeedUpdate);
    this.markGroupAsChanged();
  }

  protected getFirstGroup() {
    let group = this.rootGroup;
    while (group.children?.length) {
      group = group.children[0];
    }
    return group;
  }

  protected getSelectingGroup() {
    const rowIndex = this.tableService.layoutProps.cell.selection?.primary.rowIndex;
    if (!_.isFinite(rowIndex)) return null;
    return this.findGroupByRowIndex(rowIndex);
  }

  getRowCellOffsetInGroup({ rowIndex, columnIndex }: CellIndex) {
    const group = this.findGroupByRowIndex(rowIndex);
    if (!group || group.depth < this.groupDepth) return null;

    const { _viewProps } = group as _GroupView;
    const left = _getColumnOffset(this.tableColumnService.findColumnByIndex(columnIndex));
    const top =
      _viewProps.rect.top +
      Dimension.GroupHeaderHeight +
      (rowIndex - _viewProps.startItemIndex) * this.tableRowService.rowHeight;

    return { left, top };
  }

  getLastRowIndexInGroup() {
    return this.rootGroup.items.length - 1;
  }

  findGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;
    return findGroupAtPointerOffset(this.rootGroup, pointerOffsetY);
  }

  findGroupAtPointerOffset(pointerOffsetY: number) {
    return findGroupAtPointerOffset(this.rootGroup, pointerOffsetY);
  }

  findGroupByRowIndex(rowIndex: number) {
    return findGroupByItemIndex(rowIndex, this.rootGroup);
  }

  findRowInGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.host.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;

    const group = this.findGroupAtPointerOffset(pointerOffsetY);
    if (!group || group.depth < this.groupDepth) return null;

    const { _viewProps: groupViewProps } = group as _GroupView;
    const startOffset = groupViewProps.rect.top + Dimension.GroupHeaderHeight;
    const endOffset = startOffset + groupViewProps.rect.height;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) return null;

    const index = Math.floor((pointerOffsetY - startOffset) / this.tableRowService.rowHeight);

    return {
      group,
      rowIndex: index,
      rowOffset: startOffset + index * this.tableRowService.rowHeight,
    };
  }

  findRowGroupIndex(group: TableGroup, row: TableRow) {
    return _.indexOf(group.items, row);
  }

  findRowIndexInGroup(row: TableRow) {
    return _.indexOf(this.rootGroup.items, row);
  }

  findRowIndexInGroupByID(id: TableRow['id']) {
    return _.findIndex(this.rootGroup.items, { id });
  }

  findRowInGroupByIndex(index: number) {
    return this.rootGroup.items[index];
  }

  markGroupAsChanged() {
    this.rootGroup = this.rootGroup.clone();
  }

  checkCanAddRowInGroup() {
    let disableAddRowInGroup = true;
    if (this.tableColumnService.groupingColumns.size) {
      disableAddRowInGroup = _.some([...this.tableColumnService.groupingColumns.values()], (c) =>
        FIELD_READONLY.has(c.field.dataType),
      );
    }
    this.disableAddRowInGroup = disableAddRowInGroup;
  }

  sortGroupPredicate(
    groupingColumns: TableColumn[],
    currentRow: TableRow,
    rowCompared: TableRow,
    depth: number,
  ) {
    const column = groupingColumns[groupingColumns.length - depth];
    if (!column) return null;

    return this.tableColumnService.sortColumnPredicate(
      [
        {
          ...column,
          sortingType: column.groupingType,
        },
      ],
      0,
      currentRow,
      rowCompared,
    );
  }

  parseGroupMetadataPredicate(groupingColumns: TableColumn[], group: TableGroup) {
    const idx = groupingColumns.length - (group.totalChildrenDepth + 1);
    const column = groupingColumns[idx];
    let data: any;
    let parsed: string = '';
    if (column) {
      data = group.items[0]?.data?.[column.id] ?? null;
      parsed = column.field.toString(data);
    }

    return {
      column,
      data,
      parsed,
      collapsed: this.collapsedGroupState.get(group.id) ?? false,
      empty: data === undefined || data === null,
    };
  }

  private _toggleGroup(group: TableGroup, collapsed: boolean) {
    group.metadata.collapsed = collapsed;
    this.collapsedGroupState.set(group.id, group.metadata.collapsed);
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
