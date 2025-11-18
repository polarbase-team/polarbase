import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  CdkDragEnd,
  CdkDragMove,
  CdkDragStart,
  DragDropModule,
  moveItemInArray,
  Point,
} from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResizableModule, ResizeEvent } from 'angular-resizable-element';
import {
  fromEvent,
  map,
  merge,
  distinctUntilChanged,
  filter,
  Subject,
  of,
  delay,
  take,
  throttleTime,
  mergeMap,
  pairwise,
  debounceTime,
} from 'rxjs';
import dayjs, { isDayjs } from 'dayjs';
import { FORECAST } from '@formulajs/formulajs';
import { MenuItem, MessageService } from 'primeng/api';
import { Chip } from 'primeng/chip';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Checkbox } from 'primeng/checkbox';
import { ContextMenu } from 'primeng/contextmenu';
import _ from 'lodash';
import { Clipboard, ClipboardData } from '../helpers/clipboard';
import { Keyboard } from '../helpers/keyboard';
import {
  _ScrollEvent,
  VirtualScrollComponent,
} from './sub-components/virtual-scroll/virtual-scroll.component';
import { FieldCellService } from './sub-components/cells/field-cell.service';
import {
  Cell,
  CellDataEditedEvent,
  CellDataEditType,
  CellIndex,
  CellOffset,
  Direction,
  ExcludeCellState,
  MatrixCell,
  parseClipboardItemToData,
  UNCLEARABLE_DATA_TYPES,
  UNCUTABLE_DATA_TYPES,
  UNPASTEABLE_DATA_TYPES,
} from './sub-classes/cell';
import {
  calculateColumnDragPlaceholderIndex,
  calculateFreezeDividerDragPlaceholderIndex,
  Column,
  ColumnExtra,
  ColumnMovedEvent,
  UNGROUPABLE_FIELD_DATA_TYPES,
  UNSORTABLE_FIELD_DATA_TYPES,
} from './sub-classes/column';
import {
  Config,
  DEFAULT_CONFIG,
  Dimension,
  LayoutProperties,
  SearchInfo,
} from './sub-classes/main';
import {
  flushEEC,
  FoundRow,
  Row,
  RowCellData,
  RowExtra,
  RowInsertedEvent,
  RowMovedEvent,
  RowSize,
  RowSizeEnum,
} from './sub-classes/row';
import {
  calculateInGroup,
  findGroupAtPointerOffset,
  findGroupByItemIndex,
  Group,
} from './sub-classes/group';
import { VirtualScrollViewportComponent } from './sub-components/virtual-scroll/virtual-scroll-viewport.component';
import { CalculatingResultPipe } from '../pipes/calculating-result.pipe';
import {
  _GroupView,
  VirtualScrollGroupRepeaterDirective,
} from './sub-components/virtual-scroll/virtual-scroll-group-repeater.directive';
import {
  _getColumnOffset,
  VirtualScrollColumnRepeaterDirective,
} from './sub-components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { VirtualScrollRowRepeaterDirective } from './sub-components/virtual-scroll/virtual-scroll-row-repeater.directive';
import {
  VirtualScrollLeftContentWrapperComponent,
  VirtualScrollRightContentWrapperComponent,
} from './sub-components/virtual-scroll/virtual-scroll-content-wrapper.component';
import { FieldCellFactoryDirective } from './sub-components/cells/field-cell-factory.directive';
import { searchBy } from '../helpers/search';
import { EDataType } from '../field/interfaces/field.interface';
import {
  calculateBy,
  calculateFieldPredicate,
  ECalculateType,
  parseGroupFieldData,
} from '../helpers/calculate';
import { groupBy, GroupingType } from '../helpers/group';
import { EmitEventController } from '../helpers/emit-event-controller';
import {
  DateField,
  FieldValidationErrors,
  FieldValidationKey,
  NumberField,
} from '../field/objects';
import { sortBy, SortingPredicateReturnType, SortingType } from '../helpers/sort';
import { FIELD_READONLY } from '../field/resources/field';

export * from './sub-classes/cell';
export * from './sub-classes/column';
export * from './sub-classes/main';
export * from './sub-classes/row';

const stack: SpreadsheetComponent[] = [];

