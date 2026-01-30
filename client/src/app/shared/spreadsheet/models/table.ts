export const TableRowSize = {
  S: 32,
  M: 56,
  L: 92,
  XL: 128,
} as const;
export type TableRowSize = keyof typeof TableRowSize;

export interface TableConfig {
  sideSpacing?: number;
  streaming?: boolean;
  toolbar?:
    | {
        filter?: boolean;
        customize?: boolean;
        group?: boolean;
        sort?: boolean;
        rowSize?: boolean;
        search?: boolean;
      }
    | boolean;
  column?: {
    frozenCount?: number | null;
    maxFrozenRatio?: number;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    reorderable?: boolean;
    calculable?: boolean;
    addable?: boolean;
    updatable?: boolean;
    deletable?: boolean;
    freezable?: boolean;
    groupable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    sortable?: boolean;
  };
  row?: {
    size?: TableRowSize;
    selectable?: boolean;
    reorderable?: boolean;
    expandable?: boolean;
    addable?: boolean;
    insertable?: boolean;
    deletable?: boolean;
    allowSelectAll?: boolean;
  };
  cell?: {
    fillable?: boolean;
    editable?: boolean;
    clearable?: boolean;
  };
}
