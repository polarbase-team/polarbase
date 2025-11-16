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
    freezeIndex?: number | null;
    minResizeWidth?: number;
    arrangeable?: boolean;
    calculable?: boolean;
    creatable?: boolean;
    freezable?: boolean;
    groupable?: boolean;
    hideable?: boolean;
    manageable?: boolean;
    resizable?: boolean;
    sortable?: boolean;
    default?: Partial<Column>;
    onBeforeDelete?: (columns: Column[]) => Promise<boolean | Column[]>;
  };
  row: {
    startIndex?: number;
    // actions: Action[] | null;
    size?: RowSize;
    selectable?: boolean;
    arrangeable?: boolean;
    creatable?: boolean;
    expandable?: boolean;
    default?: Partial<Row>;
    onBeforeToggle?: (row: Row | undefined, selected: boolean) => Promise<boolean>;
    onBeforeCreate?: (row: Row, position?: number) => Promise<boolean>;
    onBeforeDuplicate?: (row: Row, sourceRow: Row, position?: number) => Promise<boolean>;
    onBeforeDelete?: (rows: Row[]) => Promise<boolean | Row[]>;
  };
  cell: {
    fillable?: boolean;
    onBeforeCut?: (clipboardData: ClipboardData<Cell>) => Promise<boolean>;
    onBeforePaste?: (clipboardData: ClipboardData<Cell>) => Promise<boolean>;
    onBeforeClear?: (matrixCell: MatrixCell) => Promise<boolean>;
    onBeforeFill?: (matrixCell: MatrixCell) => Promise<boolean>;
  };
}>;

export type LayoutProperties = Partial<{
  freezeDivider: {
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
  sideSpacing: 0,
  streamData: false,
  column: {
    freezeIndex: 0,
    minResizeWidth: 100,
    arrangeable: true,
    calculable: true,
    creatable: true,
    freezable: true,
    groupable: true,
    hideable: true,
    manageable: true,
    resizable: true,
    sortable: true,
    default: {
      width: 180,
      deletable: true,
      hidden: false,
    },
  },
  row: {
    startIndex: 0,
    size: 'M',
    selectable: true,
    arrangeable: true,
    creatable: true,
    expandable: true,
    default: {
      editable: true,
      deletable: true,
      selected: false,
    },
  },
  cell: {
    fillable: false,
  },
};
