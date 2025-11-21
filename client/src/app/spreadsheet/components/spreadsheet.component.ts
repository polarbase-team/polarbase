import _ from 'lodash';
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
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResizableModule } from 'angular-resizable-element';
import { fromEvent, map, merge, distinctUntilChanged, filter, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Chip } from 'primeng/chip';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Checkbox } from 'primeng/checkbox';
import { ContextMenu } from 'primeng/contextmenu';
import { Clipboard } from '../helpers/clipboard';
import { Keyboard } from '../helpers/keyboard';
import {
  _ScrollEvent,
  VirtualScrollComponent,
} from './sub-components/virtual-scroll/virtual-scroll.component';
import { FieldCellService } from './sub-components/cells/field-cell.service';
import {
  Cell,
  CellIndex,
  TableCellAction,
  TableCellActionType,
} from './services/table-cell.service';
import { Column, TableColumnAction, TableColumnActionType } from './services/table-column.service';
import { Config, Dimension, SearchInfo } from './services/table.service';
import { Row, TableRowAction, TableRowActionType } from './services/table-row.service';
import { Group } from './services/table-group.service';
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
import { TableColumnService } from './services/table-column.service';
import { TableRowService } from './services/table-row.service';
import { TableCellService } from './services/table-cell.service';
import { TableGroupService } from './services/table-group.service';
import { TableService } from './services/table.service';

