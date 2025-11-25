import { ComponentRef, Injectable } from '@angular/core';
import { startWith, Subject, takeUntil } from 'rxjs';
import _ from 'lodash';

import { DataType } from '../../field/interfaces';
import { FieldValidationErrors } from '../../field/objects';
import { FieldCell } from './field-cell';
import { TableCell } from '../../models/table-cell';
import { TableColumn } from '../../models/table-column';

function matchCell(checkCell: TableCell): boolean {
  return this.cell.row.id === checkCell.row.id && this.cell.column.id === checkCell.column.id;
}

function detectChange(): boolean {
  return (
    this.savedData !== undefined &&
    this.data !== undefined &&
    !this.cell.column.field.compareData(this.savedData, this.data)
  );
}

function flush(
  callback?: (data?: any) => void,
  errorCallback?: (errors: FieldValidationErrors | null) => void,
) {
  if (!this.detectChange()) {
    callback?.();
    return;
  }

  const { field }: TableColumn = this.cell.column;
  const errors = field.validate(this.savedData);
  if (errors !== null) {
    const unsub$: Subject<void> = new Subject<void>();
    this.validate$
      .pipe(startWith(errors), takeUntil(unsub$))
      .subscribe((errs: FieldValidationErrors | null) => {
        errorCallback?.(errs);
        if (errs !== null) return;
        unsub$.next();
        unsub$.complete();
      });
    return;
  }

  callback?.(this.savedData);
  this.data = _.cloneDeep(this.savedData);
  this.savedData = undefined;
}

function reset() {
  if (this.detectChange()) {
    this.revert$.next();
  }
  this.validate$.next(null);
  this.savedData = undefined;
}

export interface FieldCellSelectingState {
  cell: TableCell;
  data: any;
  savedData: any;
  isEditing: boolean;
  revert$: Subject<void>;
  validate$: Subject<FieldValidationErrors | null>;
  matchCell(c: TableCell): boolean;
  detectChange(): boolean;
  flush(
    callback?: (data: any) => void,
    errorCallback?: (errors: FieldValidationErrors | null) => void,
  ): void;
  reset(): void;
}

@Injectable()
export class FieldCellService {
  // Set a default cache size of 40 for caching FieldCell component reference.
  cacheSize = 40;

  // A private map to store cached component references categorized by DataType.
  private cacheStore = new Map<DataType, ComponentRef<FieldCell>[]>();

  private revert$ = new Subject<void>();
  private validate$ = new Subject<FieldValidationErrors | null>();

  // Holds the current selecting state for FieldCell components.
  private selectingState: FieldCellSelectingState;

  /**
   * Cleans up resources used by the service by completing internal observables.
   * This ensures that no further emissions or subscriptions occur on `revert$` and `validate$`.
   */
  destroy() {
    this.clear();
    this.revert$.complete();
    this.validate$.complete();
  }

  /**
   * Adds a FieldCell component reference to the cache based on its data type.
   * If the cache for the data type has reached its limit (cacheSize), the component reference is destroyed and not added.
   * @param dataType The data type key to categorize the component reference in the cache.
   * @param cmpRef The component reference to cache.
   */
  set(dataType: DataType, cmpRef: ComponentRef<FieldCell>) {
    // Get or initialize an array for the given dataType in the cache store.
    let arr = this.cacheStore.get(dataType);
    if (!arr) {
      arr = [];
      this.cacheStore.set(dataType, arr);
    }

    // If cache size is exceeded, destroy the component reference instead of caching it.
    if (arr.length > this.cacheSize) {
      cmpRef.destroy();
      return;
    }

    // Otherwise, add the component reference to the cache array for the given dataType.
    arr.push(cmpRef);
  }

  /**
   * Retrieves and removes the latest cached FieldCell component reference for a given data type.
   * If no component reference exists for the data type, returns undefined.
   * @param dataType The data type key to locate the component reference in the cache.
   * @returns The last component reference added to the cache for the given data type, or undefined if none exist.
   */
  get(dataType: DataType) {
    const arr = this.cacheStore.get(dataType);
    const cmpRef = arr?.pop();
    return cmpRef && !cmpRef.hostView.destroyed ? cmpRef : null;
  }

  /**
   * Clears the entire cache by destroying all cached component references across all data types.
   * This helps free up memory and resources when the cache is no longer needed.
   */
  clear() {
    // Iterate over each array of component references in the cache store.
    for (const compRefs of this.cacheStore.values()) {
      // Destroy each component reference in the array.
      for (const compRef of compRefs) {
        compRef.destroy();
      }
    }
  }

  /**
   * Retrieves the currently stored selecting state.
   * @returns The stored selecting state, or null if no state is set.
   */
  getSelectingState() {
    return this.selectingState;
  }

  /**
   * Stores the provided selecting state for later retrieval.
   * @param state The selecting state to store.
   */
  setSelectingState(state: FieldCellSelectingState) {
    state.revert$ = this.revert$;
    state.validate$ = this.validate$;
    state.matchCell = matchCell;
    state.detectChange = detectChange;
    state.flush = flush;
    state.reset = reset;
    this.selectingState = state;
  }

  /**
   * Clears the stored selecting state.
   * This is useful when the selecting session is completed or reset.
   */
  clearSelectingState() {
    this.selectingState = null;
  }
}
