import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  HostBinding,
  inject,
  input,
  OnDestroy,
  output,
  ViewChild,
} from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

interface ScrollOrientationLayout {
  ratio: number;
  max: number;
  track: { offset: Point; size: number };
  thumb: { position: number; size: number };
  available: boolean;
}

interface ScrollLayout {
  horizontal: ScrollOrientationLayout;
  vertical: ScrollOrientationLayout;
}

export interface ScrollEvent {
  scrollLeft: number;
  scrollTop: number;
  scrollingX: Scrolling;
  scrollingY: Scrolling;
}

export type Scrolling = 'to-start' | 'to-end' | boolean;

const IS_MACOS = /Mac/i.test(navigator.userAgent);
const SCROLLBAR_TRACK_SIZE = 10;
const SCROLLBAR_THUMB_MIN_SIZE = 20;
const AUTO_SCROLL_ALLOW_RANGE = 100;
const AUTO_SCROLL_STEP = 5;
const AUTO_SCROLL_HOLDER = 'virtualScrollAutoScrollHolder';
const SCROLL_EXTRA_WIDTH = 80;
const SCROLL_EXTRA_HEIGHT = 80;
const SCROLL_LONG_DISTANCE = 1200;

@Component({
  selector: 'virtual-scroll, [virtualScroll]',
  templateUrl: './virtual-scroll.html',
  styleUrls: ['./virtual-scroll.scss'],
  host: { class: 'virtual-scroll' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollComponent implements AfterContentInit, OnDestroy {
  sideSpacing = input<number>(0);
  disable = input<() => boolean>(() => {
    return false;
  });

  scrolling = output<ScrollEvent>();

  @ContentChild(VirtualScrollViewportComponent, { static: true })
  readonly viewport: VirtualScrollViewportComponent;

  @ViewChild('horizontalThumb', { static: true })
  protected horizontalThumb: ElementRef;
  @ViewChild('verticalThumb', { static: true })
  protected verticalThumb: ElementRef;

  protected layout: ScrollLayout = {
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

  private cdRef = inject(ChangeDetectorRef);
  private eleRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private stopSubEvent$ = new Subject<void>();
  private isAutoScroll = false;
  private momentumAnimationFrame: number;
  private _scrollLeft = 0;
  private _scrollTop = 0;
  private _scrollingX = false;
  private _scrollingY = false;
  private _isLongScrollingX = false;
  private _isLongScrollingY = false;
  private _isScrollCompleted = true;

  @HostBinding('class.virtual-scroll--scrolling')
  get classScrolling() {
    return this.isScrolling && !this.isAutoScroll;
  }

  get isScrolling() {
    return this.scrollingX || this.scrollingY;
  }

  get isLongScrollingX() {
    return this._isLongScrollingX;
  }

  get isLongScrollingY() {
    return this._isLongScrollingY;
  }

  get isScrollCompleted() {
    return this._isScrollCompleted;
  }

  get scrollLeft() {
    return this._scrollLeft;
  }
  get scrollTop() {
    return this._scrollTop;
  }

  get scrollingX() {
    return this._scrollingX !== false;
  }
  get scrollingY() {
    return this._scrollingY !== false;
  }

  get scrollWidth() {
    return this.viewport.contentWidth + SCROLL_EXTRA_WIDTH;
  }
  get scrollHeight() {
    return this.viewport.contentHeight + SCROLL_EXTRA_HEIGHT;
  }

  get scrollDivideOffset() {
    return this.viewport.leftWidth + this.sideSpacing();
  }

  get scrollLayout() {
    return this.layout;
  }

  ngAfterContentInit() {
    Promise.resolve().then(() => {
      let wheelAnimationFrame: number;
      fromEvent<WheelEvent>(this.eleRef.nativeElement, 'wheel')
        .pipe(
          filter(() => !this.disable()()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((e) => {
          e.stopPropagation();
          e.preventDefault();

          this.stopSubEvent$.next();

          if (wheelAnimationFrame) {
            cancelAnimationFrame(wheelAnimationFrame);

            wheelAnimationFrame = null;
          }

          wheelAnimationFrame = requestAnimationFrame(() => {
            this.onWheel(e);
          });
        });

      fromEvent<PointerEvent>(this.eleRef.nativeElement, 'pointerdown')
        .pipe(
          filter(() => !this.disable()()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(this.onPointerDown.bind(this));

      fromEvent<PointerEvent>(this.horizontalThumb.nativeElement, 'pointerdown')
        .pipe(
          filter(() => !this.disable()()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(this.onThumbPointerdown.bind(this, 'horizontal'));

      fromEvent<PointerEvent>(this.verticalThumb.nativeElement, 'pointerdown')
        .pipe(
          filter(() => !this.disable()()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(this.onThumbPointerdown.bind(this, 'vertical'));

      outputToObservable(this.scrolling)
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
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();

      this.viewport.sizeUpdated$
        .pipe(
          startWith<ViewportSizeUpdatedEvent>({} as ViewportSizeUpdatedEvent),
          audit(() => animationFrames()),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((e) => {
          this.updateLayout();
          this.viewport.measureRangeSize(
            [this._scrollLeft, e.updateOnWidth],
            [this._scrollTop, e.updateOnHeight],
          );
        });
    });
  }

  ngOnDestroy() {
    this.stopSubEvent$.complete();
  }

  detectChanges() {
    this.cdRef.detectChanges();
  }

  markForCheck() {
    this.cdRef.markForCheck();
  }

  scrollBy(options: ScrollToOptions) {
    let scrollLeft = this._scrollLeft;
    if (options.left) {
      scrollLeft += options.left;
    }

    let scrollTop = this._scrollTop;
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

  measurePointerOffset(pointerPosition: Point) {
    const { left, top, width, height } = this.viewport.element.getBoundingClientRect();
    const { x, y } = pointerPosition;

    let offsetX = null;
    if (x >= left && x <= left + width) {
      offsetX = x - left + this._scrollLeft;
    }

    let offsetY = null;
    if (y >= top && y <= top + height) {
      offsetY = y - top + this._scrollTop;
    }

    return { x: offsetX, y: offsetY };
  }

  private onWheel(e: WheelEvent) {
    let left = this._scrollLeft;
    let top = this._scrollTop;

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

  private onPointerDown(e: PointerEvent) {
    e.pointerType === 'touch' ? this.onPointerTypeIsTouch(e) : this.onPointerTypeIsMouse(e);
  }

  private onPointerTypeIsMouse(e1: PointerEvent) {
    this.stopSubEvent$.next();

    if (e1.button === 2) return; // Right click

    this._isScrollCompleted = false;

    const { left, top } = this.viewport.element.getBoundingClientRect();
    const stopScrollTimers = new Subject<void>();
    let dir: string;
    let currentAnimationFrame: number;

    fromEvent<MouseEvent>(document, 'pointermove')
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        stopScrollTimers.next();

        if (!this.isAutoScroll) {
          const target = e2.target as HTMLElement;
          const holder = target.closest(`[${AUTO_SCROLL_HOLDER}]`);

          if (!holder) return;

          dir = holder.getAttribute(AUTO_SCROLL_HOLDER);
        }
        this.isAutoScroll = true;

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
              takeUntil(this.stopSubEvent$),
              takeUntilDestroyed(this.destroyRef),
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
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        this.stopSubEvent$.next();
        this._isScrollCompleted = true;
        stopScrollTimers.next();
        this.isAutoScroll = false;
      });
  }

  private onPointerTypeIsTouch(e1: PointerEvent) {
    e1.stopPropagation();
    e1.preventDefault();

    this.stopSubEvent$.next();

    if (this.momentumAnimationFrame) {
      cancelAnimationFrame(this.momentumAnimationFrame);
    }

    this._isScrollCompleted = false;

    const start = { x: e1.pageX, y: e1.pageY };
    let velocityX = 0;
    let velocityY = 0;
    let currentX = this._scrollLeft;
    let currentY = this._scrollTop;
    let currentAnimationFrame: number;

    fromEvent<PointerEvent>(document, 'pointermove')
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this.isAutoScroll = true;

        if (currentAnimationFrame) {
          cancelAnimationFrame(currentAnimationFrame);
        }

        currentAnimationFrame = requestAnimationFrame(() => {
          const newX = e2.pageX;
          const newY = e2.pageY;
          const deltaX = start.x - newX;
          const deltaY = start.y - newY;

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
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this.stopSubEvent$.next();

        this.isAutoScroll = false;

        const momentum: () => void = () => {
          let isContinue = false;

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
            this.momentumAnimationFrame = requestAnimationFrame(momentum);
            return;
          }

          if (this.momentumAnimationFrame) {
            cancelAnimationFrame(this.momentumAnimationFrame);
          }

          this._isScrollCompleted = true;
        };

        momentum();
      });
  }

  private onThumbPointerdown(dir: ScrollOrientation, e1: MouseEvent) {
    this.stopSubEvent$.next();

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
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntil(this.stopSubEvent$), takeUntilDestroyed(this.destroyRef))
      .subscribe((e2) => {
        e2.stopPropagation();
        e2.preventDefault();

        this.stopSubEvent$.next();
        this._isScrollCompleted = true;
      });
  }

  private _scrollTo(scrollLeft: number, scrollTop: number) {
    this.updateScroll(scrollLeft, scrollTop);
    this.viewport.measureRangeSize(
      [this._scrollLeft, this._scrollingX],
      [this._scrollTop, this._scrollingY],
    );
  }

  private updateScroll(scrollLeft = this._scrollLeft, scrollTop = this._scrollTop) {
    scrollLeft = this.layout.horizontal.available
      ? Math.min(Math.max(scrollLeft, 0), this.layout.horizontal.max)
      : 0;
    scrollTop = this.layout.vertical.available
      ? Math.min(Math.max(scrollTop, 0), this.layout.vertical.max)
      : 0;

    const offsetX = scrollLeft - this._scrollLeft;
    let scrollingX: Scrolling = false;
    if (offsetX > 0) {
      scrollingX = 'to-end';
    } else if (offsetX < 0) {
      scrollingX = 'to-start';
    }

    const offsetY = scrollTop - this._scrollTop;
    let scrollingY: Scrolling = false;
    if (offsetY > 0) {
      scrollingY = 'to-end';
    } else if (offsetY < 0) {
      scrollingY = 'to-start';
    }

    if (!scrollingX && !scrollingY) return;

    let isLongScrollingX = this.isLongScrollingX;
    if (!isLongScrollingX && Math.abs(this._scrollLeft - scrollLeft) > SCROLL_LONG_DISTANCE) {
      isLongScrollingX = true;
    }

    let isLongScrollingY = this.isLongScrollingY;
    if (!isLongScrollingY && Math.abs(this._scrollTop - scrollTop) > SCROLL_LONG_DISTANCE) {
      isLongScrollingY = true;
    }

    this._scrollLeft = scrollLeft;
    this._scrollTop = scrollTop;
    this._scrollingX = !!scrollingX;
    this._scrollingY = !!scrollingY;
    this._isLongScrollingX = isLongScrollingX;
    this._isLongScrollingY = isLongScrollingY;
    this.markForCheck();

    this.scrolling.emit({
      scrollLeft,
      scrollTop,
      scrollingX,
      scrollingY,
    });

    this.updateThumbPosition();
  }

  private updateLayout() {
    let needsUpdateScroll = false;

    if (this.computeHorizontalLayout()) {
      needsUpdateScroll = true;
      this.computeHorizontalThumbPosition();
    }

    if (this.computeVerticalLayout()) {
      needsUpdateScroll = true;
      this.computeVerticalThumbPosition();
    }

    this.detectChanges();

    if (!needsUpdateScroll) return;
    this.updateScroll();
  }

  private computeHorizontalLayout() {
    let ratio = 0;
    let max = 0;
    let available = false;
    let trackOffsetX = 0;
    let trackOffsetY = 0;
    let trackSize = 0;
    let thumbSize = 0;

    if (this.scrollWidth) {
      ratio = this.viewport.width / this.scrollWidth;
      max = this.scrollWidth - ratio * this.scrollWidth;
      available = ratio < 1;
      trackOffsetX = this.scrollDivideOffset;
      trackOffsetY = this.eleRef.nativeElement.clientHeight - SCROLLBAR_TRACK_SIZE;
      trackSize = this.viewport.width - this.scrollDivideOffset;
      thumbSize = ratio * trackSize;
    }

    const needsUpdateScroll =
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

  private computeVerticalLayout() {
    let ratio = 0;
    let max = 0;
    let trackOffsetX = 0;
    let trackOffsetY = 0;
    let trackSize = 0;
    let thumbSize = 0;
    let available = false;

    if (this.scrollHeight) {
      ratio = this.viewport.height / this.scrollHeight;
      max = this.scrollHeight - ratio * this.scrollHeight;
      available = ratio < 1;
      trackOffsetX = this.eleRef.nativeElement.clientWidth - SCROLLBAR_TRACK_SIZE;
      trackOffsetY = this.viewport.offsetTop;
      trackSize = this.viewport.height;
      thumbSize = ratio * trackSize;
    }

    const needsUpdateScroll =
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

  private updateThumbPosition() {
    this.computeHorizontalThumbPosition();
    this.computeVerticalThumbPosition();
    this.detectChanges();
  }

  private computeHorizontalThumbPosition() {
    let position = 0;
    if (this.scrollWidth) {
      const trackSize = this.layout.horizontal.track.size;
      const thumbSize = this.layout.horizontal.thumb.size;

      position = (this._scrollLeft / this.scrollWidth) * trackSize;
      if (thumbSize < SCROLLBAR_THUMB_MIN_SIZE) {
        position -= ((SCROLLBAR_THUMB_MIN_SIZE - thumbSize) / trackSize) * position;
      }
    }
    this.layout.horizontal.thumb.position = position;
  }

  private computeVerticalThumbPosition() {
    let position = 0;
    if (this.scrollHeight) {
      const trackSize = this.layout.vertical.track.size;
      const thumbSize = this.layout.vertical.thumb.size;
      position = (this._scrollTop / this.scrollHeight) * trackSize;
      if (thumbSize < SCROLLBAR_THUMB_MIN_SIZE) {
        position -= ((SCROLLBAR_THUMB_MIN_SIZE - thumbSize) / trackSize) * position;
      }
    }
    this.layout.vertical.thumb.position = position;
  }
}