@Component({
  selector: 'spreadsheet',
  templateUrl: './spreadsheet.html',
  styleUrls: ['./spreadsheet.scss'],
  host: { class: 'spreadsheet' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ScrollingModule,
    ResizableModule,
    Tooltip,
    Skeleton,
    Checkbox,
    Chip,
    Toast,
    ContextMenu,
    VirtualScrollComponent,
    VirtualScrollViewportComponent,
    VirtualScrollGroupRepeaterDirective,
    VirtualScrollColumnRepeaterDirective,
    VirtualScrollRowRepeaterDirective,
    VirtualScrollLeftContentWrapperComponent,
    VirtualScrollRightContentWrapperComponent,
    FieldCellFactoryDirective,
    CalculatingResultPipe,
  ],
  providers: [MessageService, FieldCellService],
})
export class SpreadsheetComponent
  implements
    OnChanges,
    OnInit,
    AfterContentInit,
    AfterContentChecked,
    AfterViewInit,
    AfterViewChecked,
    OnDestroy
{
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly cdRef = inject(ChangeDetectorRef);
  protected readonly vcRef = inject(ViewContainerRef);
  protected readonly elementRef = inject(ElementRef);
  protected readonly renderer = inject(Renderer2);
  protected readonly ngZone = inject(NgZone);
  protected readonly toastService = inject(MessageService);
  protected readonly fieldCellService = inject(FieldCellService);
  @ViewChild(VirtualScrollComponent, { static: true })
  protected readonly virtualScroll: VirtualScrollComponent;
  @ViewChild('fillHanlder')
  protected readonly fillHander: ElementRef<HTMLElement>;
  protected isMouseHolding = false;
  protected isMouseHiding = false;
  protected isHideSummaryLabel = false;

  private _keyboard: Keyboard;
  private _clipboard: Clipboard<Cell>;
  private _scrollAnimationFrame: number;

  @HostBinding('class')
  get class() {
    return {
      'spreadsheet--right-scrolled': this.virtualScroll.scrollLeft > 0,
    };
  }

  constructor() {
    stack.push(this);

    this.destroyRef.onDestroy(() => {
      stack.splice(stack.indexOf(this), 1);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.MainClassOnChanges(changes);
    this.CellClassOnChanges(changes);
    this.ColumnClassOnChanges(changes);
    this.RowClassOnChanges(changes);
    this.GroupClassOnChanges(changes);

    this.updateStates();
  }

  ngOnInit() {
    this.MainClassOnInit();
    this.CellClassOnInit();
    this.ColumnClassOnInit();
    this.RowClassOnInit();
    this.GroupClassOnInit();

    this.updateStates();

    this.ngZone.runOutsideAngular(() =>
      Promise.resolve().then(() => {
        this._handlePointerEvents();
        this._handleKeyboardEvents();
        this._handleClipboardEvents();

        merge(this.cellSelected, this.columnSelected, this.rowSelected)
          .pipe(
            map((e) => e !== null),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((isContinue) => {
            if (!isContinue) {
              this._keyboard.pause();
              this._clipboard.pause();
              return;
            }

            this._keyboard.continue();
            this._clipboard.continue();
          });
      }),
    );
  }

  ngAfterContentInit() {
    this.MainClassAfterContentInit();
    this.CellClassAfterContentInit();
    this.ColumnClassAfterContentInit();
    this.RowClassAfterContentInit();
    this.GroupClassAfterContentInit();
  }

  ngAfterContentChecked() {
    this.MainClassAfterContentChecked();
    this.CellClassAfterContentChecked();
    this.ColumnClassAfterContentChecked();
    this.RowClassAfterContentChecked();
    this.GroupClassAfterContentChecked();
  }

  ngAfterViewInit() {
    this.MainClassAfterViewInit();
    this.CellClassAfterViewInit();
    this.ColumnClassAfterViewInit();
    this.RowClassAfterViewInit();
    this.GroupClassAfterViewInit();
  }

  ngAfterViewChecked() {
    this.MainClassAfterViewChecked();
    this.CellClassAfterViewChecked();
    this.ColumnClassAfterViewChecked();
    this.RowClassAfterViewChecked();
    this.GroupClassAfterViewChecked();
  }

  ngOnDestroy() {
    this.MainClassOnDestroy();
    this.CellClassOnDestroy();
    this.ColumnClassOnDestroy();
    this.RowClassOnDestroy();
    this.GroupClassOnDestroy();

    this.fieldCellService.destroy();

    this._keyboard.stop();
    this._clipboard.stop();
  }

  updateStates() {
    this.updateCellStates();
    this.updateColumnStates();
    this.updateRowStates();
    this.updateGroupStates();
    this.updateMainStates();
  }

  detectChanges() {
    this.cdRef.detectChanges();
  }

  markForCheck() {
    this.cdRef.markForCheck();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(e: BeforeUnloadEvent) {
    const state = this.fieldCellService.getSelectingState();

    if (state?.detectChange()) {
      e.preventDefault();

      this.deselectAllCells();
      this.deselectAllColumns();
      this.deselectAllRows();
    }
  }

  @HostListener('contextmenu', ['$event'])
  protected onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  protected onScrolling() {
    if (this._scrollAnimationFrame) {
      cancelAnimationFrame(this._scrollAnimationFrame);
    }

    this._scrollAnimationFrame = requestAnimationFrame(() => {
      if (this.layoutProperties.fillHandler.index) {
        this.updateFillHandlerPosition(undefined, true);
      }
    });
  }

  protected disableScroll = () => {
    if (this.layoutProperties.cell.invalid) return true;

    return !!this.fieldCellService.getSelectingState()?.isEditing;
  };

  private _handlePointerEvents() {
    fromEvent<PointerEvent>(document, 'pointerdown', { capture: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e1) => {
        const isRightClick = e1.button === 2;
        const shouldPause: boolean =
          !(isRightClick && (this.columnActionMenu.visible() || this.rowActionMenu.visible())) &&
          this._shouldPauseEvent(e1);
        if (shouldPause) return;

        const target = e1.target as HTMLElement;

        this._closeColumnActionMenu();
        this._closeRowActionMenu();
        // this._closeGroupActionMenu();

        if (isRightClick) {
          this.ngZone.run(() => {
            this.deselectAllCells();
            this.detectChanges();

            const el = target.closest('[cell-type]');
            const type = el?.getAttribute('cell-type');
            switch (type) {
              case 'column':
                this._openColumnActionMenu(e1);
                break;
              case 'row':
                this._openRowActionMenu(e1);
                break;
              case 'group':
                // this._openGroupActionMenu(e1);
                break;
            }
          });
          return;
        }

        const isSafe =
          target.hasAttribute('safe-area') ||
          !!target.closest('[safe-area]') ||
          !document.contains(target);

        if (!isSafe) {
          this.ngZone.run(() => {
            this.flushDraftRow();
            this.deselectAllCells();
            this.deselectAllColumns();

            this.detectChanges();
          });
          return;
        }

        let startCellIdx: CellIndex;
        let endCellIdx: CellIndex;
        let isTouchEvent: boolean;
        let delayEditCellFn: ReturnType<typeof setTimeout>;

        const isFillHandlerActive = !!this.fillHander?.nativeElement.contains(target);
        const currSelection = this.layoutProperties.cell.selection;
        const primaryCellIdxInSelection = currSelection?.primary;

        if (isFillHandlerActive) {
          startCellIdx = {
            rowIndex: Math.max(currSelection.start.rowIndex, primaryCellIdxInSelection.rowIndex),
            columnIndex: Math.min(
              currSelection.start.columnIndex,
              primaryCellIdxInSelection.columnIndex,
            ),
          };
        } else {
          startCellIdx = this.findCellByElement(target, 'row');

          if (!startCellIdx) return;

          if (primaryCellIdxInSelection) {
            if (e1.shiftKey) {
              this._selectCellsInZone(primaryCellIdxInSelection, startCellIdx);
              return;
            }

            // Prevent multiple cell selection
            // if at least one cell is being edited
            // or edit on same cell.
            if (
              primaryCellIdxInSelection.rowIndex === startCellIdx.rowIndex &&
              primaryCellIdxInSelection.columnIndex === startCellIdx.columnIndex
            ) {
              return;
            }
          }

          isTouchEvent = e1.pointerType === 'touch';

          if (isTouchEvent) {
            delayEditCellFn = setTimeout(() => {
              this._selectCellInZone(startCellIdx);
            }, 50);
          } else {
            this._selectCellInZone(startCellIdx);
          }
        }

        let currentAnimationFrame: number;

        const unlisten1 = this.renderer.listen(document, 'pointermove', (e2: PointerEvent) => {
          if (currentAnimationFrame) {
            cancelAnimationFrame(currentAnimationFrame);
          }

          currentAnimationFrame = requestAnimationFrame(() => {
            this.isMouseHolding = true;

            if (isTouchEvent) {
              const deltaX = e1.pageX - e2.pageX;
              const deltaY = e1.pageY - e2.pageY;

              if (deltaX > 1 || deltaY > 1) {
                clearTimeout(delayEditCellFn);
              }

              return;
            }

            endCellIdx = this.findCellByElement(e2.target as HTMLElement, 'row');

            if (!endCellIdx || _.isNaN(endCellIdx.rowIndex)) {
              return;
            }

            const compared = this.compareCellIndex(startCellIdx, endCellIdx);

            if (compared === 0) return;

            if (isFillHandlerActive) {
              this.ngZone.run(() => {
                endCellIdx.columnIndex = currSelection.end.columnIndex;

                const isReverse = compared === 1;

                let start: CellIndex;
                let end: CellIndex;

                if (isReverse) {
                  start = {
                    rowIndex: endCellIdx.rowIndex,
                    columnIndex: currSelection.start.columnIndex,
                  };
                  end = {
                    rowIndex: currSelection.start.rowIndex - 1,
                    columnIndex: currSelection.end.columnIndex,
                  };
                } else {
                  start = {
                    rowIndex: currSelection.end.rowIndex + 1,
                    columnIndex: currSelection.start.columnIndex,
                  };
                  end = {
                    rowIndex: endCellIdx.rowIndex,
                    columnIndex: currSelection.end.columnIndex,
                  };
                }

                this.layoutProperties.cell.filling = {
                  start,
                  end,
                  isReverse,
                };

                this.detectChanges();
              });
            } else {
              this._selectCellsInZone(startCellIdx, endCellIdx, true);
            }
          });
        });

        const unlisten2 = this.renderer.listen(document, 'pointerup', () => {
          unlisten1();
          unlisten2();

          this.isMouseHolding = false;

          if (isFillHandlerActive) {
            const cellFilling = this.layoutProperties.cell.filling;

            cellFilling.isReverse
              ? this._selectCellsInZone(cellFilling.start, currSelection.end, true)
              : this._selectCellsInZone(currSelection.start, cellFilling.end, true);

            this.fillCells(
              [currSelection.start, currSelection.end],
              [cellFilling.start, cellFilling.end],
              cellFilling.isReverse,
            );

            this.layoutProperties.cell.filling = null;

            this.detectChanges();
          }
        });
      });
  }

  private _handleKeyboardEvents() {
    this._keyboard = new Keyboard({
      pause: true,
      shouldPause: (e) =>
        this._shouldPauseEvent(e, (shouldPause) => {
          return shouldPause && (e.code !== 'Escape' || !this.layoutProperties.cell.invalid);
        }),
    });

    let unlisten: () => void;
    let currentAnimationFrame: number;

    const processAfterKeyMatch = (fn: () => void) => {
      this.isMouseHiding = true;

      unlisten ||= this.renderer.listen(document, 'mousemove', () => {
        unlisten();

        unlisten = null;

        this.isMouseHiding = false;
      });

      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame);
      }

      currentAnimationFrame = requestAnimationFrame(() => {
        this.ngZone.run(() => {
          fn();

          this.detectChanges();
        });
      });
    };

    this._keyboard.keydown$
      .pipe(
        filter((e) => !e.isComposing),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const key = Keyboard.parseKeyCombination(e, true);

        let isKeyMatched = true;

        switch (key) {
          case 'ArrowUp':
            processAfterKeyMatch(() => {
              this.moveToCell('above');
            });
            break;
          case 'Shift.ArrowUp':
            processAfterKeyMatch(() => {
              this.extendSelectedCells('above');
            });
            break;
          case 'ArrowDown':
          case 'Enter':
            processAfterKeyMatch(() => {
              this.moveToCell('below');
            });
            break;
          case 'Shift.ArrowDown':
            processAfterKeyMatch(() => {
              this.extendSelectedCells('below');
            });
            break;
          case 'ArrowLeft':
          case 'Shift.Tab':
            processAfterKeyMatch(() => {
              this.moveToCell('before');
            });
            break;
          case 'Shift.ArrowLeft':
            processAfterKeyMatch(() => {
              this.extendSelectedCells('before');
            });
            break;
          case 'ArrowRight':
          case 'Tab':
            processAfterKeyMatch(() => {
              this.moveToCell('after');
            });
            break;
          case 'Shift.ArrowRight':
            processAfterKeyMatch(() => {
              this.extendSelectedCells('after');
            });
            break;
          case 'Shift.Enter':
            processAfterKeyMatch(() => {
              this.addRow();
            });
            break;
          case 'Backspace':
          case 'Delete':
            processAfterKeyMatch(() => {
              this.clearInteractiveCells();
            });
            break;
          case 'Space':
            processAfterKeyMatch(() => {
              this.expandSelectingRow();
            });
            break;
          case 'Escape':
            processAfterKeyMatch(() => {
              this.revertSelectingCellState();
            });
            break;
          case 'Cmd.KeyA':
            processAfterKeyMatch(() => {
              this.deselectAllCells();
              this.deselectAllColumns();
              this.selectAllRows();
            });
            break;
          default:
            isKeyMatched = false;
        }

        if (!isKeyMatched) return;

        e.preventDefault();
      });

    this._keyboard.keyup$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isMouseHiding = false;
    });
  }

  private _handleClipboardEvents() {
    this._clipboard = new Clipboard({
      pause: true,
      shouldPause: (e) => this._shouldPauseEvent(e),
    });

    this._clipboard.copy$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.ngZone.run(() => {
        this.copyInteractiveCells(this._clipboard);
      });
    });

    this._clipboard.cut$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.ngZone.run(() => {
        this.cutCells(data);
      });
    });

    this._clipboard.paste$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.ngZone.run(() => {
        this.pasteCells(data);

        this.markForCheck();
      });
    });
  }

  private _selectCellInZone(index: CellIndex) {
    if (
      this.layoutProperties.cell.selection &&
      this.compareCellIndex(this.layoutProperties.cell.selection.primary, index) === 0
    ) {
      return;
    }

    this.ngZone.run(() => {
      this.selectCells(index, index, true);

      this.detectChanges();
    });
  }

  private _selectCellsInZone(startIdx: CellIndex, endIdx: CellIndex, extend: boolean = false) {
    if (
      this.layoutProperties.cell.selection &&
      this.compareCellIndex(this.layoutProperties.cell.selection.start, startIdx) === 0 &&
      this.compareCellIndex(this.layoutProperties.cell.selection.end, endIdx) === 0
    ) {
      return;
    }

    this.ngZone.run(() => {
      this.selectCells(startIdx, endIdx, false, extend);

      this.detectChanges();
    });
  }

  private _shouldPauseEvent(e: Event, customizer?: (shouldPause: boolean) => boolean): boolean {
    let shouldPause =
      !!this.layoutProperties.cell.invalid ||
      this._checkOverlapedByOtherSpreadsheet() ||
      this._checkOverlapedByOverlay(e.target);

    if (_.isFunction(customizer)) {
      shouldPause = customizer(shouldPause);
    }

    return shouldPause;
  }

  private _checkOverlapedByOtherSpreadsheet(): boolean {
    return stack[stack.length - 1] !== this;
  }

  private _checkOverlapedByOverlay(target?: EventTarget): boolean {
    let isOverlaped: boolean;
    if (target) {
      isOverlaped = !!(target as HTMLElement).closest('.ng-trigger-overlayAnimation');
    }
    return isOverlaped;
  }

  private _openColumnActionMenu(e: MouseEvent) {
    if (this.columnActionMenu.visible()) return;

    const index = this.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { columnIndex } = index;
    const column = this.findColumnByIndex(columnIndex);
    this.openColumnActionMenu(e, column, columnIndex);
  }

  private _closeColumnActionMenu() {
    if (!this.columnActionMenu.visible()) return;

    this.columnActionMenu.hide();
  }

  private _openRowActionMenu(e: MouseEvent) {
    if (this.rowActionMenu.visible()) return;

    const index = this.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { rowIndex } = index;
    const row = this.findRowByIndex(rowIndex);

    if (row && !row.selected) {
      this._selectCellInZone(index);
    }

    if (this.isMouseHolding || this.checkRowIsDraft(row)) {
      return;
    }

    let group: Group;
    let rowGroupIndex: number;

    if (this.isGrouping) {
      group = this.findGroupByRowIndex(rowIndex);
      rowGroupIndex = this.findRowGroupIndex(group, row);
    }

    this.openRowActionMenu(e, row, rowIndex);
  }

  private _closeRowActionMenu() {
    if (!this.rowActionMenu.visible()) return;

    this.rowActionMenu.hide();
  }

  // private _openGroupActionMenu(e: MouseEvent) {
  //   if (this.groupActionMenu.isOpened) return;
  //
  //   this.menuService.open(e.target as HTMLElement, this.groupActionMenu, undefined, {
  //     type: MenuType.ContextMenu,
  //     offsetX: e.pageX,
  //     offsetY: e.pageY,
  //     viewContainerRef: this.vcRef,
  //   });
  // }
  //
  // private _closeGroupActionMenu() {
  //   if (!this.groupActionMenu.isOpened) return;
  //
  //   this.groupActionMenu.close();
  // }

  /* MAIN CLASS */
  @Input() config: Config;
  @Input() context: any;
  streamData$: Subject<Row[]>;

  @Output() searching = new EventEmitter<SearchInfo>();

  protected readonly Dimension = Dimension;
  protected readonly state: any = {};
  protected readonly layoutProperties: LayoutProperties = {
    frozenDivider: {},
    fillHandler: {},
    column: {},
    row: {},
    cell: {},
  };
  protected isDataStreaming: boolean;
  protected searchResult: [Row, Column][];
  protected calculatedResult: Map<Column['id'], any>;

  get shouldCalculate() {
    return !!this.config.calculating || this.calculatingColumns.size > 0;
  }

  get shouldGroup() {
    return !!this.config.grouping || this.groupingColumns.size > 0;
  }

  get shouldSort() {
    return !!this.config.sorting || this.sortingColumns.size > 0;
  }

  get actionBoxOffset() {
    return (this.config.column.calculable ? Dimension.FooterHeight : 0) + 16;
  }

  get searchInfo(): SearchInfo {
    const total = this.searchResult?.length || 0;
    const { searching } = this.layoutProperties.cell;
    const current = total > 0 ? searching?.resultIndex + 1 : 0;

    return { current, total };
  }

  get selectedRowsArr(): Row[] {
    return [...this.selectedRows];
  }

  MainClassOnChanges(changes: SimpleChanges) {
    if ('config' in changes) {
      this.config = _.defaultsDeep(this.config, DEFAULT_CONFIG);
      this.isDataStreaming ??= this.config.streamData;
    }
  }
  MainClassOnInit() {
    if (!this.isDataStreaming) return;

    this.streamData$ = new Subject();

    this.ngZone.runOutsideAngular(() => {
      this.streamData$
        .pipe(
          throttleTime(200),
          mergeMap((rows) => of(rows)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (rows) => {
            this.markRowsAsStreamed(rows);
            this.detectChanges();
          },
          error: () => {
            throw new Error('Stream error');
          },
          complete: () => {
            this.isDataStreaming = false;
            this.handleDataUpdate();
            this.detectChanges();
          },
        });
    });
  }
  MainClassAfterContentInit() {}
  MainClassAfterContentChecked() {}
  MainClassAfterViewInit() {}
  MainClassAfterViewChecked() {}
  MainClassOnDestroy() {}

  updateMainStates() {
    this.state.actionBoxOffset = this.actionBoxOffset;
  }

  handleDataUpdate = _.throttle(function () {
    if (this.isDataStreaming) return;

    if (this.shouldGroup) {
      this.group();
    } else {
      this.sort();
      this.calculate();
    }

    // Flushes the selecting state if the selecting row has been rearranged or changed.
    // Ensures that the current selecting cell state is consistent with the actual layout.
    const currSelection = this.layoutProperties.cell.selection;
    if (!currSelection?.primary) return;

    const state = this.fieldCellService.getSelectingState();
    if (!state?.detectChange()) return;

    const cell = this.findCellByIndex(currSelection.primary);
    if (cell && this.compareCell(cell, state.cell)) return;

    this.flushSelectingCellState();
  }, 1000);

  search(searchQuery: string) {
    let searchResult: [Row, Column][];
    let searching;
    let focusing;

    if (searchQuery) {
      const data: [Row, Column][] = [];

      const searchColumns = _.filter(this.displayingColumns, (c) =>
        _.includes([EDataType.Text, EDataType.Date, EDataType.Number], c.field.dataType),
      );

      for (const row of this.rows) {
        for (const column of searchColumns) {
          data.push([row, column]);
        }
      }

      searchResult = searchBy(data, searchQuery, this.searchCellPredicate.bind(this));

      if (searchResult.length) {
        const found = new Map();
        let focusingRowIndex;
        let focusingColumnIndex;

        for (let i = 0; i < searchResult.length; i++) {
          const [row, column] = searchResult[i];
          const rowID = row.id;
          const columnID = column.id;
          const m = found.get(rowID) || new Map();

          m.set(columnID, { row, column });

          found.set(rowID, m);

          if (i > 0) continue;

          focusingRowIndex = this.findRowIndex(row);
          focusingColumnIndex = this.findColumnIndex(column);
        }

        searching = { found, resultIndex: 0 };

        focusing = {
          rowIndex: focusingRowIndex,
          columnIndex: focusingColumnIndex,
        };
      }
    }

    this.searchResult = searchResult;
    this.layoutProperties.cell.searching = searching;
    this.layoutProperties.cell.focusing = focusing;

    if (focusing) {
      this.scrollToFocusingCell();
    }

    this.markForCheck();
  }

  searchPrevious(previousIndex: number) {
    const searchResult = this.searchResult[previousIndex];
    if (!searchResult) return;
    const [row, column] = searchResult;

    this.layoutProperties.cell.searching.resultIndex = previousIndex;

    this.layoutProperties.cell.focusing = {
      rowIndex: this.findRowIndex(row),
      columnIndex: this.findColumnIndex(column),
    };

    this.scrollToFocusingCell();
    this.markForCheck();
  }

  searchNext(nextIndex: number) {
    const searchResult = this.searchResult[nextIndex];
    if (!searchResult) return;
    const [row, column] = searchResult;

    this.layoutProperties.cell.searching.resultIndex = nextIndex;

    this.layoutProperties.cell.focusing = {
      rowIndex: this.findRowIndex(row),
      columnIndex: this.findColumnIndex(column),
    };

    this.scrollToFocusingCell();
    this.markForCheck();
  }

  calculate(columns?: Column[]) {
    if (columns) {
      this.calculatingColumns.clear();
      for (const column of columns) {
        if (!column.calculateType) continue;
        this.calculatingColumns.set(column.id, column);
      }
    } else if (this.calculatingColumns.size) {
      columns = [...this.calculatingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.isGrouping) {
      this.calculateInGroup(columns);
      this.calculatedResult = this.rootGroup.metadata.calculatedResult;
    } else {
      if (this.calculatedResult) {
        this.calculatedResult.clear();
      } else {
        this.calculatedResult = new Map();
      }

      for (const column of columns) {
        this.calculatedResult.set(
          column.id,
          calculateBy(
            _.map(this.rows, 'data'),
            column.calculateType,
            calculateFieldPredicate.bind(this, column.field),
            column?.field,
          ),
        );
      }
    }

    this.markForCheck();
  }

  uncalculate() {
    for (const column of this.calculatingColumns.values()) {
      delete column.calculateType;
    }

    this.calculatingColumns.clear();
    this.calculatedResult.clear();

    this.markForCheck();
  }

  group(columns?: Column[]) {
    if (columns) {
      this.groupingColumns.clear();
      this.collapsedGroupState.clear();

      for (const column of columns) {
        this.groupingColumns.set(column.id, column);
      }
    } else if (this.groupingColumns.size) {
      columns = [...this.groupingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    this.rootGroup = groupBy(
      this.rows,
      this.groupColumnPredicate.bind(this, columns),
      this.sortGroupPredicate.bind(this, columns),
      this.parseGroupMetadataPredicate.bind(this, columns),
      this.groupDepth,
    );

    this.sort();
    this.calculate();

    this.checkCanAddRowInGroup();
    this.updateStates();
    this.markForCheck();
  }

  ungroup() {
    this.rootGroup = null;

    for (const column of this.groupingColumns.values()) {
      delete column.groupingType;
    }

    this.groupingColumns.clear();
    this.collapsedGroupState.clear();

    this.disableAddRowInGroup = false;

    this.updateStates();
    this.markForCheck();
  }

  sort(columns?: Column[]) {
    if (columns) {
      this.sortingColumns.clear();

      for (const column of columns) {
        this.sortingColumns.set(column.id, column);
      }
    } else if (this.sortingColumns.size) {
      columns = [...this.sortingColumns.values()];
    }

    if (this.isDataStreaming || !columns?.length) {
      return;
    }

    if (this.isGrouping) {
      this.sortInGroup(columns);
    } else {
      this.bkRows ||= [...this.rows];
      this.rows = sortBy(
        this.rawRows,
        this.sortColumnPredicate.bind(this, columns),
        columns.length,
      );
    }

    this.updateStates();
    this.markForCheck();
  }

  unsort() {
    for (const column of this.sortingColumns.values()) {
      delete column.sortingType;
    }

    this.sortingColumns.clear();

    if (this.isGrouping) {
      this.unsortInGroup();
    } else {
      this.rows = _.chain(this.bkRows)
        .without(..._.difference(this.bkRows, this.rows))
        .concat(..._.difference(this.rows, this.bkRows))
        .value();
      this.bkRows = null;
    }

    this.markForCheck();
  }

  protected updateFillHandlerPosition(
    index: CellIndex = this.layoutProperties.cell.selection.end,
    shouldRetryOnMissingCell?: boolean,
  ) {
    const ele = this.findCellElementByIndex(index);

    if (!ele) {
      this.layoutProperties.fillHandler.hidden = true;

      if (shouldRetryOnMissingCell) {
        of([1, 2, 3])
          .pipe(delay(500), take(1))
          .subscribe(() => {
            this.updateFillHandlerPosition(index);
          });
      }

      return;
    }

    const eleDOMRect = ele.getBoundingClientRect();
    const containerDOMRect = this.elementRef.nativeElement.getBoundingClientRect();
    const offset: CellOffset = {
      left: eleDOMRect.width + eleDOMRect.left - containerDOMRect.left,
      top:
        eleDOMRect.height +
        eleDOMRect.top -
        containerDOMRect.top +
        Dimension.BodyVerticalPadding / 2 -
        Dimension.FooterHeight,
    };

    this.layoutProperties.fillHandler.index = index;
    this.layoutProperties.fillHandler.offset = offset;
    this.layoutProperties.fillHandler.hidden = false;

    this.detectChanges();
  }
  /* MAIN CLASS */

  /* COLUMN CLASS */
  @Input() columns: Column[];

  @Output() columnsChange = new EventEmitter<Column[]>();
  @Output() columnCalculated = new EventEmitter<Column>();
  @Output() columnCleared = new EventEmitter<Column>();
  @Output() columnDeleted = new EventEmitter<Column[]>();
  @Output() columnFreezed = new EventEmitter<number>();
  @Output() columnGrouped = new EventEmitter<Column>();
  @Output() columnHidden = new EventEmitter<Column[]>();
  @Output() columnMoved = new EventEmitter<ColumnMovedEvent>();
  @Output() columnResized = new EventEmitter<Column>();
  @Output() columnSelected = new EventEmitter<Column[] | null>();
  @Output() columnSorted = new EventEmitter<Column>();
  @Output() columnUncalculated = new EventEmitter<Column>();
  @Output() columnUngrouped = new EventEmitter<Column>();
  @Output() columnUnhidden = new EventEmitter<Column>();
  @Output() columnUnsorted = new EventEmitter<Column>();

  @ViewChild('columnActionMenu', { static: true })
  protected readonly columnActionMenu: ContextMenu;
  protected columnActionItems: MenuItem[] | undefined;
  protected leftColumns: Column[];
  protected rightColumns: Column[];
  protected calculatingColumns = new Map<Column['id'], Column>();
  protected groupingColumns = new Map<Column['id'], Column>();
  protected sortingColumns = new Map<Column['id'], Column>();

  private _displayingColumns: Column[];
  private _columnLookup: Map<Column['id'], Column>;

  get frozenIndex(): number {
    let frozenIndex = this.config.column.frozenIndex;
    if (this.displayingColumns && frozenIndex > this.displayingColumns.length - 1) {
      frozenIndex = this.displayingColumns.length - 1;
    }
    return frozenIndex;
  }

  get displayingColumns(): Column[] {
    return this._displayingColumns;
  }
  set displayingColumns(columns: Column[]) {
    this._displayingColumns = columns;
    this.leftColumns = columns.slice(0, this.frozenIndex + 1);
    this.rightColumns = columns.slice(this.frozenIndex + 1);
  }

  get canHideSelectedColumns(): boolean {
    return true;
  }

  get canDeleteSelectedColumns(): boolean {
    return !_.find(this.getSelectedColumns(), (column) => !column.deletable);
  }

  ColumnClassOnChanges(changes: SimpleChanges) {
    if ('config' in changes && changes['config'].isFirstChange) {
      if (this.config.calculating) {
        for (const [c, t] of this.config.calculating) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as Column);
          if (!column) continue;
          column.calculateType = t;
          this.calculatingColumns.set(column.id, column);
        }
      }
      if (this.config.grouping) {
        for (const [c, t] of this.config.grouping) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as Column);
          if (!column) continue;
          column.groupingType = t;
          this.groupingColumns.set(column.id, column);
        }
      }
      if (this.config.sorting) {
        for (const [c, t] of this.config.sorting) {
          const column = _.isString(c) ? this.findColumnByID(c) : (c as Column);
          if (!column) continue;
          column.sortingType = t;
          this.sortingColumns.set(column.id, column);
        }
      }
    }
    if ('columns' in changes) {
      this.updateColumns(this.columns);
    }
  }
  ColumnClassOnInit() {}
  ColumnClassAfterContentInit() {}
  ColumnClassAfterContentChecked() {}
  ColumnClassAfterViewInit() {}
  ColumnClassAfterViewChecked() {}
  ColumnClassOnDestroy() {}

  updateColumnStates() {
    this.state.frozenIndex = this.frozenIndex;
    this.state.displayingColumns = this.displayingColumns;
    this.state.canHideSelectedColumns = this.canHideSelectedColumns;
    this.state.canDeleteSelectedColumns = this.canDeleteSelectedColumns;
  }

  pushColumns(columns: Column[]) {
    const newColumns = _.filter(columns, (column) => this.findColumnIndex(column) === -1);
    if (!newColumns.length) return;
    if (!this.columns) {
      this.columnsChange.emit((this.columns = []));
    }
    for (const newColumn of newColumns) {
      this.columns.push(newColumn);
    }
    this.updateColumns(columns);
  }

  updateColumns(columns: Column[]) {
    if (!columns) return;
    const displayingColumns = new Set(this.displayingColumns);
    let shouldUpdateDisplayingColumns: boolean;
    this._columnLookup ||= new Map();
    for (const column of columns) {
      if (!this._columnLookup.has(column.id)) {
        column.id ||= _.uniqueId();
        column.width ||= this.config.column.defaultWidth;
        this._columnLookup.set(column.id, column);
      }
      const isColumnDisplaying = displayingColumns.has(column);
      shouldUpdateDisplayingColumns ||=
        (column.hidden && isColumnDisplaying) || (!column.hidden && !isColumnDisplaying);
    }
    if (shouldUpdateDisplayingColumns) {
      this.markDisplayingColumnsAsChanged(_.filter(this.columns, (c) => !c.hidden));
    }
    this.markForCheck();
  }

  getGroupableColumns(includeColumn?: Column): Column[] {
    return _.filter(
      this.columns,
      (column) =>
        !UNGROUPABLE_FIELD_DATA_TYPES.has(column.field.dataType) &&
        (includeColumn === column || !this.groupingColumns.has(column.id)),
    );
  }

  getSortableColumns(includeColumn?: Column): Column[] {
    return _.filter(
      this.columns,
      (column) =>
        !UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType) &&
        (includeColumn === column || !this.sortingColumns.has(column.id)),
    );
  }

  setColumnWidth(column: Column, width: number) {
    if (!column) return;
    column.width = width;
    this.markForCheck();
  }

  moveColumn(column: Column, newIndex: number) {
    const currentIndex = this.findColumnRawIndex(column);
    moveItemInArray(this.columns, currentIndex, newIndex);
    if (column.hidden) return;
    this.markDisplayingColumnsAsChanged(_.filter(this.columns, (c) => !c.hidden));
    this.markForCheck();
  }

  hideColumn(column: Column, isEmitOutput?: boolean) {
    if (!column) return;
    column.hidden = true;
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, column));
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnHidden.emit([column]);
  }

  unhideColumn(column: Column, isEmitOutput?: boolean) {
    if (!column) return;
    column.hidden = false;
    this.markDisplayingColumnsAsChanged(_.filter(this.columns, (c) => !c.hidden));
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnUnhidden.emit(column);
  }

  calculateByColumn(column: Column, calculateType: ECalculateType, isEmitOutput?: boolean) {
    if (!column || !calculateType || column.calculateType === calculateType) return;
    column.calculateType = calculateType;
    this.calculatingColumns.set(column.id, column);
    this.calculate();
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnCalculated.emit(column);
  }

  uncalculateByColumn(column: Column, isEmitOutput?: boolean) {
    if (!column || !this.calculatingColumns.has(column.id)) return;
    delete column.calculateType;
    this.calculatingColumns.delete(column.id);
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnUncalculated.emit(column);
  }

  groupByColumn(
    column: Column,
    groupingType: GroupingType = 'asc',
    replaceColumn?: Column,
    isEmitOutput?: boolean,
  ) {
    if (!column?.id || !groupingType || column.groupingType === groupingType) return;
    column.groupingType = groupingType;
    if (replaceColumn) {
      delete replaceColumn.groupingType;
      const groupingColumns = new Map<Column['id'], Column>();
      for (const [key, value] of this.groupingColumns) {
        if (key === replaceColumn.id) {
          groupingColumns.set(column.id, column);
          continue;
        }
        groupingColumns.set(key, value);
      }
      this.groupingColumns = groupingColumns;
    } else {
      this.groupingColumns.set(column.id, column);
    }
    this.group();
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnGrouped.emit(column);
  }

  ungroupByColumn(column: Column, isEmitOutput?: boolean) {
    if (!column?.id || !this.groupingColumns.has(column.id)) return;
    delete column.groupingType;
    this.groupingColumns.delete(column.id);
    this.groupingColumns.size ? this.group() : this.ungroup();
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnUngrouped.emit(column);
  }

  sortByColumn(
    column: Column,
    sortingType: SortingType = 'asc',
    replaceColumn?: Column,
    isEmitOutput?: boolean,
  ) {
    if (!column?.id || !sortingType || column.sortingType === sortingType) return;
    column.sortingType = sortingType;
    if (replaceColumn) {
      delete replaceColumn.sortingType;
      const sortingColumns = new Map<Column['id'], Column>();
      for (const [key, value] of this.sortingColumns) {
        if (key === replaceColumn.id) {
          sortingColumns.set(column.id, column);
          continue;
        }
        sortingColumns.set(key, value);
      }
      this.sortingColumns = sortingColumns;
    } else {
      this.sortingColumns.set(column.id, column);
    }
    this.sort();
    this.markForCheck();
    if (!isEmitOutput) return;
    this.columnSorted.emit(column);
  }

  unsortByColumn(column: Column, isEmitOutput?: boolean) {
    if (!column?.id || !this.sortingColumns.has(column.id)) return;
    delete column.sortingType;
    this.sortingColumns.delete(column.id);
    this.markForCheck();
    this.sortingColumns.size ? this.sort() : this.unsort();
    if (!isEmitOutput) return;
    this.columnUnsorted.emit(column);
  }

  clearColumn(column: Column) {
    for (const row of this.rows) {
      row.data ||= {};
      row.data[column.id] = null;
    }
    if (this.shouldGroup) {
      if (column.groupingType) {
        this.group();
      }
    } else {
      if (column.calculateType) {
        this.calculate();
      }
      if (column.sortingType) {
        this.sort();
      }
    }
    this.columnCleared.emit(column);
  }

  protected openColumnActionMenu(e: Event, column: Column, columnIndex: number) {
    const items: MenuItem[] = [];

    if (this.layoutProperties.column.selection?.size > 1) {
      items.push(
        {
          label: 'Hide selected columns',
          icon: 'pi pi-eye-slash',
          command: () => {
            this.hideSelectedColumns();
          },
        },
        {
          label: 'Delete selected columns',
          icon: 'pi pi-trash',
          command: () => {
            this.deleteSelectedColumns();
          },
        },
      );
    } else {
      if (this.config.column.freezable) {
        items.push({
          label: 'Freeze',
          icon: 'pi pi-sign-in',
          command: () => {
            this.freezeUpToColumnIndex(columnIndex);
          },
        });
      }
      if (this.config.column.sortable) {
        items.push(
          { separator: true },
          {
            label: 'Sort up',
            icon: 'pi pi-sort-amount-up',
            disabled: UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.sortByColumn(column, 'asc', null, true);
            },
          },
          {
            label: 'Sort down',
            icon: 'pi pi-sort-amount-down',
            disabled: UNSORTABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.sortByColumn(column, 'desc', null, true);
            },
          },
        );
      }
      if (this.config.column.groupable) {
        items.push(
          { separator: true },
          {
            label: 'Group',
            icon: 'pi pi-list',
            disabled: UNGROUPABLE_FIELD_DATA_TYPES.has(column.field.dataType),
            command: () => {
              this.groupByColumn(column, 'asc', null, true);
            },
          },
        );
      }
      if (this.config.column.hideable) {
        items.push(
          { separator: true },
          {
            label: 'Hide',
            icon: 'pi pi-eye-slash',
            command: () => {
              this.hideColumn(column, true);
            },
          },
        );
      }
      if (this.config.column.deletable) {
        items.push(
          { separator: true },
          {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => {
              this.deleteColumn(column);
            },
          },
        );
      }
    }

    this.columnActionItems = items;
    this.columnActionMenu.show(e);
  }

  protected onFreezeDividerMousemove(e: MouseEvent) {
    this.layoutProperties.frozenDivider.isHover = true;
    this.layoutProperties.frozenDivider.dragHandleOffset =
      e.offsetY - Dimension.FreezeDividerDragHandleHeight / 2;
  }

  protected onFreezeDividerMouseleave() {
    this.layoutProperties.frozenDivider.isHover = false;
  }

  protected onFreezeDividerDragStarted() {
    this.virtualScroll.scrollToLeft();
    this.layoutProperties.frozenDivider.dragging = {} as any;
  }

  protected onFreezeDividerDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.virtualScroll.measurePointerOffset(e.pointerPosition);
    const index = calculateFreezeDividerDragPlaceholderIndex(
      this.displayingColumns,
      pointerOffsetX,
      this.virtualScroll.scrollLeft,
      this.frozenIndex,
    );
    const offset = _getColumnOffset(this.findColumnByIndex(index));
    if (offset / this.virtualScroll.viewport.width > this.config.column.maxFrozenRatio) {
      return;
    }
    this.layoutProperties.frozenDivider.dragging.index = index;
    this.layoutProperties.frozenDivider.dragging.offset = offset + this.config.sideSpacing;
  }

  protected onFreezeDividerDragEnded(e: CdkDragEnd) {
    const { index } = this.layoutProperties.frozenDivider.dragging;
    if (index === null) return;
    this.freezeUpToColumnIndex(index - 1);
    this.layoutProperties.frozenDivider.dragging = null;
    e.source._dragRef.reset();
    this.updateStates();
  }

  protected onColumnDragStarted(_e: CdkDragStart, column: ColumnExtra) {
    this.deselectAllCells();
    this.deselectAllColumns();
    column._isDragging = true;
  }

  protected onColumnDragEnded(_e: CdkDragEnd, column: ColumnExtra) {
    column._isDragging = false;
  }

  protected onColumnDragMoved(e: CdkDragMove) {
    const { x: pointerOffsetX } = this.virtualScroll.measurePointerOffset(e.pointerPosition);
    let index =
      pointerOffsetX === null
        ? null
        : calculateColumnDragPlaceholderIndex(
            this.displayingColumns,
            pointerOffsetX,
            this.virtualScroll.scrollLeft,
            this.frozenIndex,
          );
    let offset = null;
    if (index !== null) {
      const length = this.displayingColumns.length;
      const isOutRange = index === length;
      let column;
      if (isOutRange) {
        column = this.findColumnByIndex(index - 1);
      } else {
        column = this.findColumnByIndex(index);
      }
      if (column) {
        offset = _getColumnOffset(column);
        if (isOutRange) {
          offset += column.width;
        }
        if (index - 1 > this.frozenIndex) {
          offset -= this.virtualScroll.scrollLeft;
        }
      } else {
        index = null;
      }
    }
    this.layoutProperties.column.dragPlaceholderIndex = index;
    this.layoutProperties.column.dragPlaceholderOffset = offset + this.config.sideSpacing;
  }

  protected onColumnDropped(e: CdkDragDrop<Column[]>) {
    const { dragPlaceholderIndex } = this.layoutProperties.column;
    if (dragPlaceholderIndex === null) return;
    const previousIndex = e.previousIndex;
    const currentIndex =
      dragPlaceholderIndex > previousIndex ? dragPlaceholderIndex - 1 : dragPlaceholderIndex;
    this.layoutProperties.column.dragPlaceholderIndex =
      this.layoutProperties.column.dragPlaceholderOffset = null;
    if (previousIndex === currentIndex) return;
    moveItemInArray(this.displayingColumns, previousIndex, currentIndex);
    const column = this.findColumnByIndex(currentIndex);
    const cIdx = _.indexOf(this.columns, column);
    const indexColumnBefore = _.indexOf(this.columns, this.displayingColumns[currentIndex - 1]);
    moveItemInArray(
      this.columns,
      cIdx,
      cIdx < indexColumnBefore ? indexColumnBefore : indexColumnBefore + 1,
    );
    this.markDisplayingColumnsAsChanged();
    this.columnMoved.emit({
      column,
      position: currentIndex,
    });
  }

  protected onColumnResizing(event: ResizeEvent, column: ColumnExtra, _idx: number) {
    let newWidth = event.rectangle.width;

    const minWidth = this.config.column.minWidth;
    if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    const maxWidth = this.config.column.maxWidth;
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    if (!column._bkWidth) {
      column._bkWidth = column.width;
    }

    column.width = newWidth;
    column._isResizing = true;
    this.markDisplayingColumnsAsChanged();

    if (this.layoutProperties.fillHandler.index && !this.layoutProperties.fillHandler.hidden) {
      this.updateFillHandlerPosition();
    }
  }

  protected onColumnResized(event: ResizeEvent, column: ColumnExtra) {
    let newWidth = event.rectangle.width;

    const minWidth = this.config.column.minWidth;
    if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    const maxWidth = this.config.column.maxWidth;
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    column._bkWidth = undefined;
    setTimeout(() => (column._isResizing = false));
    this.columnResized.emit(column);
  }

  protected freezeUpToColumnIndex(columnIndex: number) {
    if (columnIndex === this.frozenIndex) return;
    this.config.column.frozenIndex = columnIndex;
    this.markDisplayingColumnsAsChanged();
    this.columnFreezed.emit(columnIndex);
  }

  protected selectColumn(e: MouseEvent, columnIndex: number) {
    this.deselectAllCells();
    this.deselectAllRows();
    const selection = this.layoutProperties.column.selection || new Set();
    if (e.shiftKey) {
      let startIdx = selection.values().next().value ?? columnIndex;
      let endIdx = columnIndex;
      if (columnIndex < startIdx) {
        endIdx = startIdx;
        startIdx = columnIndex;
      } else {
        endIdx = columnIndex;
      }
      for (let i = startIdx; i <= endIdx; i++) {
        selection.add(i);
      }
      // } else if (_.isCmdKey(e as unknown as KeyboardEvent)) {
      // selection.add(columnIndex);
    } else {
      selection.clear();
      selection.add(columnIndex);
    }
    this.layoutProperties.column.selection = selection;
    this.columnSelected.emit(this.getSelectedColumns());
  }

  protected deselectAllColumns() {
    this.columnActionMenu.hide();
    if (!this.layoutProperties.column.selection) return;
    this.layoutProperties.column.selection = null;
    this.columnSelected.emit(null);
  }

  protected async deleteColumn(column: Column) {
    _.remove(this.columns, column);
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, column));
    this.deselectAllCells();
    this.deselectAllColumns();
    this.columnDeleted.emit([column]);
  }

  protected async deleteSelectedColumns() {
    let canDeleteColumns = this.getSelectedColumns();
    if (!canDeleteColumns.length) return;
    _.pull(this.columns, ...canDeleteColumns);
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, ...canDeleteColumns));
    this.deselectAllCells();
    this.deselectAllColumns();
    this.columnDeleted.emit(canDeleteColumns);
  }

  protected hideSelectedColumns() {
    const columns = this.getSelectedColumns();
    for (const c of columns) {
      c.hidden = true;
    }
    this.markDisplayingColumnsAsChanged(_.without(this.displayingColumns, ...columns));
    this.columnHidden.emit(columns);
  }

  protected getLastColumnIndex(): number {
    return this.displayingColumns.length - 1;
  }

  protected getSelectedColumns(): Column[] {
    const { selection } = this.layoutProperties.column;
    const columns: Column[] = [];
    if (selection) {
      for (const idx of selection) {
        columns.push(this.findColumnByIndex(idx));
      }
    }
    return columns;
  }

  protected findColumnByIndex(index: number): Column {
    return this.displayingColumns[index];
  }

  protected findColumnByRawIndex(index: number): Column {
    return this.columns[index];
  }

  protected findColumnByID(id: Column['id']): Column {
    return this._columnLookup?.has(id) ? this._columnLookup.get(id) : _.find(this.columns, { id });
  }

  protected findColumnIndex(column: Column): number {
    const idx = _.indexOf(this.displayingColumns, column);
    return idx === -1 ? this.findColumnIndexByID(column.id) : idx;
  }

  protected findColumnIndexByID(id: Column['id']): number {
    return _.findIndex(this.displayingColumns, { id });
  }

  protected findColumnRawIndex(column: Column): number {
    const idx = _.indexOf(this.columns, column);
    return idx === -1 ? this.findColumnRawIndexByID(column.id) : idx;
  }

  protected findColumnRawIndexByID(id: Column['id']): number {
    return _.findIndex(this.columns, { id });
  }

  protected markDisplayingColumnsAsChanged(columns: Column[] = this.displayingColumns) {
    this.displayingColumns = [...columns];
  }

  protected groupColumnPredicate(groupingColumns: Column[], row: Row, depth: number): any {
    const idx = groupingColumns.length - depth;
    const column = groupingColumns[idx];
    if (!column) return;
    return parseGroupFieldData(column.field, row.data);
  }

  protected sortColumnPredicate(
    sortingColumns: Column[],
    sortingColumnIndex: number,
    currentRow: Row,
    rowCompared: Row,
  ): SortingPredicateReturnType {
    const column = sortingColumns[sortingColumnIndex];
    if (!column) return null;
    return [this._parseSortValue(currentRow, rowCompared, column), column.sortingType === 'desc'];
  }

  private _parseSortValue(currentRow: Row, rowCompared: Row, column: Column): any {
    const data = currentRow.data?.[column.id];
    return data ?? '';
  }
  /* COLUMN CLASS */

  /* ROW CLASS */
  @Input('rows') rawRows: Row[];
  rows: Row[];

  @Output() rowsChange = new EventEmitter<Row[]>();
  @Output() rowAdded = new EventEmitter<Row[]>();
  @Output() rowDeleted = new EventEmitter<Row[]>();
  @Output() rowExpanded = new EventEmitter<Row>();
  @Output() rowInserted = new EventEmitter<RowInsertedEvent[]>();
  @Output() rowMoved = new EventEmitter<RowMovedEvent>();
  @Output() rowSelected = new EventEmitter<Row[] | null>();

  @ViewChild('rowActionMenu', { static: true })
  protected readonly rowActionMenu: ContextMenu;
  protected rowActionItems: MenuItem[] | undefined;
  protected draftRow: Row;
  protected bkRows: Row[];
  protected selectedRows = new Set<Row>();
  protected draggingRows = new Set<Row>();

  private _rowLookup = new Map<Row['id'], Row>();
  private _addedEEC: EmitEventController<Row['id'], Row>;
  private _insertedEEC: EmitEventController<Row['id'], RowInsertedEvent>;

  get rowHeight(): number {
    return RowSizeEnum[this.config.row.size];
  }

  get canAddRow(): boolean {
    return this.config.row.creatable && (!this.isGrouping || !this.disableAddRowInGroup);
  }

  get canDeleteSelectedRows(): boolean {
    return !Array.from(this.selectedRows).find((row) => !!row.deletable === false);
  }

  RowClassOnChanges(changes: SimpleChanges) {
    if ('rawRows' in changes) {
      this.rows = this.rawRows ? [...this.rawRows] : [];
      this.initRows(this.rows);
    }
  }
  RowClassOnInit() {
    this.cellSelected
      .pipe(
        map((cell: Cell[] | null) => cell?.[0].row || null),
        distinctUntilChanged(),
        pairwise(),
        debounceTime(0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([_oldRow, newRow]: [Row | null, Row | null]) => {
        flushEEC(this._addedEEC, newRow, (event: Row) => event.id);
        flushEEC(this._insertedEEC, newRow, (event: RowInsertedEvent) => event.row.id);
      });

    merge(
      this.rowAdded,
      this.rowInserted.pipe(map((events: RowInsertedEvent[]) => _.map(events, 'row'))),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows: RowExtra[]) => {
        for (const row of rows) {
          if (this.checkRowIsDraft(row)) {
            this.draftRow = null;
            break;
          }
        }
        this.markRowsAsChanged();
        this.handleDataUpdate();
      });
  }
  RowClassAfterContentInit() {}
  RowClassAfterContentChecked() {}
  RowClassAfterViewInit() {}
  RowClassAfterViewChecked() {}
  RowClassOnDestroy() {
    this._addedEEC?.flush();
    this._insertedEEC?.flush();
  }

  updateRowStates() {
    this.state.rowHeight = this.rowHeight;
    this.state.canAddRow = this.canAddRow;
    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
  }

  initRows(rows: Row[]) {
    this.selectedRows.clear();
    this._rowLookup.clear();

    for (const row of rows) {
      if (!('_isInit' in row && (row as any)._isInit)) {
        (row as any)._isInit = true;
        row.id ||= _.uniqueId();
      }
      if (row.selected) this.selectedRows.add(row);
      this._rowLookup.set(row.id, row);
    }

    this.handleDataUpdate();
    this.markForCheck();
  }

  pushRows(rows: Row[]) {
    this.rawRows = this.rawRows ? [...this.rawRows, ...rows] : rows;
    this.rows = [...this.rawRows];

    for (const row of rows) {
      if (!('_isInit' in row && (row as any)._isInit)) {
        (row as any)._isInit = true;
        row.id ||= _.uniqueId();
      }
      if (row.selected) this.selectedRows.add(row);
      this._rowLookup.set(row.id, row);
    }

    this.handleDataUpdate();
    this.markForCheck();
  }

  updateRows(rows: Row[], shouldCheckSelectedState?: boolean) {
    if (shouldCheckSelectedState) {
      for (const row of rows) {
        row.selected ? this.selectedRows.add(row) : this.selectedRows.delete(row);
      }
    }
    this.handleDataUpdate();
    this.markForCheck();
  }

  setRowSize(size: RowSize) {
    this.config.row.size = size;
    if (this.isGrouping) {
      this.markGroupAsChanged();
    }
    this.updateStates();
    this.markForCheck();
  }

  addRow(group?: Group) {
    if (!this.canAddRow) return;
    this.isGrouping ? this.createRowInGroup(group) : this.createRow();
    this.markForCheck();
  }

  flushAddedEEC() {
    this._addedEEC?.flush();
  }

  protected openRowActionMenu(e: Event, row: Row, rowIndex: number) {
    const items: MenuItem[] = [];

    if (this.selectedRows?.size > 1) {
      items.push({
        label: 'Delete selected rows',
        icon: 'pi pi-trash',
        command: () => {
          this.deleteSelectedRows();
        },
      });
    } else {
      if (this.config.row.expandable) {
        items.push({
          label: 'Expand',
          icon: 'pi pi-external-link',
          command: () => {
            this.expandRow(row);
          },
        });
        items.push({ separator: true });
      }
      if (this.config.row.insertable) {
        items.push({
          label: 'Insert row above',
          icon: 'pi pi-arrow-up',
          command: () => {
            this.createRow(null, rowIndex);
          },
        });
        items.push({
          label: 'Insert row below',
          icon: 'pi pi-arrow-down',
          command: () => {
            this.createRow(null, rowIndex + 1);
          },
        });
        items.push({ separator: true });
      }
      if (this.config.row.deletable) {
        items.push({
          label: 'Delete',
          icon: 'pi pi-trash',
          command: () => {
            this.deleteRow(row);
          },
        });
      }
    }

    this.rowActionItems = items;
    this.rowActionMenu.show(e);
  }

  protected onBlankRowHover(e: Event, key: string = 'default') {
    this.ngZone.run(() => {
      this.layoutProperties.row.blankRowHover = key;
      this.detectChanges();
    });

    const unlisten = this.renderer.listen(e.target, 'pointerleave', () => {
      unlisten();
      this.ngZone.run(() => {
        this.layoutProperties.row.blankRowHover = null;
        this.detectChanges();
      });
    });
  }

  protected onRowDragStarted(e: CdkDragStart<Row>) {
    this.deselectAllCells();
    const draggingRow = e.source.data;
    this.draggingRows.add(draggingRow);

    if (!draggingRow.selected) return;

    for (const row of this.selectedRows) {
      this.draggingRows.add(row);
    }
  }

  protected onRowDragMoved(e: CdkDragMove<Row>) {
    const foundRow = this.findRowAtPointerPosition(e.pointerPosition);
    let group;
    let rowIndex;
    let rowOffset;
    if (foundRow) {
      group = foundRow.group;
      rowIndex = foundRow.rowIndex;
      rowOffset =
        foundRow.rowOffset +
        Dimension.HeaderHeight +
        Dimension.BodyVerticalPadding -
        this.virtualScroll.scrollTop -
        2;
    }
    this.layoutProperties.row.dragOverGroup = group;
    this.layoutProperties.row.dragPlaceholderIndex = rowIndex;
    this.layoutProperties.row.dragPlaceholderOffset = rowOffset;
  }

  protected onRowDragEnded(e: CdkDragEnd<Row>) {
    const { dragPlaceholderIndex } = this.layoutProperties.row;
    if (dragPlaceholderIndex === null) return;
    const currentIndex = dragPlaceholderIndex;

    if (_.isFinite(currentIndex)) {
      const droppedRows = [...this.draggingRows];
      this.moveRows(droppedRows, currentIndex);
      if (this.isGrouping) {
        const targetGroup = this.layoutProperties.row.dragOverGroup;
        this.moveRowsInGroup(droppedRows, currentIndex, targetGroup);
      }
    }

    e.source.reset();

    this.layoutProperties.row.dragPlaceholderIndex = this.layoutProperties.row.dragOverGroup = null;
    this.draggingRows.clear();
  }

  protected expandRow(row: Row) {
    this.rowExpanded.emit(row);
  }

  protected expandSelectingRow() {
    const selecting = this.layoutProperties.cell.selection?.primary;
    if (!selecting) return;
    this.expandRow(this.findRowByIndex(selecting.rowIndex));
  }

  protected async createRow(
    data?: any,
    position?: number,
    onBeforeInsert?: (r: Row, p: number) => void,
  ): Promise<Row> {
    const newRow = this._generateRow({ data });

    this._insertRow(newRow, position, true);

    if (_.isFinite(position)) {
      this._insertedEEC ||= new EmitEventController({
        autoEmit: false,
        onEmitted: (events: RowInsertedEvent[]) => {
          this.rowInserted.emit(events);
        },
      });

      this._insertedEEC.addEvent(newRow.id, { row: newRow, position });
    } else {
      this._addedEEC ||= new EmitEventController({
        autoEmit: false,
        onEmitted: (events: Row[]) => {
          this.rowAdded.emit(events);
        },
      });

      this._addedEEC.addEvent(newRow.id, newRow);
    }

    return newRow;
  }

  protected async deleteSelectedRows() {
    let canDeleteRows = this.getSelectedRows();
    if (!canDeleteRows.length) return;

    if (this.selectedRows.size) {
      this.selectedRows = new Set(_.pull([...this.selectedRows], ...canDeleteRows));
    } else {
      this.deselectAllCells();
    }

    this._removeRows(canDeleteRows);
    this.rowDeleted.emit(canDeleteRows);
    this.calculate();
  }

  protected async deleteRow(row: Row) {
    this.deselectAllCells();
    this._removeRows([row]);
    this.rowDeleted.emit([row]);
    this.calculate();
  }

  protected toggleRow(row: Row) {
    this.deselectAllCells();
    this.deselectAllColumns();

    row.selected = !row.selected;

    this.selectedRows.has(row) ? this.selectedRows.delete(row) : this.selectedRows.add(row);

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.rowSelected.emit([...this.selectedRows]);
  }

  protected flushDraftRow() {
    if (!this.draftRow) return;

    this.deselectAllCells();

    this._addedEEC?.emitEvent(this.draftRow.id);
    this._insertedEEC?.emitEvent(this.draftRow.id);

    this.draftRow = null;
  }

  protected cancelDraftRow() {
    if (!this.draftRow) return;

    this.deselectAllCells();

    this._removeRows([this.draftRow], true);

    this._addedEEC?.removeEvent(this.draftRow.id);
    this._insertedEEC?.removeEvent(this.draftRow.id);

    this.draftRow = null;
  }

  protected selectAllRows() {
    this.deselectAllCells();
    this.deselectAllColumns();

    this.selectedRows.clear();

    for (const row of this.rows) {
      row.selected = true;
      this.selectedRows.add(row);
    }

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.rowSelected.emit([...this.selectedRows]);
  }

  protected deselectAllRows() {
    this.rowActionMenu.hide();

    if (!this.selectedRows.size) return;

    for (const row of this.selectedRows) {
      row.selected = false;
    }

    this.selectedRows.clear();

    this.state.canDeleteSelectedRows = this.canDeleteSelectedRows;
    this.rowSelected.emit(null);
  }

  protected moveRows(movedRows: Row[], movedIndex: number) {
    let newMovedIndex = movedIndex;
    for (const movedRow of movedRows) {
      const idx = this.findRowIndex(movedRow);
      if (idx < 0 || idx >= movedIndex) {
        continue;
      }
      newMovedIndex--;
    }

    _.pull(this.rows, ...movedRows);
    this.rows.splice(newMovedIndex, 0, ...movedRows);

    this.markRowsAsChanged();

    this.rowMoved.emit({
      rows: movedRows,
      position: newMovedIndex,
    });
  }

  protected getSelectedRows(): Row[] {
    const selectedRows = [...this.selectedRows];

    if (!selectedRows.length) {
      const { selection } = this.layoutProperties.cell;
      const startIndex = selection.start.rowIndex;
      const endIndex = startIndex + selection.rowCount;

      for (let i = startIndex; i < endIndex; i++) {
        selectedRows.push(this.findRowByIndex(i));
      }
    }

    return selectedRows;
  }

  protected getLastRowIndex(): number {
    return this.isGrouping ? this.getLastRowIndexInGroup() : this.rows.length - 1;
  }

  protected findRowAtPointerPosition(pointerPosition: Point): FoundRow {
    if (this.isGrouping) {
      return this.findRowInGroupAtPointerPosition(pointerPosition);
    }

    let { y: pointerOffsetY } = this.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;

    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) {
      return null;
    }

    const startOffset = 0;
    const endOffset = startOffset + this.rows.length * this.rowHeight;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) {
      return null;
    }

    const index = Math.round((pointerOffsetY - startOffset) / this.rowHeight);

    return {
      rowIndex: index,
      rowOffset: startOffset + index * this.rowHeight,
    };
  }

  protected findRowByIndex(index: number): Row {
    return this.isGrouping ? this.findRowInGroupByIndex(index) : this.rows[index];
  }

  protected findRowByID(id: Row['id']): Row {
    return this._rowLookup.has(id) ? this._rowLookup.get(id) : _.find(this.rows, { id });
  }

  protected findRowIndex(row: Row): number {
    return this.isGrouping ? this.findRowIndexInGroup(row) : _.indexOf(this.rows, row);
  }

  protected findRowIndexByID(id: Row['id']): number {
    return this.isGrouping ? this.findRowIndexInGroupByID(id) : _.findIndex(this.rows, { id });
  }

  protected markRowsAsChanged(rows: Row[] = this.rows, slient: boolean = false) {
    this.rows = [...rows];

    if (slient) return;

    if (this.rawRows) {
      this.rawRows.length = 0;
      this.rawRows.push(...rows);
      rows = this.rawRows;
    } else {
      rows = this.rows;
    }

    this.rowsChange.emit(rows);
  }

  protected markRowsAsStreamed(rows: Row[]) {
    for (const row of rows) {
      (row as any)._isStreamed = true;
    }
  }

  protected checkRowIsDraft(row: Row): boolean {
    return this.draftRow === row;
  }

  private _generateRow(extra?: Partial<Row>): Row {
    return _.cloneDeep({
      ...extra,
      id: _.uniqueId(),
      selected: false,
    }) as Row;
  }

  private _insertRow(row: any, position = this.rows?.length, slient = false) {
    this.draftRow = row;

    this.rows.splice(position, 0, row);
    this.markRowsAsChanged(this.rows, slient);

    // Resets the current selecting state
    // before select the inserted row.
    this.layoutProperties.cell.selection = null;

    setTimeout(() => {
      const cellIndex: CellIndex = {
        rowIndex: this.findRowIndex(row),
        columnIndex: 0,
      };

      this.selectCells(cellIndex, cellIndex, true);

      this.detectChanges();

      setTimeout(() => {
        this._focusToFieldCellTouchable(true);
      }, 17);
    });
  }

  private _removeRows(rows: Row[], slient: boolean = false) {
    this.markRowsAsChanged(_.pull(this.rows, ...rows), slient);

    if (this.isGrouping) {
      this.deleteRowsInGroup(rows);
    }
  }

  private _focusToFieldCellTouchable(retry: boolean = false) {
    if (!this.layoutProperties.cell.selection) return;

    const fieldCell = this.findCellElementByIndex(
      this.layoutProperties.cell.selection.primary,
    )?.firstElementChild;

    if (fieldCell) {
      fieldCell.dispatchEvent(new Event('dblclick'));
      return;
    }

    if (!retry) return;

    setTimeout(() => {
      this._focusToFieldCellTouchable();
    }, 500);
  }
  /* ROW CLASS */

  /* CELL CLASS */
  @Output() cellDataEdited = new EventEmitter<CellDataEditedEvent[]>();
  @Output() cellDataPasted = new EventEmitter<CellDataEditedEvent[]>();
  @Output() cellDataCleared = new EventEmitter<CellDataEditedEvent[]>();
  @Output() cellDataFilled = new EventEmitter<CellDataEditedEvent[]>();
  @Output() cellSelected = new EventEmitter<Cell[] | null>();

  private _dataEditedEEC: EmitEventController<Row['id'], CellDataEditedEvent>;
  private _interactedColumns: Set<Column>;

  get canFillCell() {
    return this.config.cell.fillable;
  }

  get isFocusedInputInCellEditor() {
    return document.activeElement.tagName === 'INPUT-BOX';
  }

  CellClassOnChanges(_changes: SimpleChanges) {}
  CellClassOnInit() {}
  CellClassAfterContentInit() {}
  CellClassAfterContentChecked() {}
  CellClassAfterViewInit() {}
  CellClassAfterViewChecked() {}
  CellClassOnDestroy() {
    this.fieldCellService.clear();
    this._dataEditedEEC?.flush();
  }

  updateCellStates() {
    this.state.canFillCell = this.canFillCell;
    this.state.isFocusedInputInCellEditor = this.isFocusedInputInCellEditor;
  }

  scrollToCell({ row, column }: Partial<Cell>) {
    const idx: CellIndex = { rowIndex: 0, columnIndex: 0 };

    if (row) {
      idx.rowIndex = this.findRowIndex(row);
    }

    if (column) {
      idx.columnIndex = this.findColumnIndex(column);
    }

    this._scrollToCell(idx);
  }

  protected onCellHover(e: Event, index: CellIndex) {
    if (
      (this.isMouseHolding ||
        this.isMouseHiding ||
        !!this.layoutProperties.cell.invalid ||
        !this.virtualScroll.isScrollCompleted ||
        this.fieldCellService.getSelectingState()?.isEditing) &&
      (e as PointerEvent).pointerType !== 'touch'
    ) {
      e.preventDefault();
      return;
    }

    this.ngZone.run(() => {
      this.layoutProperties.cell.hovering = index;
      this.detectChanges();
    });

    const unlisten = this.renderer.listen(e.target, 'pointerleave', () => {
      unlisten();
      this.ngZone.run(() => {
        this.layoutProperties.cell.hovering = null;
        this.detectChanges();
      });
    });
  }

  protected onCellUnHover() {
    this.layoutProperties.cell.hovering = null;
  }

  flushEditedEEC() {
    this._dataEditedEEC?.flush();
  }

  protected flushSelectingCellState(callback?: () => void) {
    const _callback = () => {
      this.fieldCellService.clearSelectingState();
      callback?.();
    };

    if (!this.layoutProperties.cell.selection) {
      _callback();
      return;
    }

    const state = this.fieldCellService.getSelectingState();

    if (!state) {
      _callback();
      return;
    }

    state.flush(
      (data: any) => {
        if (data !== undefined) {
          const { row, column } = state.cell;
          const newData: RowCellData = { [column.id]: data };
          let rawData: RowCellData;

          this._markColumnAsInteracted(column);
          this._markCellDataAsEdited(row, newData, rawData);
          this._emitCellDataAsEdited();
        }

        _callback();
      },
      (errors: FieldValidationErrors | null) => {
        const cellIndex = this.findCellIndex(state.cell);

        if (!cellIndex) {
          state.reset();
          _callback();
          return;
        }

        const cellElement = this.findCellElementByIndex(cellIndex);

        if (!cellElement) {
          state.reset();
          _callback();
          return;
        }

        let invalid = null;

        if (errors !== null) {
          invalid = this.findCellIndex(state.cell);

          for (const key in errors) {
            if (!errors.hasOwnProperty(key)) {
              continue;
            }

            switch (key) {
              case FieldValidationKey.Required:
                this._openErrorTooltip(cellElement, 'REQUIRED');
                break;
              case FieldValidationKey.Pattern:
                this._openErrorTooltip(cellElement, 'PATTERN');
                break;
              case FieldValidationKey.Min:
                this._openErrorTooltip(cellElement, 'CANNOT_LESS_THAN_MINIMUM');
                break;
              case FieldValidationKey.Max:
                this._openErrorTooltip(cellElement, 'CANNOT_GREATER_MAXIMUM');
                break;
            }
          }

          this.layoutProperties.fillHandler.hidden = true;
        } else {
          this._closeErrorTooltip();
          this.layoutProperties.fillHandler.hidden = false;
        }

        this.layoutProperties.cell.invalid = invalid;
      },
    );
  }

  protected revertSelectingCellState() {
    if (!this.layoutProperties.cell.selection) return;

    const state = this.fieldCellService.getSelectingState();
    if (!state) return;

    const selectingCell = this.findCellByIndex(this.layoutProperties.cell.selection.start);

    state.reset();

    if (this.checkRowIsDraft(selectingCell.row)) {
      this.cancelDraftRow();
      this.deselectAllCells();
    }
  }

  protected scrollToFocusingCell() {
    const { rowIndex, columnIndex } = this.layoutProperties.cell.focusing;
    this._scrollToCell({ rowIndex, columnIndex });
  }

  protected getCells(
    { rowIndex: startRowIdx, columnIndex: startColumnIdx }: CellIndex,
    { rowIndex: endRowIdx, columnIndex: endColumnIdx }: CellIndex,
    excludeDataTypes?: EDataType[],
    excludeStates?: ExcludeCellState[],
  ): MatrixCell {
    const matrix = new MatrixCell();

    for (let i = startRowIdx; i <= endRowIdx; i++) {
      const cells = matrix.addRow();
      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        cells.push(
          this.findCellByIndex({
            rowIndex: i,
            columnIndex: j,
          }),
        );
      }
    }

    return excludeDataTypes?.length || excludeStates?.length
      ? this._filterExcludeCells(matrix, excludeDataTypes, excludeStates)
      : matrix;
  }

  protected selectCells(
    startIndex: CellIndex,
    endIndex: CellIndex = startIndex,
    scrollToLastCell = false,
    extend = false,
  ): MatrixCell {
    let { rowIndex: startRowIdx, columnIndex: startColumnIdx } = startIndex;
    let { rowIndex: endRowIdx, columnIndex: endColumnIdx } = endIndex;

    if (startRowIdx > endRowIdx) {
      const idx = startRowIdx;
      startRowIdx = endRowIdx;
      endRowIdx = idx;
    }

    if (startColumnIdx > endColumnIdx) {
      const idx = startColumnIdx;
      startColumnIdx = endColumnIdx;
      endColumnIdx = idx;
    }

    const selectedCells: Cell[] = [];

    for (let i = startRowIdx; i <= endRowIdx; i++) {
      const rowIndex = Math.abs(i);
      const row = this.findRowByIndex(rowIndex);

      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        const columnIndex = Math.abs(j);
        const column = this.findColumnByIndex(columnIndex);

        selectedCells.push({ row, column });
      }
    }

    const start = {
      rowIndex: startRowIdx,
      columnIndex: startColumnIdx,
    };
    const end = {
      rowIndex: endRowIdx,
      columnIndex: endColumnIdx,
    };

    this.flushSelectingCellState(() => {
      this.deselectAllColumns();
      this.deselectAllRows();

      const rowCount = endRowIdx - startRowIdx + 1;
      const columnCount = endColumnIdx - startColumnIdx + 1;
      const primary =
        extend && this.layoutProperties.cell.selection
          ? this.layoutProperties.cell.selection.primary
          : start;

      this.layoutProperties.cell.selection = {
        primary,
        start,
        end,
        rowCount,
        columnCount,
        count: rowCount * columnCount,
      };
      this.layoutProperties.cell.focusing = primary;

      this._emitCellAsSelected(selectedCells);

      if (scrollToLastCell) {
        try {
          this._scrollToCell(end);
        } catch {}
      }

      if (this.canFillCell) {
        this.detectChanges();
        this.updateFillHandlerPosition(end);
      }
    });

    return this.getCells(start, end);
  }

  protected deselectAllCells() {
    if (!this.layoutProperties.cell.selection) return;

    this.flushSelectingCellState(() => {
      this.layoutProperties.cell.selection =
        this.layoutProperties.cell.focusing =
        this.layoutProperties.cell.filling =
          null;

      this.layoutProperties.fillHandler.index = null;
      this.layoutProperties.fillHandler.hidden = true;

      this.cellSelected.emit(null);
    });
  }

  protected async cutCells(clipboardData: ClipboardData<Cell>) {
    const matrixCell = new MatrixCell();

    for (const items of clipboardData.matrix) {
      matrixCell.addRow(_.map(items, 'metadata'));
    }

    const [count, total] = this._clearCells(matrixCell);

    this.toastService.add({
      severity: 'info',
      summary: 'Cut complete',
      detail: `Cut complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  protected async pasteCells(clipboardData: ClipboardData<Cell>) {
    let matrix: MatrixCell;

    if (this.layoutProperties.column.selection) {
      const columnSelection = this.layoutProperties.column.selection;

      const itr = columnSelection.values();
      let currIdx = itr.next().value;
      let nextIdx = itr.next().value;
      let isSequence = true;

      while (nextIdx) {
        if (currIdx !== nextIdx - 1) {
          isSequence = false;
          break;
        }

        currIdx = itr.next().value;
        nextIdx = itr.next().value;
      }

      if (!isSequence) {
        this.toastService.add({
          severity: 'info',
          summary: 'Paste failed',
          detail: `Not support non-sequence column paste`,
          life: 3000,
        });
        return;
      }

      const arr = [...columnSelection];
      const startIdx = arr[0];
      const endIdx = arr[arr.length - 1];

      matrix = this.getCells(
        { rowIndex: 0, columnIndex: startIdx },
        { rowIndex: this.getLastRowIndex(), columnIndex: endIdx },
        UNPASTEABLE_DATA_TYPES,
        [ExcludeCellState.NonEditable],
      );
    } else {
      const cellSelection = this.layoutProperties.cell.selection;

      if (!cellSelection) return;

      if (
        cellSelection.rowCount !== clipboardData.rowCount ||
        cellSelection.columnCount !== clipboardData.columnCount
      ) {
        const rowCount = Math.max(cellSelection.rowCount, clipboardData.rowCount);
        const columnCount = Math.max(cellSelection.columnCount, clipboardData.columnCount);
        const startIdx = { ...cellSelection.start };
        const endIdx = {
          rowIndex: startIdx.rowIndex + rowCount - 1,
          columnIndex: startIdx.columnIndex + columnCount - 1,
        };

        matrix = this._filterExcludeCells(
          this.selectCells(startIdx, endIdx),
          UNPASTEABLE_DATA_TYPES,
          [ExcludeCellState.NonEditable],
        );
      } else {
        matrix = this.getCells(cellSelection.start, cellSelection.end, UNPASTEABLE_DATA_TYPES, [
          ExcludeCellState.NonEditable,
        ]);
      }
    }

    if (!matrix) return;

    const values = matrix.values();
    let count = 0;
    let total = 0;

    for (let i = 0; i < matrix.rowCount; i++) {
      const cells = values[i];
      const clipboardItems = clipboardData.matrix[i % clipboardData.rowCount];
      const newData: any = {};

      let rawData: any;
      let row: Row;

      for (let j = 0; j < matrix.columnCount; j++) {
        const cell = cells[j];

        if (!cell) continue;

        const column = cell.column;
        const clipboardItem = clipboardItems[j % clipboardData.columnCount];

        if (!clipboardItem || (!clipboardItem?.text && column.field.required)) {
          continue;
        }

        const data = parseClipboardItemToData(column, clipboardItem);

        if (data === undefined) {
          rawData ||= {};
          rawData[column.id] = cell.row.data[column.id];
        }

        row = cell.row;

        newData[column.id] = data;

        count++;

        this._markColumnAsInteracted(column);
      }

      if (row) {
        this._markCellDataAsEdited(row, newData, rawData, CellDataEditType.Paste);
      }
    }

    total = matrix.count;

    this._emitCellDataAsEdited();

    this.toastService.add({
      severity: 'info',
      summary: 'Paste complete',
      detail: `Paste complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  protected async clearCells(matrixCell: MatrixCell) {
    const [count, total] = this._clearCells(matrixCell);
    this.toastService.add({
      severity: 'info',
      summary: 'Clear complete',
      detail: `Clear complete ${count}/${total} cells`,
      life: 3000,
    });
  }

  protected async fillCells(
    source: [CellIndex, CellIndex],
    target: [CellIndex, CellIndex],
    isReverse: boolean,
  ) {
    const targetMatrixCell = this._filterExcludeCells(
      this.getCells(target[0], target[1]),
      undefined,
      [ExcludeCellState.NonEditable],
    );
    const sourceMatrixCell = this.getCells(source[0], source[1]);
    const sourceValues = sourceMatrixCell.values();
    const targetValues = targetMatrixCell.values();

    if (isReverse) {
      sourceValues.reverse();
      targetValues.reverse();
    }

    const sourceData = {};

    for (let i = 0; i < sourceMatrixCell.rowCount; i++) {
      const cells = sourceValues[i];

      sourceData[i] ||= {};

      for (let j = 0; j < sourceMatrixCell.columnCount; j++) {
        const { row, column } = cells[j];

        let data = row.data[column.id];

        try {
          if (_.isEmpty(data)) {
            data = null;
            throw new Error();
          }

          const dataType = column.field.dataType;

          switch (dataType) {
            case NumberField.dataType: {
              const prev = sourceData[i - 1]?.[j];

              let metadata = prev?.metadata;

              if (metadata) {
                metadata = { ...metadata };
                metadata.index += 1;
                metadata.data.push(data);
                metadata.range.push(metadata.index);
              } else {
                let step = isReverse ? -1 : 1;

                metadata = {
                  index: 0,
                  data: [data],
                  range: [0],
                  step,
                };
              }

              sourceData[i][j] = {
                data,
                metadata,
                isNumber: true,
              };

              break;
            }
            case DateField.dataType: {
              const prev = sourceData[i - 1]?.[j];

              let metadata: any;

              if (!isDayjs(data)) {
                data = dayjs(data);
              }

              if (prev) {
                metadata = prev.metadata;

                if (metadata) {
                  const prevStep = metadata.step;

                  if (prevStep !== undefined) {
                    metadata.step = Math.floor((data - prev.data) / 1000 / 60 / 60 / 24);

                    if (prevStep !== null && prevStep !== metadata.step) {
                      delete metadata.step;
                      delete metadata.last;
                    } else {
                      metadata.last = data;
                    }
                  }
                }
              } else {
                metadata = { step: null };
              }

              sourceData[i][j] = {
                data,
                metadata,
                isDate: true,
              };

              break;
            }
            default:
              throw new Error();
          }
        } catch {
          sourceData[i][j] = { data };
        }
      }
    }

    for (let i = 0; i < targetMatrixCell.rowCount; i++) {
      const targetCells = targetValues[i];
      const pos = i + 1;
      const page = Math.ceil(pos / sourceMatrixCell.rowCount);
      const fillData = sourceData[i % sourceMatrixCell.rowCount];
      const newData: any = {};

      let row: Row;

      for (let j = 0; j < targetMatrixCell.columnCount; j++) {
        const targetCell = targetCells[j];

        if (!targetCell) continue;

        row = targetCell.row;

        const column = targetCell.column;
        const fD = fillData[j % targetMatrixCell.columnCount];

        let data = fD.data;

        if (data !== null) {
          if (fD.isNumber) {
            if (fD.metadata.range.length > 1) {
              data = FORECAST(
                fD.metadata.index + page * fD.metadata.range.length,
                fD.metadata.data,
                fD.metadata.range,
              );
              data = parseFloat(data.toFixed(2));
            } else {
              data += page * fD.metadata.step;
            }
          } else if (fD.isDate) {
            if (fD.metadata && fD.metadata.step !== undefined && fD.metadata.last !== undefined) {
              data = fD.metadata.last.clone();
              data.add(pos * fD.metadata.step, 'd');
            } else {
              data = data.clone();
            }
          }
        }

        newData[column.id] = data;

        this._markColumnAsInteracted(column);
      }

      if (row) {
        this._markCellDataAsEdited(row, newData, undefined, CellDataEditType.Fill);
      }
    }

    this._emitCellDataAsEdited();

    this.toastService.add({
      severity: 'info',
      summary: 'Fill complete',
      life: 3000,
    });
  }

  protected moveToCell(direction: Direction) {
    const selectingIdx = this.layoutProperties.cell.selection?.primary;

    if (!selectingIdx) return;

    let { rowIndex, columnIndex } = selectingIdx;

    switch (direction) {
      case 'above':
        rowIndex--;
        break;
      case 'below':
        rowIndex++;
        break;
      case 'before':
        columnIndex--;
        break;
      case 'after':
        columnIndex++;
        break;
    }

    const index = { rowIndex, columnIndex };

    if (!this._checkCellIndexValid(index)) {
      return;
    }

    this.selectCells(index, index, true);
  }

  protected extendSelectedCells(direction: Direction, step = 1) {
    const selectingIdx = this.layoutProperties.cell.selection?.primary;

    if (!selectingIdx) return;

    let startIdx = { ...selectingIdx };
    let endIdx = { ...selectingIdx };

    const selection = this.layoutProperties.cell.selection;

    if (selection) {
      startIdx = { ...selection.start };
      endIdx = { ...selection.end };
    }

    switch (direction) {
      case 'above':
        if (startIdx.rowIndex < selectingIdx.rowIndex) {
          startIdx.rowIndex -= step;
        } else {
          endIdx.rowIndex -= step;
        }
        break;
      case 'below':
        if (startIdx.rowIndex < selectingIdx.rowIndex) {
          startIdx.rowIndex += step;
        } else {
          endIdx.rowIndex += step;
        }
        break;
      case 'before':
        if (startIdx.columnIndex < selectingIdx.columnIndex) {
          startIdx.columnIndex -= step;
        } else {
          endIdx.columnIndex -= step;
        }
        break;
      case 'after':
        if (startIdx.columnIndex < selectingIdx.columnIndex) {
          startIdx.columnIndex += step;
        } else {
          endIdx.columnIndex += step;
        }
        break;
    }

    if (!this._checkCellIndexValid(startIdx) || !this._checkCellIndexValid(endIdx)) {
      return;
    }

    this.selectCells(startIdx, endIdx, true, true);
  }

  protected getCellOffset(index: CellIndex): CellOffset {
    if (this.isGrouping) {
      return this.getRowCellOffsetInGroup(index);
    }

    const left = _getColumnOffset(this.findColumnByIndex(index.columnIndex));
    const top = index.rowIndex * this.rowHeight;

    return { left, top };
  }

  protected findCellIndex(cell: Cell): CellIndex {
    return {
      rowIndex: this.findRowIndex(cell.row),
      columnIndex: this.findColumnIndex(cell.column),
    };
  }

  protected findCellByIndex(index: CellIndex): Cell {
    return {
      row: this.findRowByIndex(index.rowIndex),
      column: this.findColumnByIndex(index.columnIndex),
    };
  }

  protected findCellElementByIndex(index: CellIndex): HTMLElement {
    const rowIdxAttr = `[data-row-index="${index.rowIndex}"]`;
    const columnIdxAttr = `[data-column-index="${index.columnIndex}"]`;

    return this.elementRef.nativeElement.querySelector(`${rowIdxAttr}${columnIdxAttr}`);
  }

  protected findCellByElement(element: HTMLElement, cellType?: string): CellIndex {
    const cell = element.closest(cellType ? `[cell-type="${cellType}"]` : '[cell-type]');
    if (!cell) return null;
    const rowIndex = parseFloat(cell.getAttribute('data-row-index'));
    const columnIndex = parseFloat(cell.getAttribute('data-column-index'));
    return { rowIndex, columnIndex };
  }

  protected compareCell(source: Cell, destination: Cell): boolean {
    return source.row.id === destination.row.id && source.column.id === source.column.id;
  }

  protected compareCellIndex(
    { rowIndex: sRIdx, columnIndex: sCIdx }: CellIndex,
    { rowIndex: dRIdx, columnIndex: dCIdx }: CellIndex,
  ): -1 | 0 | 1 {
    if (sRIdx < dRIdx) {
      return -1;
    } else if (sRIdx > dRIdx) {
      return 1;
    }

    if (sCIdx < dCIdx) {
      return -1;
    } else if (sCIdx > dCIdx) {
      return 1;
    }

    return 0;
  }

  protected getInteractiveCells(
    excludeDataTypes?: EDataType[],
    excludeStates?: ExcludeCellState[],
  ): MatrixCell | null {
    let matrix: MatrixCell;

    if (this.selectedRows.size) {
      const cells: Cell[] = [];
      for (const row of this.selectedRows) {
        for (const column of this.displayingColumns) {
          cells.push({ row, column });
        }
      }
      matrix = new MatrixCell(cells);
    } else if (this.layoutProperties.column.selection) {
      const cells: Cell[] = [];
      for (const row of this.rows) {
        for (const columnIdx of this.layoutProperties.column.selection) {
          const column = this.findColumnByIndex(columnIdx);
          cells.push({ row, column });
        }
      }
      matrix = new MatrixCell(cells);
    } else if (this.layoutProperties.cell.selection) {
      matrix = this.getCells(
        this.layoutProperties.cell.selection.start,
        this.layoutProperties.cell.selection.end,
      );
    }

    if (!matrix) return null;

    return excludeDataTypes?.length || excludeStates?.length
      ? this._filterExcludeCells(matrix, excludeDataTypes, excludeStates)
      : matrix;
  }

  protected copyInteractiveCells(clipboard: Clipboard) {
    const matrixCell = this.getInteractiveCells(clipboard.isCutAction && UNCUTABLE_DATA_TYPES);

    if (!matrixCell?.count) return;

    const matrix: ClipboardItem[][] = [];
    let count = 0;

    for (const cells of matrixCell.values()) {
      const items = [];

      for (const cell of cells) {
        if (!cell) continue;

        const { row, column } = cell;

        let data = row.data?.[column.id];
        let text = '';

        if (!_.isEmpty(data)) {
          data = _.cloneDeep(data);
          text = column.field.toString(data);
        }

        items.push({
          text,
          data,
          metadata: cell,
        });

        count++;
      }

      matrix.push(items);
    }

    clipboard.write(matrix as any);

    this.toastService.add({
      severity: 'success',
      summary: clipboard.isCutAction ? 'Cut Success' : 'Copy Success',
      detail: `Copied ${count} of ${matrixCell.count} cells`,
      life: 3000,
    });
  }

  protected clearInteractiveCells() {
    const matrix = this.getInteractiveCells();

    if (!matrix?.count) return;

    this.clearCells(matrix);
  }

  protected updateCellsData(rows: Row[], newData: RowCellData) {
    for (const columnID in newData) {
      this._markColumnAsInteracted(this.findColumnByID(columnID));
    }

    for (const row of rows) {
      this._markCellDataAsEdited(row, newData);
    }

    this._emitCellDataAsEdited();
  }

  protected searchCellPredicate(row: Row, column: Column): string {
    return row.data?.[column.id] ?? '';
  }

  private _clearCells(matrixCell: MatrixCell): [number, number] {
    matrixCell = this._filterExcludeCells(matrixCell, UNCLEARABLE_DATA_TYPES, [
      ExcludeCellState.Required,
      ExcludeCellState.Empty,
      ExcludeCellState.NonEditable,
    ]);

    let count = 0;

    for (const cells of matrixCell.values()) {
      const newData: RowCellData = {};

      let row: Row;

      for (const cell of cells) {
        if (!cell) continue;

        row = cell.row;

        const column = cell.column;

        let data = null;

        switch (column.field.dataType) {
          case EDataType.Checkbox:
            data ||= false;
            break;
        }

        newData[column.id] = data;

        this._markColumnAsInteracted(column);

        count++;
      }

      if (row) {
        this._markCellDataAsEdited(row, newData, undefined, CellDataEditType.Clear);
      }
    }

    this._emitCellDataAsEdited();

    return [count, matrixCell.count];
  }

  private _scrollToCell(index: CellIndex) {
    const { rowIndex, columnIndex } = index;

    if (rowIndex === -1 || columnIndex === -1 || _.isNil(rowIndex) || _.isNil(columnIndex)) {
      return;
    }

    const { left: cellOffsetLeft, top: cellOffsetTop } = this.getCellOffset(index);
    const { scrollLayout, scrollLeft, scrollTop, viewport } = this.virtualScroll;

    const horizontalTrackOffsetX = scrollLayout.horizontal.track.offset.x;
    const { width: cellWidth } = this.findColumnByIndex(columnIndex);
    let left = scrollLeft;

    if (cellOffsetLeft >= horizontalTrackOffsetX) {
      if (cellOffsetLeft - horizontalTrackOffsetX < scrollLeft) {
        left -= scrollLeft - cellOffsetLeft + horizontalTrackOffsetX;
      } else if (cellOffsetLeft + cellWidth > scrollLeft + viewport.width) {
        left += cellOffsetLeft + cellWidth - (scrollLeft + viewport.width);
      }
    }

    const verticalTrackOffsetY = scrollLayout.vertical.track.offset.y;
    const cellHeight = this.rowHeight;
    let top = scrollTop;

    if (cellOffsetTop >= verticalTrackOffsetY) {
      if (cellOffsetTop - verticalTrackOffsetY < scrollTop) {
        top -= scrollTop - cellOffsetTop + verticalTrackOffsetY - Dimension.BodyVerticalPadding;
      } else if (cellOffsetTop + cellHeight > scrollTop + viewport.height) {
        top +=
          cellOffsetTop +
          cellHeight -
          (scrollTop + viewport.height) +
          Dimension.BodyVerticalPadding;
      }
    }

    this.virtualScroll.scrollTo({ left, top });
  }

  private _checkCellIndexValid({ rowIndex, columnIndex }: CellIndex): boolean {
    if (rowIndex < 0) {
      return false;
    } else {
      const lastRowIndex = this.getLastRowIndex();

      if (rowIndex > lastRowIndex) {
        return false;
      }
    }

    if (columnIndex < 0) {
      return false;
    } else {
      const lastColumnIndex = this.getLastColumnIndex();

      if (columnIndex > lastColumnIndex) {
        return false;
      }
    }

    return true;
  }

  private _markColumnAsInteracted(column: Column) {
    this._interactedColumns ||= new Set();

    if (this._interactedColumns.has(column)) {
      return;
    }

    this._interactedColumns.add(column);
  }

  private _markCellDataAsEdited(
    row: Row,
    newData: RowCellData,
    rawData: RowCellData = newData,
    type: CellDataEditType = CellDataEditType.Default,
  ) {
    row.data = { ...row.data, ...rawData };

    if (this.checkRowIsDraft(row)) {
      this._interactedColumns?.clear();
      return;
    }

    this._dataEditedEEC ||= new EmitEventController({
      autoEmit: false,
      onEmitted: (events: CellDataEditedEvent[]) => {
        let editEvents: CellDataEditedEvent[];
        let pasteEvents: CellDataEditedEvent[];
        let clearEvents: CellDataEditedEvent[];
        let fillEvents: CellDataEditedEvent[];

        for (const event of events) {
          switch (event.type) {
            case CellDataEditType.Default:
              editEvents ||= [];
              editEvents.push(event);
              break;
            case CellDataEditType.Paste:
              pasteEvents ||= [];
              pasteEvents.push(event);
              break;
            case CellDataEditType.Clear:
              clearEvents ||= [];
              clearEvents.push(event);
              break;
            case CellDataEditType.Fill:
              fillEvents ||= [];
              fillEvents.push(event);
              break;
          }
        }

        if (editEvents?.length) {
          this.cellDataEdited.emit(events);
        }

        if (pasteEvents?.length) {
          this.cellDataPasted.emit(events);
        }

        if (clearEvents?.length) {
          this.cellDataCleared.emit(events);
        }

        if (fillEvents?.length) {
          this.cellDataFilled.emit(events);
        }

        if (this._interactedColumns?.size) {
          let shouldReCalculate: boolean;
          let shouldReGroup: boolean;
          let shouldReSort: boolean;

          for (const column of this._interactedColumns) {
            if (column.calculateType) {
              shouldReCalculate = true;
            }

            if (column.groupingType) {
              shouldReGroup = true;
            }

            if (column.sortingType) {
              shouldReSort = true;
            }
          }

          if (shouldReCalculate) {
            this.calculate();
          }

          if (shouldReGroup) {
            this.group();
          }

          if (shouldReSort) {
            this.sort();
          }

          this._interactedColumns.clear();
        }
      },
    });

    let event = this._dataEditedEEC.getEvent(row.id);

    if (event) {
      event.newData = { ...event.newData, ...newData };
    } else {
      event = { row, newData, type };
    }

    this._dataEditedEEC.addEvent(row.id, event);
  }

  private _emitCellDataAsEdited() {
    this._dataEditedEEC?.emit();
  }

  private _emitCellAsSelected = _.debounce((selectedCells: Cell[]) => {
    this.cellSelected.emit(selectedCells);
  }, 200);

  private _filterExcludeCells(
    matrix: MatrixCell,
    excludeDataTypes: EDataType[],
    excludeStates: ExcludeCellState[],
  ): MatrixCell {
    const excludeDataTypeSet = new Set<EDataType>(excludeDataTypes);
    const excludeRequired = _.includes(excludeStates, ExcludeCellState.Required);
    const excludeEmpty = _.includes(excludeStates, ExcludeCellState.Empty);
    const excludeNonEditable = _.includes(excludeStates, ExcludeCellState.NonEditable);

    for (const cells of matrix.values()) {
      for (let i = 0; i < cells.length; i++) {
        const { row, column } = cells[i];

        if (
          (!excludeDataTypeSet.size || !excludeDataTypeSet.has(column.field.dataType)) &&
          (!excludeRequired || !column.field.required) &&
          (!excludeEmpty ||
            (column.field.dataType === EDataType.Checkbox
              ? row.data?.[column.id] === true
              : !_.isEmpty(row.data?.[column.id]))) &&
          (!excludeNonEditable || row.editable === true || row.editable?.[column.id] === true)
        ) {
          continue;
        }

        cells[i] = null;
      }
    }

    return matrix;
  }

  private _openErrorTooltip(cellElement: HTMLElement, key: string) {
    // if (this._tooltipRef?.isOpened) return;
    // this._tooltipRef = this._tooltipService.open(
    //   cellElement,
    //   this.translateService.instant(`SPREADSHEET.MESSAGE.${key}`),
    //   undefined,
    //   { position: 'start-above', type: 'error', disableClose: true }
    // );
  }

  private _closeErrorTooltip() {
    // this._tooltipRef?.close();
  }
  /* CELL CLASS */

  /* GROUP CLASS */
  protected collapsedGroupState = new Map<number, boolean>();
  protected rootGroup: Group;
  protected disableAddRowInGroup: boolean;

  get groupDepth() {
    return this.groupingColumns?.size;
  }

  get isGrouping() {
    return !!this.rootGroup;
  }

  get isGroupingWithoutGroup() {
    return this.isGrouping && !this.rootGroup?.children?.length;
  }

  GroupClassOnChanges(_changes: SimpleChanges) {}
  GroupClassOnInit() {}
  GroupClassAfterContentInit() {}
  GroupClassAfterContentChecked() {}
  GroupClassAfterViewInit() {}
  GroupClassAfterViewChecked() {}
  GroupClassOnDestroy() {}

  updateGroupStates() {
    this.state.groupDepth = this.groupDepth;
    this.state.isGrouping = this.isGrouping;
    this.state.isGroupingWithoutGroup = this.isGroupingWithoutGroup;
  }

  protected toggleAllGroup(isCollapse: boolean, group = this.rootGroup) {
    this._toggleGroupRecursive(group, isCollapse);
    this.markGroupAsChanged();
    this.detectChanges();
  }

  protected toggleGroup(group: Group) {
    this._toggleGroup(group, !group.metadata.isCollapsed);
    this.markGroupAsChanged();
  }

  protected calculateInGroup(columns: Column[]) {
    if (!columns?.length) return;
    calculateInGroup(this.rootGroup, columns, calculateFieldPredicate);
  }

  protected sortInGroup(columns: Column[]) {
    if (!columns?.length) return;
    this.rootGroup.sortItem(this.sortColumnPredicate.bind(this, columns), columns.length);
    this.markGroupAsChanged();
  }

  protected unsortInGroup() {
    this.rootGroup.unsortItem();
    this.markGroupAsChanged();
  }

  protected async createRowInGroup(
    group = this.getSelectingGroup() || this.getFirstGroup(),
    position?: number,
  ): Promise<Row> {
    let newRow: Row;
    if (group !== this.rootGroup) {
      let g = group;
      const data: any = {};
      do {
        const { metadata } = g;
        data[metadata.column.id] = metadata.data;
        g = g.parent;
      } while (g?.depth > 0);
      newRow = await this.createRow(data, position, (row: Row) => {
        group.addItems([row], position);
        this.markGroupAsChanged();
      });
    } else {
      newRow = await this.createRow(undefined, position);
      this.group();
    }

    if (group.metadata.isCollapsed) {
      let g = group;
      do {
        this._toggleGroup(g, false);
        g = g.parent;
      } while (g);
    }
    return newRow;
  }

  protected deleteRowsInGroup(deletedRows: Row[]) {
    this.rootGroup.removeItems(deletedRows);
    this.markGroupAsChanged();
  }

  protected moveRowsInGroup(movedRows: Row[], movedIndex: number, targetGroup: Group) {
    const targetGroups = [...targetGroup.findClosest(), targetGroup];
    const rowDataNeedUpdate: RowCellData = {};

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

    this.updateCellsData(movedRows, rowDataNeedUpdate);
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
    const rowIndex = this.layoutProperties.cell.selection?.primary.rowIndex;
    if (!_.isFinite(rowIndex)) return null;
    return this.findGroupByRowIndex(rowIndex);
  }

  protected getRowCellOffsetInGroup({ rowIndex, columnIndex }: CellIndex) {
    const group = this.findGroupByRowIndex(rowIndex);
    if (!group || group.depth < this.groupDepth) return null;

    const { _viewProps } = group as _GroupView;
    const left = _getColumnOffset(this.findColumnByIndex(columnIndex));
    const top =
      _viewProps.rect.top +
      Dimension.GroupHeaderHeight +
      (rowIndex - _viewProps.startItemIndex) * this.rowHeight;

    return { left, top };
  }

  protected getLastRowIndexInGroup() {
    return this.rootGroup.items.length - 1;
  }

  protected findGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;
    return findGroupAtPointerOffset(this.rootGroup, pointerOffsetY);
  }

  protected findGroupAtPointerOffset(pointerOffsetY: number) {
    return findGroupAtPointerOffset(this.rootGroup, pointerOffsetY);
  }

  protected findGroupByRowIndex(rowIndex: number) {
    return findGroupByItemIndex(rowIndex, this.rootGroup);
  }

  protected findRowInGroupAtPointerPosition(pointerPosition: Point) {
    let { y: pointerOffsetY } = this.virtualScroll.measurePointerOffset(pointerPosition);
    pointerOffsetY -= Dimension.BodyVerticalPadding;
    if (!_.isFinite(pointerOffsetY) || pointerOffsetY < 0) return null;

    const group = this.findGroupAtPointerOffset(pointerOffsetY);
    if (!group || group.depth < this.groupDepth) return null;

    const { _viewProps: groupViewProps } = group as _GroupView;
    const startOffset = groupViewProps.rect.top + Dimension.GroupHeaderHeight;
    const endOffset = startOffset + groupViewProps.rect.height;

    if (pointerOffsetY < startOffset || pointerOffsetY > endOffset) return null;

    const index = Math.floor((pointerOffsetY - startOffset) / this.rowHeight);

    return {
      group,
      rowIndex: index,
      rowOffset: startOffset + index * this.rowHeight,
    };
  }

  protected findRowGroupIndex(group: Group, row: Row) {
    return _.indexOf(group.items, row);
  }

  protected findRowIndexInGroup(row: Row) {
    return _.indexOf(this.rootGroup.items, row);
  }

  protected findRowIndexInGroupByID(id: Row['id']) {
    return _.findIndex(this.rootGroup.items, { id });
  }

  protected findRowInGroupByIndex(index: number) {
    return this.rootGroup.items[index];
  }

  protected markGroupAsChanged() {
    this.rootGroup = this.rootGroup.clone();
  }

  protected checkCanAddRowInGroup() {
    let disableAddRowInGroup = true;
    if (this.groupingColumns.size) {
      disableAddRowInGroup = _.some([...this.groupingColumns.values()], (c) =>
        FIELD_READONLY.has(c.field.dataType),
      );
    }
    this.disableAddRowInGroup = disableAddRowInGroup;
  }

  protected sortGroupPredicate(
    groupingColumns: Column[],
    currentRow: Row,
    rowCompared: Row,
    depth: number,
  ) {
    const column = groupingColumns[groupingColumns.length - depth];
    if (!column) return null;

    return this.sortColumnPredicate(
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

  protected parseGroupMetadataPredicate(groupingColumns: Column[], group: Group) {
    const idx = groupingColumns.length - (group.totalChildrenDepth + 1);
    const column = groupingColumns[idx];
    let data;

    if (column) {
      data = group.items[0]?.data?.[column.id] ?? null;
    }

    return {
      column,
      data,
      isEmpty: _.isEmpty(data),
      isCollapsed: this.collapsedGroupState.get(group.id) ?? false,
    };
  }

  private _toggleGroup(group: Group, isCollapse: boolean) {
    group.metadata.isCollapsed = isCollapse;
    this.collapsedGroupState.set(group.id, group.metadata.isCollapsed);
  }

  private _toggleGroupRecursive(group: Group, isCollapse: boolean) {
    this._toggleGroup(group, isCollapse);
    if (group.children?.length) {
      for (const child of group.children) {
        this._toggleGroupRecursive(child, isCollapse);
      }
    }
  }
  /* GROUP CLASS */
}
