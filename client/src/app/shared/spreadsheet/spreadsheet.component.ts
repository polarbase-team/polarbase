import _ from 'lodash';

import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  contentChild,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular CDK
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Angular Third Party Modules
import { ResizableModule } from 'angular-resizable-element';

// RxJS
import { fromEvent, map, merge, distinctUntilChanged, filter } from 'rxjs';

// PrimeNG
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { Menu, MenuModule } from 'primeng/menu';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { OverlayModule } from 'primeng/overlay';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';

// Utils
import { Clipboard } from './utils/clipboard';
import { Keyboard } from './utils/keyboard';

// Components & Directives
import { VirtualScrollComponent } from './components/virtual-scroll/virtual-scroll.component';
import { VirtualScrollViewportComponent } from './components/virtual-scroll/virtual-scroll-viewport.component';
import { DataViewOptionsComponent } from './components/view-options/data-view-options.component';
import { FieldCellService } from './components/field-cell/field-cell.service';

import { VirtualScrollGroupRepeaterDirective } from './components/virtual-scroll/virtual-scroll-group-repeater.directive';
import { VirtualScrollColumnRepeaterDirective } from './components/virtual-scroll/virtual-scroll-column-repeater.directive';
import { VirtualScrollRowRepeaterDirective } from './components/virtual-scroll/virtual-scroll-row-repeater.directive';
import {
  VirtualScrollLeftContentWrapperComponent,
  VirtualScrollRightContentWrapperComponent,
} from './components/virtual-scroll/virtual-scroll-content-wrapper.component';
import { FieldCellFactoryDirective } from './components/field-cell/field-cell-factory.directive';

// Services
import { TableColumnService } from './services/table-column.service';
import { TableRowService } from './services/table-row.service';
import { TableCellService, CellIndex } from './services/table-cell.service';
import { TableGroupService } from './services/table-group.service';
import { TableService, Dimension } from './services/table.service';

// Events & Models
import { TableAction } from './events/table';
import { TableCellAction, TableCellActionType } from './events/table-cell';
import { TableRowAction, TableRowActionType } from './events/table-row';
import { TableColumnAction, TableColumnActionType } from './events/table-column';

import { TableConfig } from './models/table';
import { TableColumn } from './models/table-column';
import { TableRow } from './models/table-row';
import { TableGroup } from './models/table-group';
import { ParseCalculatedResultPipe } from './pipes/parse-calculated-result.pipe';
import { ColumnViewOptionsComponent } from './components/view-options/column-view-options.component';

const stack: SpreadsheetComponent[] = [];