export * from './services/table.service';
export * from './services/table-cell.service';
export * from './services/table-column.service';
export * from './services/table-row.service';
export * from './services/table-group.service';

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
  providers: [
    MessageService,
    FieldCellService,
    TableService,
    TableColumnService,
    TableRowService,
    TableCellService,
    TableGroupService,
  ],
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
  tableService = inject(TableService);
  tableColumnService = inject(TableColumnService);
  tableRowService = inject(TableRowService);
  tableCellService = inject(TableCellService);
  tableGroupService = inject(TableGroupService);

  readonly destroyRef = inject(DestroyRef);
  protected readonly cdRef = inject(ChangeDetectorRef);
  protected readonly vcRef = inject(ViewContainerRef);
  readonly elementRef = inject(ElementRef);
  protected readonly renderer = inject(Renderer2);
  protected readonly ngZone = inject(NgZone);
  protected readonly toastService = inject(MessageService);
  protected readonly fieldCellService = inject(FieldCellService);
  @ViewChild(VirtualScrollComponent, { static: true })
  readonly virtualScroll: VirtualScrollComponent;
  @ViewChild('fillHanlder')
  protected readonly fillHander: ElementRef<HTMLElement>;
  protected isHideSummaryLabel = false;
  isMouseHolding = false;
  isMouseHiding = false;
  readonly Dimension = Dimension;

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
    this.tableService.host =
      this.tableColumnService.host =
      this.tableRowService.host =
      this.tableCellService.host =
      this.tableGroupService.host =
        this;

    stack.push(this);

    this.destroyRef.onDestroy(() => {
      stack.splice(stack.indexOf(this), 1);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.tableService.OnChanges(changes);
    this.tableCellService.OnChanges(changes);
    this.tableColumnService.OnChanges(changes);
    this.tableRowService.OnChanges(changes);
    this.tableGroupService.OnChanges(changes);

    this.updateStates();
  }

  ngOnInit() {
    this.tableService.OnInit();
    this.tableCellService.OnInit();
    this.tableColumnService.OnInit();
    this.tableRowService.OnInit();
    this.tableGroupService.OnInit();

    this.updateStates();

    this.ngZone.runOutsideAngular(() =>
      Promise.resolve().then(() => {
        this._handlePointerEvents();
        this._handleKeyboardEvents();
        this._handleClipboardEvents();

        merge(
          this.cellAction.pipe(
            filter(
              (
                event,
              ): event is Extract<TableCellAction, { type: typeof TableCellActionType.Select }> =>
                event.type === TableCellActionType.Select,
            ),
          ),
          this.columnAction.pipe(
            filter(
              (
                event,
              ): event is Extract<
                TableColumnAction,
                { type: typeof TableColumnActionType.Select }
              > => event.type === TableColumnActionType.Select,
            ),
          ),
          this.rowAction.pipe(
            filter(
              (
                event,
              ): event is Extract<TableRowAction, { type: typeof TableRowActionType.Select }> =>
                event.type === TableRowActionType.Select,
            ),
          ),
        )
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
    this.tableService.AfterContentInit();
    this.tableCellService.AfterContentInit();
    this.tableColumnService.AfterContentInit();
    this.tableRowService.AfterContentInit();
    this.tableGroupService.AfterContentInit();
  }

  ngAfterContentChecked() {
    this.tableService.AfterContentChecked();
    this.tableCellService.AfterContentChecked();
    this.tableColumnService.AfterContentChecked();
    this.tableRowService.AfterContentChecked();
    this.tableGroupService.AfterContentChecked();
  }

  ngAfterViewInit() {
    this.tableService.AfterViewInit();
    this.tableCellService.AfterViewInit();
    this.tableColumnService.AfterViewInit();
    this.tableRowService.AfterViewInit();
    this.tableGroupService.AfterViewInit();
  }

  ngAfterViewChecked() {
    this.tableService.AfterViewChecked();
    this.tableCellService.AfterViewChecked();
    this.tableColumnService.AfterViewChecked();
    this.tableRowService.AfterViewChecked();
    this.tableGroupService.AfterViewChecked();
  }

  ngOnDestroy() {
    this.tableService.OnDestroy();
    this.tableCellService.OnDestroy();
    this.tableColumnService.OnDestroy();
    this.tableRowService.OnDestroy();
    this.tableGroupService.OnDestroy();

    this.fieldCellService.destroy();

    this._keyboard.stop();
    this._clipboard.stop();
  }

  updateStates() {
    this.tableCellService.updateStates();
    this.tableColumnService.updateStates();
    this.tableRowService.updateStates();
    this.tableGroupService.updateStates();
    this.tableService.updateStates();
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

      this.tableCellService.deselectAllCells();
      this.tableColumnService.deselectAllColumns();
      this.tableRowService.deselectAllRows();
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
      if (this.tableService.layoutProps.fillHandler.index) {
        this.tableService.updateFillHandlerPosition(undefined, true);
      }
    });
  }

  protected disableScroll = () => {
    if (this.tableService.layoutProps.cell.invalid) return true;

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
            this.tableCellService.deselectAllCells();
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
            this.tableRowService.flushDraftRow();
            this.tableCellService.deselectAllCells();
            this.tableColumnService.deselectAllColumns();

            this.detectChanges();
          });
          return;
        }

        let startCellIdx: CellIndex;
        let endCellIdx: CellIndex;
        let isTouchEvent: boolean;
        let delayEditCellFn: ReturnType<typeof setTimeout>;

        const isFillHandlerActive = !!this.fillHander?.nativeElement.contains(target);
        const currSelection = this.tableService.layoutProps.cell.selection;
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
          startCellIdx = this.tableCellService.findCellByElement(target, 'row');

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

            endCellIdx = this.tableCellService.findCellByElement(e2.target as HTMLElement, 'row');

            if (!endCellIdx || _.isNaN(endCellIdx.rowIndex)) {
              return;
            }

            const compared = this.tableCellService.compareCellIndex(startCellIdx, endCellIdx);

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

                this.tableService.layoutProps.cell.filling = {
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
            const cellFilling = this.tableService.layoutProps.cell.filling;

            cellFilling.isReverse
              ? this._selectCellsInZone(cellFilling.start, currSelection.end, true)
              : this._selectCellsInZone(currSelection.start, cellFilling.end, true);

            this.tableCellService.fillCells(
              [currSelection.start, currSelection.end],
              [cellFilling.start, cellFilling.end],
              cellFilling.isReverse,
            );

            this.tableService.layoutProps.cell.filling = null;

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
          return (
            shouldPause && (e.code !== 'Escape' || !this.tableService.layoutProps.cell.invalid)
          );
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
              this.tableCellService.moveToCell('above');
            });
            break;
          case 'Shift.ArrowUp':
            processAfterKeyMatch(() => {
              this.tableCellService.extendSelectedCells('above');
            });
            break;
          case 'ArrowDown':
          case 'Enter':
            processAfterKeyMatch(() => {
              this.tableCellService.moveToCell('below');
            });
            break;
          case 'Shift.ArrowDown':
            processAfterKeyMatch(() => {
              this.tableCellService.extendSelectedCells('below');
            });
            break;
          case 'ArrowLeft':
          case 'Shift.Tab':
            processAfterKeyMatch(() => {
              this.tableCellService.moveToCell('before');
            });
            break;
          case 'Shift.ArrowLeft':
            processAfterKeyMatch(() => {
              this.tableCellService.extendSelectedCells('before');
            });
            break;
          case 'ArrowRight':
          case 'Tab':
            processAfterKeyMatch(() => {
              this.tableCellService.moveToCell('after');
            });
            break;
          case 'Shift.ArrowRight':
            processAfterKeyMatch(() => {
              this.tableCellService.extendSelectedCells('after');
            });
            break;
          case 'Shift.Enter':
            processAfterKeyMatch(() => {
              this.tableRowService.addRow();
            });
            break;
          case 'Backspace':
          case 'Delete':
            processAfterKeyMatch(() => {
              this.tableCellService.clearInteractiveCells();
            });
            break;
          case 'Space':
            processAfterKeyMatch(() => {
              this.tableRowService.expandSelectingRow();
            });
            break;
          case 'Escape':
            processAfterKeyMatch(() => {
              this.tableCellService.revertSelectingCellState();
            });
            break;
          case 'Cmd.KeyA':
            processAfterKeyMatch(() => {
              this.tableCellService.deselectAllCells();
              this.tableColumnService.deselectAllColumns();
              this.tableRowService.selectAllRows();
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
        this.tableCellService.copyInteractiveCells(this._clipboard);
      });
    });

    this._clipboard.cut$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.ngZone.run(() => {
        this.tableCellService.cutCells(data);
      });
    });

    this._clipboard.paste$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.ngZone.run(() => {
        this.tableCellService.pasteCells(data);

        this.markForCheck();
      });
    });
  }

  private _selectCellInZone(index: CellIndex) {
    if (
      this.tableService.layoutProps.cell.selection &&
      this.tableCellService.compareCellIndex(
        this.tableService.layoutProps.cell.selection.primary,
        index,
      ) === 0
    ) {
      return;
    }

    this.ngZone.run(() => {
      this.tableCellService.selectCells(index, index, true);

      this.detectChanges();
    });
  }

  private _selectCellsInZone(startIdx: CellIndex, endIdx: CellIndex, extend: boolean = false) {
    if (
      this.tableService.layoutProps.cell.selection &&
      this.tableCellService.compareCellIndex(
        this.tableService.layoutProps.cell.selection.start,
        startIdx,
      ) === 0 &&
      this.tableCellService.compareCellIndex(
        this.tableService.layoutProps.cell.selection.end,
        endIdx,
      ) === 0
    ) {
      return;
    }

    this.ngZone.run(() => {
      this.tableCellService.selectCells(startIdx, endIdx, false, extend);

      this.detectChanges();
    });
  }

  private _shouldPauseEvent(e: Event, customizer?: (shouldPause: boolean) => boolean): boolean {
    let shouldPause =
      !!this.tableService.layoutProps.cell.invalid ||
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

    const index = this.tableCellService.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { columnIndex } = index;
    const column = this.tableColumnService.findColumnByIndex(columnIndex);
    this.tableColumnService.openColumnActionMenu(e, column, columnIndex);
  }

  private _closeColumnActionMenu() {
    if (!this.columnActionMenu.visible()) return;

    this.columnActionMenu.hide();
  }

  private _openRowActionMenu(e: MouseEvent) {
    if (this.rowActionMenu.visible()) return;

    const index = this.tableCellService.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { rowIndex } = index;
    const row = this.tableRowService.findRowByIndex(rowIndex);

    if (row && !row.selected) {
      this._selectCellInZone(index);
    }

    if (this.isMouseHolding || this.tableRowService.checkRowIsDraft(row)) {
      return;
    }

    let group: Group;
    let rowGroupIndex: number;

    if (this.tableGroupService.isGrouping) {
      group = this.tableGroupService.findGroupByRowIndex(rowIndex);
      rowGroupIndex = this.tableGroupService.findRowGroupIndex(group, row);
    }

    this.tableRowService.openRowActionMenu(e, row, rowIndex);
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

  @Input() config: Config;
  @Input() context: any;
  streamData$: Subject<Row[]>;

  @Output() searching = new EventEmitter<SearchInfo>();

  @Input() columns: Column[];

  @Output() columnAction = new EventEmitter<TableColumnAction>();

  @ViewChild('columnActionMenu', { static: true })
  readonly columnActionMenu: ContextMenu;

  @Input('rows') rawRows: Row[];
  rows: Row[];

  @Output() rowAction = new EventEmitter<TableRowAction>();

  @ViewChild('rowActionMenu', { static: true })
  readonly rowActionMenu: ContextMenu;

  /* CELL CLASS */
  @Output() cellAction = new EventEmitter<TableCellAction>();
}
