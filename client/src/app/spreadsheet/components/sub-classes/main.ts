import { ECalculateType } from '../../helpers/calculate';
import { GroupingType } from '../../helpers/group';
import { SortingType } from '../../helpers/sort';
import { ClipboardData } from '../../helpers/clipboard';
import { Cell, CellIndex, CellOffset, MatrixCell } from './cell';
import { Column } from './column';
import { Group } from './group';
import { Row, RowSize } from './row';

export const Dimension = {
  HeaderHeight: 36,
  BodyVerticalPadding: 12,
  FooterHeight: 42,
  FreezeDividerDragHandleHeight: 40,
  IndexCellWidth: 64,
  IndexCellSmallWidth: 56,
  ActionCellWidth: 56,
  BlankRowHeight: 32,
  GroupHeaderHeight: 32,
  GroupPadding: 20,
  GroupSpacing: 20,
} as const;

export type SearchInfo = {
  total: number;
  current: number;
};

// export type Action = {
//   icon: string;
//   label: { title: string; translate?: boolean };
//   color?: string;
//   disabled?: boolean;
//   hidden?: boolean;
//   support?: 'single-only' | 'multiple-only';
//   doAction?: (e: Event, rows: Row[]) => void;
// };

export type Config = Partial<{
  sideSpacing?: number;
  streamData: boolean;
  calculating: [Column | Column['id'], ECalculateType][];
  grouping: [Column | Column['id'], GroupingType][];
  sorting: [Column | Column['id'], SortingType][];
  column: {
    frozenIndex?: number | null;
    maxFrozenRatio?: number;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    arrangeable?: boolean;
    calculable?: boolean;
    creatable?: boolean;
    deletable?: boolean;
    freezable?: boolean;
    groupable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    sortable?: boolean;
  };
  row: {
    // actions: Action[] | null;
    size?: RowSize;
    selectable?: boolean;
    arrangeable?: boolean;
    expandable?: boolean;
    creatable?: boolean;
    insertable?: boolean;
    deletable?: boolean;
  };
  cell: {
    fillable?: boolean;
  };
}>;

export type LayoutProperties = Partial<{
  frozenDivider: {
    isHover?: boolean;
    isHideHeadLine?: boolean;
    dragHandleOffset?: number;
    dragging?: { index: number; offset: number };
  };
  fillHandler: {
    index?: CellIndex;
    offset?: CellOffset;
    hidden?: boolean;
  };
  column: {
    dragPlaceholderIndex?: number;
    dragPlaceholderOffset?: number;
    selection?: Set<number>;
  };
  row: {
    dragOverGroup?: Group;
    dragPlaceholderIndex?: number;
    dragPlaceholderOffset?: number;
    blankRowHover?: string;
  };
  cell: {
    focusing?: CellIndex;
    hovering?: CellIndex;
    filling?: {
      start: CellIndex;
      end: CellIndex;
      isReverse: boolean;
    };
    selection?: {
      primary: CellIndex;
      start: CellIndex;
      end: CellIndex;
      rowCount: number;
      columnCount: number;
      count: number;
    };
    searching?: {
      found: Map<Row['id'], Map<Column['id'], Cell>>;
      resultIndex: number;
    };
    invalid?: CellIndex;
  };
}>;

// type ExportExtension = 'csv' | 'xlsx';

export const DEFAULT_CONFIG: Config = {
  streamData: false,
  sideSpacing: 0,
  column: {
    frozenIndex: 0,
    maxFrozenRatio: 0.65,
    defaultWidth: 180,
    minWidth: 100,
    maxWidth: 500,
    arrangeable: true,
    calculable: true,
    creatable: true,
    deletable: true,
    freezable: true,
    groupable: true,
    hideable: true,
    resizable: true,
    sortable: true,
  },
  row: {
    size: 'M',
    selectable: true,
    arrangeable: true,
    expandable: true,
    creatable: true,
    insertable: true,
    deletable: true,
  },
  cell: {
    fillable: false,
  },
};