@Component({
  selector: 'spreadsheet',
  templateUrl: './spreadsheet.component.html',
  styleUrl: './spreadsheet.component.scss',
  host: {
    class: 'spreadsheet',
    '[class.spreadsheet--right-scrolled]': 'virtualScroll.scrollLeft() > 0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ScrollingModule,
    ResizableModule,
    TooltipModule,
    SkeletonModule,
    CheckboxModule,
    ChipModule,
    ToastModule,
    MenuModule,
    ContextMenuModule,
    OverlayModule,
    MessageModule,
    ConfirmDialogModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputIconModule,
    IconFieldModule,
    ButtonModule,
    VirtualScrollComponent,
    VirtualScrollViewportComponent,
    VirtualScrollGroupRepeaterDirective,
    VirtualScrollColumnRepeaterDirective,
    VirtualScrollRowRepeaterDirective,
    VirtualScrollLeftContentWrapperComponent,
    VirtualScrollRightContentWrapperComponent,
    FieldCellFactoryDirective,
    DataViewOptionsComponent,
    ParseCalculatedResultPipe,
    ColumnViewOptionsComponent,
  ],
  providers: [
    MessageService,
    ConfirmationService,
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
  sourceConfig = input<TableConfig>({}, { alias: 'config' });
  sourceColumns = input<TableColumn[]>([], { alias: 'columns' });
  sourceRows = input<TableRow[]>([], { alias: 'rows' });

  action = output<TableAction>();
  columnAction = output<TableColumnAction>();
  rowAction = output<TableRowAction>();
  cellAction = output<TableCellAction>();

  toolbarTemplate = contentChild<TemplateRef<any>>('toolbar');

  @ViewChild('menu', { static: true }) menu: Menu;
  @ViewChild('contextMenu', { static: true }) contextMenu: ContextMenu;
  @ViewChild('fillHandle') fillHandle: ElementRef<HTMLElement>;
  @ViewChild(VirtualScrollComponent, { static: true }) virtualScroll: VirtualScrollComponent;

  tableService = inject(TableService);
  tableColumnService = inject(TableColumnService);
  tableRowService = inject(TableRowService);
  tableCellService = inject(TableCellService);
  tableGroupService = inject(TableGroupService);
  isMouseHolding = false;
  isKeyboardNavigating = false;
  menuItems: MenuItem[] | undefined;

  protected Dimension = Dimension;
  protected isHideSummaryLabel = false;

  private cdRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private renderer = inject(Renderer2);
  private confirmationService = inject(ConfirmationService);
  private fieldCellService = inject(FieldCellService);
  private keyboard: Keyboard;
  private clipboard: Clipboard;
  private scrollAnimationFrame: number;

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
    this.tableService.onChanges(changes);
    this.tableCellService.onChanges(changes);
    this.tableColumnService.onChanges(changes);
    this.tableRowService.onChanges(changes);
    this.tableGroupService.onChanges(changes);
  }

  ngOnInit() {
    this.tableService.onInit();
    this.tableCellService.onInit();
    this.tableColumnService.onInit();
    this.tableRowService.onInit();
    this.tableGroupService.onInit();

    Promise.resolve().then(() => {
      this.handlePointerEvents();
      this.handleKeyboardEvents();
      this.handleClipboardEvents();

      merge(
        outputToObservable(this.columnAction).pipe(
          filter(
            (
              event,
            ): event is Extract<TableColumnAction, { type: typeof TableColumnActionType.Select }> =>
              event.type === TableColumnActionType.Select,
          ),
        ),
        outputToObservable(this.rowAction).pipe(
          filter(
            (event): event is Extract<TableRowAction, { type: typeof TableRowActionType.Select }> =>
              event.type === TableRowActionType.Select,
          ),
        ),
        outputToObservable(this.cellAction).pipe(
          filter(
            (
              event,
            ): event is Extract<TableCellAction, { type: typeof TableCellActionType.Select }> =>
              event.type === TableCellActionType.Select,
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
            this.keyboard.disable();
            this.clipboard.disable();
            return;
          }

          this.keyboard.enable();
          this.clipboard.enable();
        });
    });
  }

  ngAfterContentInit() {
    this.tableService.afterContentInit();
    this.tableCellService.afterContentInit();
    this.tableColumnService.afterContentInit();
    this.tableRowService.afterContentInit();
    this.tableGroupService.afterContentInit();
  }

  ngAfterContentChecked() {
    this.tableService.afterContentChecked();
    this.tableCellService.afterContentChecked();
    this.tableColumnService.afterContentChecked();
    this.tableRowService.afterContentChecked();
    this.tableGroupService.afterContentChecked();
  }

  ngAfterViewInit() {
    this.tableService.afterViewInit();
    this.tableCellService.afterViewInit();
    this.tableColumnService.afterViewInit();
    this.tableRowService.afterViewInit();
    this.tableGroupService.afterViewInit();
  }

  ngAfterViewChecked() {
    this.tableService.afterViewChecked();
    this.tableCellService.afterViewChecked();
    this.tableColumnService.afterViewChecked();
    this.tableRowService.afterViewChecked();
    this.tableGroupService.afterViewChecked();
  }

  ngOnDestroy() {
    this.tableService.onDestroy();
    this.tableCellService.onDestroy();
    this.tableColumnService.onDestroy();
    this.tableRowService.onDestroy();
    this.tableGroupService.onDestroy();

    this.fieldCellService.destroy();
    this.keyboard.destroy();
    this.clipboard.destroy();
  }

  detectChanges() {
    this.cdRef.detectChanges();
  }

  markForCheck() {
    this.cdRef.markForCheck();
  }

  deleteConfirmation(message: string, header: string, onAccept: () => void, onReject: () => void) {
    this.confirmationService.confirm({
      target: null,
      message,
      header,
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: onAccept,
      reject: onReject,
    });
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

  protected onViewportScrolling() {
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }

    this.scrollAnimationFrame = requestAnimationFrame(() => {
      if (this.tableService.layout.fillHandle.index) {
        this.tableService.positionFillHandle(undefined, true);
      }
    });
  }

  protected disableScroll = () => {
    if (this.tableService.layout.cell.invalid) return true;

    return !!this.fieldCellService.getSelectingState()?.isEditing;
  };

  private handlePointerEvents() {
    fromEvent<PointerEvent>(document, 'pointerdown', { capture: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e1) => {
        const isRightClick = e1.button === 2;
        const shouldIgnore: boolean =
          !(isRightClick && this.contextMenu.visible()) && this.shouldIgnoreEvent(e1);
        if (shouldIgnore) return;

        const target = e1.target as HTMLElement;

        this.contextMenu.hide();

        if (isRightClick) {
          this.tableCellService.deselectAllCells();

          const el = target.closest('[cell-type]');
          const type = el?.getAttribute('cell-type');
          switch (type) {
            case 'column':
              this.openColumnContextMenu(e1);
              break;
            case 'row':
              this.openRowContextMenu(e1);
              break;
            case 'group':
              this.openGroupContextMenu(e1);
              break;
          }
          return;
        }

        const isSafe =
          target.hasAttribute('safe-area') ||
          !!target.closest('[safe-area]') ||
          !document.contains(target);

        if (!isSafe) {
          this.tableRowService.flushPendingRow();
          this.tableCellService.deselectAllCells();
          this.tableColumnService.deselectAllColumns();
          return;
        }

        let startCellIdx: CellIndex;
        let endCellIdx: CellIndex;
        let isTouchEvent: boolean;
        let delayEditCellFn: number;

        const isFillHandleActive = !!this.fillHandle?.nativeElement.contains(target);
        const currSelection = this.tableService.layout.cell.selection;
        const anchorCellIdxInSelection = currSelection?.anchor;

        if (isFillHandleActive) {
          startCellIdx = {
            rowIndex: Math.max(currSelection.start.rowIndex, anchorCellIdxInSelection.rowIndex),
            columnIndex: Math.min(
              currSelection.start.columnIndex,
              anchorCellIdxInSelection.columnIndex,
            ),
          };
        } else {
          startCellIdx = this.tableCellService.findCellByElement(target, 'row');

          if (!startCellIdx) return;

          if (anchorCellIdxInSelection) {
            if (e1.shiftKey) {
              this.selectCells(anchorCellIdxInSelection, startCellIdx);
              return;
            }

            // Prevent multiple cell selection
            // if at least one cell is being edited
            // or edit on same cell.
            if (
              anchorCellIdxInSelection.rowIndex === startCellIdx.rowIndex &&
              anchorCellIdxInSelection.columnIndex === startCellIdx.columnIndex
            ) {
              return;
            }
          }

          isTouchEvent = e1.pointerType === 'touch';

          if (isTouchEvent) {
            delayEditCellFn = setTimeout(() => {
              this.selectCell(startCellIdx);
            }, 50);
          } else {
            this.selectCell(startCellIdx);
          }
        }

        let currentAnimationFrame: number;

        const unlisten1 = this.renderer.listen(document, 'pointermove', (e2) => {
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

            if (isFillHandleActive) {
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

              this.tableService.layout.cell.fill = {
                start,
                end,
                isReverse,
              };

              this.detectChanges();
            } else {
              this.selectCells(startCellIdx, endCellIdx, true);
            }
          });
        });

        const unlisten2 = this.renderer.listen(document, 'pointerup', () => {
          unlisten1();
          unlisten2();

          this.isMouseHolding = false;

          if (isFillHandleActive) {
            const cellFilling = this.tableService.layout.cell.fill;

            cellFilling.isReverse
              ? this.selectCells(cellFilling.start, currSelection.end, true)
              : this.selectCells(currSelection.start, cellFilling.end, true);

            this.tableCellService.fillCells(
              [currSelection.start, currSelection.end],
              [cellFilling.start, cellFilling.end],
              cellFilling.isReverse,
            );

            this.tableService.layout.cell.fill = null;

            this.detectChanges();
          }
        });
      });
  }

  private handleKeyboardEvents() {
    this.keyboard = new Keyboard({
      disabled: true,
      shouldIgnoreEvent: (e) =>
        this.shouldIgnoreEvent(e, (shouldIgnore) => {
          return shouldIgnore && (e.code !== 'Escape' || !this.tableService.layout.cell.invalid);
        }),
    });

    let unlisten: () => void;
    let currentAnimationFrame: number;

    const processAfterKeyMatch = (fn: () => void) => {
      this.isKeyboardNavigating = true;

      unlisten ||= this.renderer.listen(document, 'mousemove', () => {
        unlisten();

        unlisten = null;

        this.isKeyboardNavigating = false;
      });

      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame);
      }

      currentAnimationFrame = requestAnimationFrame(() => {
        fn();
        this.detectChanges();
      });
    };

    this.keyboard.keydown$
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
              this.tableCellService.navigateToCell('above');
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
              this.tableCellService.navigateToCell('below');
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
              this.tableCellService.navigateToCell('before');
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
              this.tableCellService.navigateToCell('after');
            });
            break;
          case 'Shift.ArrowRight':
            processAfterKeyMatch(() => {
              this.tableCellService.extendSelectedCells('after');
            });
            break;
          case 'Shift.Enter':
            processAfterKeyMatch(() => {
              this.tableRowService.addNewRow();
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

    this.keyboard.keyup$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isKeyboardNavigating = false;
    });
  }

  private handleClipboardEvents() {
    this.clipboard = new Clipboard({
      disabled: true,
      shouldIgnoreEvent: (e) => this.shouldIgnoreEvent(e),
    });

    this.clipboard.copy$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.tableCellService.copyInteractiveCells(this.clipboard);
    });

    this.clipboard.cut$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.tableCellService.cutCells(data);
    });

    this.clipboard.paste$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([_e, data]) => {
      this.tableCellService.pasteCells(data);
    });
  }

  private selectCell(index: CellIndex) {
    if (
      this.tableService.layout.cell.selection &&
      this.tableCellService.compareCellIndex(
        this.tableService.layout.cell.selection.anchor,
        index,
      ) === 0
    ) {
      return;
    }

    this.tableCellService.selectCells(index, index, true);
    this.detectChanges();
  }

  private selectCells(startIdx: CellIndex, endIdx: CellIndex, extend = false) {
    if (
      this.tableService.layout.cell.selection &&
      this.tableCellService.compareCellIndex(
        this.tableService.layout.cell.selection.start,
        startIdx,
      ) === 0 &&
      this.tableCellService.compareCellIndex(
        this.tableService.layout.cell.selection.end,
        endIdx,
      ) === 0
    ) {
      return;
    }

    this.tableCellService.selectCells(startIdx, endIdx, false, extend);
    this.detectChanges();
  }

  private shouldIgnoreEvent(e: Event, customizer?: (shouldIgnore: boolean) => boolean) {
    let shouldIgnore =
      !!this.tableService.layout.cell.invalid ||
      this.checkOverlapedByOtherSpreadsheet() ||
      this.checkOverlapedByOverlay(e.target);

    if (_.isFunction(customizer)) {
      shouldIgnore = customizer(shouldIgnore);
    }

    return shouldIgnore;
  }

  private checkOverlapedByOtherSpreadsheet() {
    return stack[stack.length - 1] !== this;
  }

  private checkOverlapedByOverlay(target?: EventTarget) {
    return !!(target as HTMLElement)?.closest(
      '.ng-trigger-overlayAnimation, .p-dialog-mask, .p-drawer',
    );
  }

  private openColumnContextMenu(e: MouseEvent) {
    const index = this.tableCellService.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { columnIndex } = index;
    const column = this.tableColumnService.columnAt(columnIndex);
    setTimeout(() => {
      this.tableColumnService.openContextMenu(e, column, columnIndex);
    });
  }

  private openRowContextMenu(e: MouseEvent) {
    const index = this.tableCellService.findCellByElement(e.target as HTMLElement);
    if (!index) return;

    const { rowIndex } = index;
    const row = this.tableRowService.rowAt(rowIndex);

    if (row && !row.selected) {
      this.selectCell(index);
    }

    if (this.isMouseHolding || this.tableRowService.isPendingRow(row)) {
      return;
    }

    let group: TableGroup;
    let rowGroupIndex: number;
    if (this.tableGroupService.isGrouped()) {
      group = this.tableGroupService.findGroupByRowIndex(rowIndex);
      rowGroupIndex = this.tableGroupService.findRowIndexInGroup(group, row);
    }

    setTimeout(() => {
      this.tableRowService.openContextMenu(e, row, rowIndex, group, rowGroupIndex);
    });
  }

  private openGroupContextMenu(e: MouseEvent) {
    setTimeout(() => {
      this.tableGroupService.openContextMenu(e);
    });
  }
}
