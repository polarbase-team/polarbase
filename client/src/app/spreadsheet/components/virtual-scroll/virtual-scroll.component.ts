import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Point } from '@angular/cdk/drag-drop';
import {
  animationFrames,
  animationFrameScheduler,
  audit,
  debounceTime,
  filter,
  fromEvent,
  interval,
  startWith,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';

import {
  ViewportSizeUpdatedEvent,
  VirtualScrollViewportComponent,
} from './virtual-scroll-viewport.component';

type ScrollOrientation = 'horizontal' | 'vertical';

type ScrollOrientationLayout = {
  ratio: number;
  max: number;
  track: { offset: Point; size: number };
  thumb: { position: number; size: number };
  available: boolean;
};

type ScrollLayout = {
  horizontal: ScrollOrientationLayout;
  vertical: ScrollOrientationLayout;
};

type ScrollEvent = {
  scrollLeft: number;
  scrollTop: number;
  scrollingX: Scrolling;
  scrollingY: Scrolling;
};

type Scrolling = 'to-start' | 'to-end' | boolean;

const IS_MACOS: boolean = /Mac/i.test(navigator.userAgent);
const SCROLLBAR_TRACK_SIZE: number = 10;
const SCROLLBAR_THUMB_MIN_SIZE: number = 20;
const AUTO_SCROLL_ALLOW_RANGE: number = 100;
const AUTO_SCROLL_STEP: number = 5;
const AUTO_SCROLL_HOLDER: string = 'virtualScrollAutoScrollHolder';
const SCROLL_EXTRA_WIDTH: number = 80;
const SCROLL_EXTRA_HEIGHT: number = 80;
const SCROLL_LONG_DISTANCE: number = 1200;

export type _ScrollEvent = ScrollEvent;
export type _Scrolling = Scrolling;

@Component({
  selector: 'virtual-scroll, [virtualScroll]',
  templateUrl: './virtual-scroll.html',
  styleUrls: ['./virtual-scroll.scss'],
  host: { class: 'virtual-scroll' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollComponent implements AfterContentInit, OnDestroy {
  @ContentChild(VirtualScrollViewportComponent, { static: true })
  readonly viewport: VirtualScrollViewportComponent;

  @Input() sideSpacing: number;
  @Input() disable: () => boolean;

  @Output() readonly scrolling: EventEmitter<ScrollEvent> = new EventEmitter<ScrollEvent>();

  @ViewChild('horizontalThumb', { static: true })
  protected readonly horizontalThumb: ElementRef;
  @ViewChild('verticalThumb', { static: true })
  protected readonly verticalThumb: ElementRef;

  protected readonly layout: ScrollLayout = {
    horizontal: {
      ratio: 0,
      max: 0,
      track: {
        offset: { x: 0, y: 0 },
        size: 0,
      },
      thumb: { position: 0, size: 0 },
      available: false,
    },
    vertical: {
      ratio: 0,
      max: 0,
      track: {
        offset: { x: 0, y: 0 },
        size: 0,
      },
      thumb: { position: 0, size: 0 },
      available: false,
    },
  };

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly _elementRef: ElementRef = inject(ElementRef);
  private readonly _stopSubEvent$: Subject<void> = new Subject<void>();

  private _isAutoScroll: boolean = false;
  private _scrollLeft: number = 0;
  private _scrollTop: number = 0;
  private _scrollingX: Scrolling = false;
  private _scrollingY: Scrolling = false;
  private _isLongScrollingX: boolean = false;
  private _isLongScrollingY: boolean = false;
  private _isScrollCompleted: boolean = true;
  private _momentumAnimationFrame: number;

  @HostBinding('class.virtual-scroll--scrolling')
  get classScrolling() {
    return this.isScrolling && !this._isAutoScroll;
  }

  get isScrolling(): boolean {
    return this.scrollingX || this.scrollingY;
  }

  get isLongScrollingX(): boolean {
    return this._isLongScrollingX;
  }

  get isLongScrollingY(): boolean {
    return this._isLongScrollingY;
  }

  get isScrollCompleted(): boolean {
    return this._isScrollCompleted;
  }

  get scrollLeft(): number {
    return this._scrollLeft;
  }
  get scrollTop(): number {
    return this._scrollTop;
  }

  get scrollingX(): boolean {
    return this._scrollingX !== false;
  }
  get scrollingY(): boolean {
    return this._scrollingY !== false;
  }

  get scrollWidth(): number {
    return this.viewport.contentWidth + SCROLL_EXTRA_WIDTH;
  }
  get scrollHeight(): number {
    return this.viewport.contentHeight + SCROLL_EXTRA_HEIGHT;
  }

  get scrollDivideOffset(): number {
    return this.viewport.leftWidth + this.sideSpacing;
  }

  get scrollLayout(): ScrollLayout {
    return this.layout;
  }

  ngAfterContentInit() {
    Promise.resolve().then(() => {
      let wheelAnimationFrame: number;
      fromEvent<WheelEvent>(this._elementRef.nativeElement, 'wheel')
        .pipe(
          filter((): boolean => !this.disable?.()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe((e) => {
          e.stopPropagation();
          e.preventDefault();

          this._stopSubEvent$.next();

          if (wheelAnimationFrame) {
            cancelAnimationFrame(wheelAnimationFrame);

            wheelAnimationFrame = null;
          }

          wheelAnimationFrame = requestAnimationFrame(() => {
            this._onWheel(e);
          });
        });

      fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown')
        .pipe(
          filter((): boolean => !this.disable?.()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe(this._onPointerDown.bind(this));

      fromEvent<PointerEvent>(this.horizontalThumb.nativeElement, 'pointerdown')
        .pipe(
          filter((): boolean => !this.disable?.()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe(this._onThumbPointerdown.bind(this, 'horizontal'));

      fromEvent<PointerEvent>(this.verticalThumb.nativeElement, 'pointerdown')
        .pipe(
          filter((): boolean => !this.disable?.()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe(this._onThumbPointerdown.bind(this, 'vertical'));

      this.scrolling
        .pipe(
          debounceTime(200),
          tap(() => {
            this._scrollingX = this._scrollingY = false;
            this.markForCheck();
          }),
          debounceTime(300),
          tap(() => {
            this._isLongScrollingX = this._isLongScrollingY = false;
            this.markForCheck();
          }),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe();

      this.viewport.sizeUpdated
        .pipe(
          startWith<ViewportSizeUpdatedEvent>({} as ViewportSizeUpdatedEvent),
          audit(() => animationFrames()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe((e) => {
          this._updateLayout();

          this.viewport.measureRangeSize(
            [this._scrollLeft, e.updateOnWidth],
            [this._scrollTop, e.updateOnHeight],
          );
        });
    });
  }

  ngOnDestroy() {
    this._stopSubEvent$.complete();
  }

  detectChanges() {
    this._cdRef.detectChanges();
  }

  markForCheck() {
    this._cdRef.markForCheck();
  }

  scrollBy(options: ScrollToOptions) {
    let scrollLeft: number = this._scrollLeft;
    let scrollTop: number = this._scrollTop;

    if (options.left) {
      scrollLeft += options.left;
    }

    if (options.top) {
      scrollTop += options.top;
    }

    this._scrollTo(scrollLeft, scrollTop);
  }

  scrollTo(options: ScrollToOptions) {
    this._scrollTo(options.left, options.top);
  }

  scrollToLeft() {
    this.scrollTo({ left: 0 });
  }

  scrollToRight() {
    this.scrollTo({ left: this.layout.horizontal.max });
  }

  scrollToTop() {
    this.scrollTo({ top: 0 });
  }

  scrollToBottom() {
    this.scrollTo({ top: this.layout.vertical.max });
  }

  measurePointerOffset(pointerPosition: Point): Point {
    const { left, top, width, height }: DOMRect = this.viewport.element.getBoundingClientRect();
    const { x, y }: Point = pointerPosition;
    let offsetX: number = null;
    let offsetY: number = null;

    if (x >= left && x <= left + width) {
      offsetX = x - left + this._scrollLeft;
    }

    if (y >= top && y <= top + height) {
      offsetY = y - top + this._scrollTop;
    }

    return { x: offsetX, y: offsetY };
  }

  private _onWheel(e: WheelEvent) {
    let left: number = this._scrollLeft;
    let top: number = this._scrollTop;

    if (e.shiftKey) {
      if (IS_MACOS) {
        left += e.deltaX;
      } else {
        left += e.deltaY;
      }
    } else {
      left += e.deltaX;
      top += e.deltaY;
    }

    this.scrollTo({ left, top });
  }

  private _onPointerDown(e: PointerEvent) {
    e.pointerType === 'touch' ? this._onPointerTypeIsTouch(e) : this._onPointerTypeIsMouse(e);
  }

  private _onPointerTypeIsMouse(e1: PointerEvent) {
    this._stopSubEvent$.next();

    if (e1.button === 2) return; // Right click

    this._isScrollCompleted = false;

    const { left, top }: DOMRect = this.viewport.element.getBoundingClientRect();
    const stopScrollTimers: Subject<void> = new Subject<void>();
    let dir: string;
    let currentAnimationFrame: number;

    fromEvent<MouseEvent>(document, 'pointermove')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        stopScrollTimers.next();

        if (!this._isAutoScroll) {
          const target: HTMLElement = e2.target as HTMLElement;
          const holder: HTMLElement = target.closest(`[${AUTO_SCROLL_HOLDER}]`);

          if (!holder) return;

          dir = holder.getAttribute(AUTO_SCROLL_HOLDER);
        }

        this._isAutoScroll = true;

        if (currentAnimationFrame) {
          cancelAnimationFrame(currentAnimationFrame);
        }

        currentAnimationFrame = requestAnimationFrame(() => {
          let autoScrollStepX: number;

          if (dir === '' || dir === 'horizontal') {
            if (e2.pageX > left + this.viewport.width - AUTO_SCROLL_ALLOW_RANGE) {
              autoScrollStepX = AUTO_SCROLL_STEP;
            } else if (
              e2.pageX <
              left + this.layout.horizontal.track.offset.x + AUTO_SCROLL_ALLOW_RANGE
            ) {
              autoScrollStepX = -AUTO_SCROLL_STEP;
            }
          }

          let autoScrollStepY: number;

          if (dir === '' || dir === 'vertical') {
            if (e2.pageY > top + this.viewport.height - AUTO_SCROLL_ALLOW_RANGE) {
              autoScrollStepY = AUTO_SCROLL_STEP;
            } else if (
              e2.pageY <
              top + this.layout.vertical.track.offset.y + AUTO_SCROLL_ALLOW_RANGE
            ) {
              autoScrollStepY = -AUTO_SCROLL_STEP;
            }
          }

          if (!autoScrollStepX && !autoScrollStepY) {
            return;
          }

          interval(1, animationFrameScheduler)
            .pipe(
              takeUntil(stopScrollTimers),
              takeUntil(this._stopSubEvent$),
              takeUntilDestroyed(this._destroyRef),
            )
            .subscribe(() => {
              if (this._isScrollCompleted) {
                stopScrollTimers.next();
                return;
              }

              this.scrollBy({
                left: autoScrollStepX,
                top: autoScrollStepY,
              });
            });
        });
      });

    fromEvent<MouseEvent>(document, 'pointerup')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this._stopSubEvent$.next();

        this._isScrollCompleted = true;

        stopScrollTimers.next();

        this._isAutoScroll = false;
      });
  }

  private _onPointerTypeIsTouch(e1: PointerEvent) {
    e1.stopPropagation();
    e1.preventDefault();

    this._stopSubEvent$.next();

    if (this._momentumAnimationFrame) {
      cancelAnimationFrame(this._momentumAnimationFrame);
    }

    this._isScrollCompleted = false;

    const start: Point = { x: e1.pageX, y: e1.pageY };

    let velocityX: number = 0;
    let velocityY: number = 0;
    let currentX: number = this._scrollLeft;
    let currentY: number = this._scrollTop;

    let currentAnimationFrame: number;

    fromEvent<PointerEvent>(document, 'pointermove')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this._isAutoScroll = true;

        if (currentAnimationFrame) {
          cancelAnimationFrame(currentAnimationFrame);
        }

        currentAnimationFrame = requestAnimationFrame(() => {
          const newX: number = e2.pageX;
          const newY: number = e2.pageY;
          const deltaX: number = start.x - newX;
          const deltaY: number = start.y - newY;

          currentX += deltaX;
          currentY += deltaY;
          velocityX = deltaX;
          velocityY = deltaY;

          this.scrollTo({ left: currentX, top: currentY });

          start.x = newX;
          start.y = newY;
        });
      });

    fromEvent<PointerEvent>(document, 'pointerup')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this._stopSubEvent$.next();

        this._isAutoScroll = false;

        const momentum: () => void = () => {
          let isContinue: boolean = false;

          if (Math.abs(velocityX) > 0.1) {
            currentX += velocityX;
            velocityX *= 0.95;

            isContinue = true;
          }

          if (Math.abs(velocityY) > 0.1) {
            currentY += velocityY;
            velocityY *= 0.95;

            isContinue = true;
          }

          if (isContinue) {
            this.scrollTo({ left: currentX, top: currentY });

            this._momentumAnimationFrame = requestAnimationFrame(momentum);

            return;
          }

          if (this._momentumAnimationFrame) {
            cancelAnimationFrame(this._momentumAnimationFrame);
          }

          this._isScrollCompleted = true;
        };

        momentum();
      });
  }

  private _onThumbPointerdown(dir: ScrollOrientation, e1: MouseEvent) {
    this._stopSubEvent$.next();

    if (e1.button === 2) return; // Right click

    e1.stopPropagation();
    e1.preventDefault();

    this._isScrollCompleted = false;

    const currentPos: {
      scrollLeft: number;
      scrollTop: number;
      mouseX: number;
      mouseY: number;
    } = {
      // The current scroll
      scrollLeft: this._scrollLeft,
      scrollTop: this._scrollTop,
      // Get the current mouse position
      mouseX: e1.clientX,
      mouseY: e1.clientY,
    };

    let fn: (e2: MouseEvent) => void;

    switch (dir) {
      case 'horizontal':
        fn = (e2: MouseEvent) => {
          const dx: number = e2.clientX - currentPos.mouseX;

          this.scrollTo({
            left: currentPos.scrollLeft + dx / this.layout.horizontal.ratio,
          });
        };
        break;
      case 'vertical':
        fn = (e2: MouseEvent) => {
          const dy: number = e2.clientY - currentPos.mouseY;

          this.scrollTo({
            top: currentPos.scrollTop + dy / this.layout.vertical.ratio,
          });
        };
        break;
    }

    let currentAnimationFrame: number;

    fromEvent<MouseEvent>(document, 'pointermove')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        if (currentAnimationFrame) {
          cancelAnimationFrame(currentAnimationFrame);
        }

        currentAnimationFrame = requestAnimationFrame(() => {
          e2.stopPropagation();
          e2.preventDefault();

          if (!currentPos) return;

          fn(e2);
        });
      });

    fromEvent<MouseEvent>(document, 'pointerup')
      .pipe(takeUntil(this._stopSubEvent$), takeUntilDestroyed(this._destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this._stopSubEvent$.next();

        this._isScrollCompleted = true;
      });
  }

  private _scrollTo(scrollLeft: number, scrollTop: number) {
    this._updateScroll(scrollLeft, scrollTop);

    this.viewport.measureRangeSize(
      [this._scrollLeft, this._scrollingX],
      [this._scrollTop, this._scrollingY],
    );
  }

  private _updateScroll(
    scrollLeft: number = this._scrollLeft,
    scrollTop: number = this._scrollTop,
  ) {
    scrollLeft = this.layout.horizontal.available
      ? Math.min(Math.max(scrollLeft, 0), this.layout.horizontal.max)
      : 0;
    scrollTop = this.layout.vertical.available
      ? Math.min(Math.max(scrollTop, 0), this.layout.vertical.max)
      : 0;

    const offsetX: number = scrollLeft - this._scrollLeft;
    let scrollingX: Scrolling = false;

    if (offsetX > 0) {
      scrollingX = 'to-end';
    } else if (offsetX < 0) {
      scrollingX = 'to-start';
    }

    const offsetY: number = scrollTop - this._scrollTop;
    let scrollingY: Scrolling = false;

    if (offsetY > 0) {
      scrollingY = 'to-end';
    } else if (offsetY < 0) {
      scrollingY = 'to-start';
    }

    if (!scrollingX && !scrollingY) return;

    let isLongScrollingX: boolean = this.isLongScrollingX;

    if (!isLongScrollingX && Math.abs(this._scrollLeft - scrollLeft) > SCROLL_LONG_DISTANCE) {
      isLongScrollingX = true;
    }

    let isLongScrollingY: boolean = this.isLongScrollingY;

    if (!isLongScrollingY && Math.abs(this._scrollTop - scrollTop) > SCROLL_LONG_DISTANCE) {
      isLongScrollingY = true;
    }

    this._scrollLeft = scrollLeft;
    this._scrollTop = scrollTop;
    this._scrollingX = scrollingX;
    this._scrollingY = scrollingY;
    this._isLongScrollingX = isLongScrollingX;
    this._isLongScrollingY = isLongScrollingY;
    this.markForCheck();

    this.scrolling.emit({
      scrollLeft,
      scrollTop,
      scrollingX,
      scrollingY,
    });

    this._updateThumbPosition();
  }

  private _updateLayout() {
    let needsUpdateScroll: boolean = false;

    if (this._computeHorizontalLayout()) {
      needsUpdateScroll = true;

      this._computeHorizontalThumbPosition();
    }

    if (this._computeVerticalLayout()) {
      needsUpdateScroll = true;

      this._computeVerticalThumbPosition();
    }

    this.detectChanges();

    if (!needsUpdateScroll) return;

    this._updateScroll();
  }

  private _computeHorizontalLayout(): boolean {
    let ratio: number = 0;
    let max: number = 0;
    let available: boolean = false;
    let trackOffsetX: number = 0;
    let trackOffsetY: number = 0;
    let trackSize: number = 0;
    let thumbSize: number = 0;

    if (this.scrollWidth) {
      ratio = this.viewport.width / this.scrollWidth;
      max = this.scrollWidth - ratio * this.scrollWidth;
      available = ratio < 1;
      trackOffsetX = this.scrollDivideOffset;
      trackOffsetY = this._elementRef.nativeElement.clientHeight - SCROLLBAR_TRACK_SIZE;
      trackSize = this.viewport.width - this.scrollDivideOffset;
      thumbSize = ratio * trackSize;
    }

    const needsUpdateScroll: boolean =
      max !== this.layout.horizontal.max || trackSize !== this.layout.horizontal.track.size;

    this.layout.horizontal.ratio = ratio;
    this.layout.horizontal.max = max;
    this.layout.horizontal.available = available;
    this.layout.horizontal.track.offset.x = trackOffsetX;
    this.layout.horizontal.track.offset.y = trackOffsetY;
    this.layout.horizontal.track.size = trackSize;
    this.layout.horizontal.thumb.size = thumbSize;

    return needsUpdateScroll;
  }

  private _computeVerticalLayout(): boolean {
    let ratio: number = 0;
    let max: number = 0;
    let trackOffsetX: number = 0;
    let trackOffsetY: number = 0;
    let trackSize: number = 0;
    let thumbSize: number = 0;
    let available: boolean = false;

    if (this.scrollHeight) {
      ratio = this.viewport.height / this.scrollHeight;
      max = this.scrollHeight - ratio * this.scrollHeight;
      available = ratio < 1;
      trackOffsetX = this._elementRef.nativeElement.clientWidth - SCROLLBAR_TRACK_SIZE;
      trackOffsetY = this.viewport.offsetTop;
      trackSize = this.viewport.height;
      thumbSize = ratio * trackSize;
    }

    const needsUpdateScroll: boolean =
      max !== this.layout.vertical.max || trackSize !== this.layout.vertical.track.size;

    this.layout.vertical.ratio = ratio;
    this.layout.vertical.max = max;
    this.layout.vertical.track.offset.x = trackOffsetX;
    this.layout.vertical.track.offset.y = trackOffsetY;
    this.layout.vertical.track.size = trackSize;
    this.layout.vertical.thumb.size = thumbSize;
    this.layout.vertical.available = available;

    return needsUpdateScroll;
  }

  private _updateThumbPosition() {
    this._computeHorizontalThumbPosition();
    this._computeVerticalThumbPosition();

    this.detectChanges();
  }

  private _computeHorizontalThumbPosition() {
    let position: number = 0;

    if (this.scrollWidth) {
      const trackSize: number = this.layout.horizontal.track.size;
      const thumbSize: number = this.layout.horizontal.thumb.size;

      position = (this._scrollLeft / this.scrollWidth) * trackSize;

      if (thumbSize < SCROLLBAR_THUMB_MIN_SIZE) {
        position -= ((SCROLLBAR_THUMB_MIN_SIZE - thumbSize) / trackSize) * position;
      }
    }

    this.layout.horizontal.thumb.position = position;
  }

  private _computeVerticalThumbPosition() {
    let position: number = 0;

    if (this.scrollHeight) {
      const trackSize: number = this.layout.vertical.track.size;
      const thumbSize: number = this.layout.vertical.thumb.size;

      position = (this._scrollTop / this.scrollHeight) * trackSize;

      if (thumbSize < SCROLLBAR_THUMB_MIN_SIZE) {
        position -= ((SCROLLBAR_THUMB_MIN_SIZE - thumbSize) / trackSize) * position;
      }
    }

    this.layout.vertical.thumb.position = position;
  }
}
