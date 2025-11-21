import {
  Directive,
  DoCheck,
  EmbeddedViewRef,
  inject,
  IterableChangeRecord,
  IterableChanges,
  IterableDiffer,
  IterableDiffers,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef,
} from '@angular/core';

type ViewRect = {
  left: number | undefined;
  right: number | undefined;
  top: number | undefined;
  bottom: number | undefined;
  width: number | undefined;
  height: number | undefined;
};

type ViewProps = {
  index: number;
  rect: ViewRect;
};

type ViewContext<R> = {
  $implicit: R & {
    _viewProps: ViewProps;
  };
  index: number;
  rect: ViewRect;
};

type ViewContextResolver<R, C = ViewContext<R>> = (record: IterableChangeRecord<R>) => C;

type ViewChanged<R, C = ViewContext<R>> = (
  view: EmbeddedViewRef<C>,
  record: IterableChangeRecord<R>,
  operation: _ViewRepeaterOperation,
) => void;

type ViewUpdated<R, C = ViewContext<R>> = (view: EmbeddedViewRef<C>) => void;

export type _ViewRect = ViewRect;
export type _ViewProps = ViewProps;
export type _ViewContext<R> = ViewContext<R>;
export type _ViewContextResolver<R, C> = ViewContextResolver<R, C>;
export type _ViewChanged<R, C> = ViewChanged<R, C>;
export type _ViewUpdated<R, C> = ViewUpdated<R, C>;

export const _ViewRepeaterOperation = {
  Inserted: 1,
  Replaced: 2,
  Removed: 3,
  Moved: 4,
} as const;
export type _ViewRepeaterOperation =
  (typeof _ViewRepeaterOperation)[keyof typeof _ViewRepeaterOperation];

export class _RecycleViewRepeaterStrategy<R, C extends ViewContext<R>> {
  private _vcRef: ViewContainerRef;
  private _templateRef: TemplateRef<any>;
  private _viewCache: EmbeddedViewRef<C>[] = [];
  private _viewCacheSize: number;

  get viewCacheSize(): number {
    return this._viewCacheSize;
  }
  set viewCacheSize(size: number) {
    this._viewCacheSize = size;
  }

  constructor(vcRef: ViewContainerRef, templateRef: TemplateRef<C>, viewCacheSize: number = 40) {
    this._vcRef = vcRef;
    this._templateRef = templateRef;
    this._viewCacheSize = viewCacheSize;
  }

  applyChanges(
    changes: IterableChanges<R>,
    contextResolver?: ViewContextResolver<R, C>,
    onViewChanged?: ViewChanged<R, C>,
  ) {
    changes.forEachOperation(
      (record: IterableChangeRecord<R>, adjustedPreviousIndex: number, currentIndex: number) => {
        let view: EmbeddedViewRef<C>;
        let operation: _ViewRepeaterOperation;

        if (record.previousIndex === null) {
          view = this._insertView(currentIndex, contextResolver?.(record));

          operation = view ? _ViewRepeaterOperation.Inserted : _ViewRepeaterOperation.Replaced;
        } else if (currentIndex === null) {
          this._detachAndCacheView(adjustedPreviousIndex);

          operation = _ViewRepeaterOperation.Removed;
        } else {
          view = this._moveView(adjustedPreviousIndex, currentIndex, contextResolver?.(record));

          operation = _ViewRepeaterOperation.Moved;
        }

        onViewChanged?.(view, record, operation);
      },
    );
  }

  detact() {
    for (const view of this._viewCache) {
      view.destroy();
    }

    this._viewCache = [];
  }

  clear() {
    this._vcRef.clear();
  }

  private _insertView(currentIndex: number, context: C): EmbeddedViewRef<C> {
    const cachedView: EmbeddedViewRef<C> = this._insertViewFromCache(currentIndex);

    if (cachedView) {
      cachedView.context.$implicit = context.$implicit;
      cachedView.context.index = context.index;
      cachedView.context.rect = context.rect;
      return void 0;
    }

    return this._vcRef.createEmbeddedView(this._templateRef, context, currentIndex);
  }

  private _detachAndCacheView(index: number) {
    const detachedView: EmbeddedViewRef<C> = this._vcRef.detach(index) as EmbeddedViewRef<C>;

    this._maybeCacheView(detachedView);
  }

  private _moveView(
    adjustedPreviousIndex: number,
    currentIndex: number,
    context: C,
  ): EmbeddedViewRef<C> {
    const view: EmbeddedViewRef<C> = this._vcRef.get(adjustedPreviousIndex) as EmbeddedViewRef<C>;

    this._vcRef.move(view, currentIndex);

    view.context.$implicit = context.$implicit;
    view.context.index = context.index;
    view.context.rect = context.rect;

    return view;
  }

  /**
   * Cache the given detached view. If the cache is full,
   * the view will be destroyed.
   */
  private _maybeCacheView(view: EmbeddedViewRef<C>) {
    if (this._viewCache.length < this._viewCacheSize) {
      this._viewCache.push(view);
    } else {
      const idx: number = this._vcRef.indexOf(view);

      // The host component could remove views from the container outside of
      // the view repeater. It's unlikely this will occur, but just in case,
      // destroy the view on its own, otherwise destroy it through the
      // container to ensure that all the references are removed.
      if (idx === -1) {
        view.destroy();
      } else {
        this._vcRef.remove(idx);
      }
    }
  }

  private _insertViewFromCache(index: number): EmbeddedViewRef<C> | null {
    const cachedView: EmbeddedViewRef<C> = this._viewCache.pop();

    if (cachedView) {
      this._vcRef.insert(cachedView, index);
    }

    return cachedView || null;
  }
}

@Directive()
// eslint-disable-next-line @typescript-eslint/naming-convention
export class _ViewRepeater<R, C extends ViewContext<R>> implements DoCheck {
  protected readonly templateRef: TemplateRef<any> = inject(TemplateRef);
  protected readonly vcRef: ViewContainerRef = inject(ViewContainerRef);
  protected readonly differs: IterableDiffers = inject(IterableDiffers);
  protected readonly repeater: _RecycleViewRepeaterStrategy<R, C> =
    new _RecycleViewRepeaterStrategy<R, C>(this.vcRef, this.templateRef);

  protected dataSourceDiffer: IterableDiffer<R>;
  protected dataSourceStartIndex: number = 0;
  protected dataSourceTrackByFn: TrackByFunction<R>;

  private _needsUpdate: boolean;
  private _dataSource: R[];

  get dataSource(): R[] {
    return this._dataSource;
  }
  set dataSource(dataSource: R[]) {
    this._dataSource = dataSource || [];

    this._onDataSourceChanged();
  }

  set cacheSize(size: number) {
    this.repeater.viewCacheSize = size;
  }

  ngDoCheck() {
    if (this.dataSourceDiffer && this._needsUpdate) {
      const changes: IterableChanges<R> = this.dataSourceDiffer.diff(this.dataSource);

      if (changes) {
        this.applyChanges(changes);
      } else {
        this.updateContext();
      }

      this._needsUpdate = false;
    }
  }

  applyChanges(changes: IterableChanges<R>, onViewChanged?: ViewChanged<R, C>) {
    this.repeater.applyChanges(changes, this.contextResolver, onViewChanged);

    // Update $implicit for any records that had an identity change.
    changes.forEachIdentityChange((record: IterableChangeRecord<R>) => {
      const view: EmbeddedViewRef<C> = this.vcRef.get(record.currentIndex) as EmbeddedViewRef<C>;

      view.context.$implicit = record.item as ViewContext<R>['$implicit'];
    });

    // Update the context variables on all records.
    let i: number = this.vcRef.length;
    while (i--) {
      const view: EmbeddedViewRef<C> = this.vcRef.get(i) as EmbeddedViewRef<C>;

      this.updateContextProperties(view.context);
    }
  }

  updateContext(onViewUpdated?: ViewUpdated<R, C>) {
    let i: number = this.vcRef.length;

    while (i--) {
      const view: EmbeddedViewRef<C> = this.vcRef.get(i) as EmbeddedViewRef<C>;

      this.updateContextProperties(view.context);

      onViewUpdated?.(view);

      view.detectChanges();
    }
  }

  detact() {
    this.repeater.detact();
  }

  clear() {
    this.repeater.clear();
  }

  protected contextResolver = (record: IterableChangeRecord<R>): C => {
    const context: C = {
      $implicit: record.item,
    } as C;

    this.updateContextProperties(context);

    return context;
  };

  protected updateContextProperties(context: C) {
    const { _viewProps }: ViewContext<R>['$implicit'] = context.$implicit;

    context.index = _viewProps.index + this.dataSourceStartIndex;
    context.rect = _viewProps.rect;
  }

  private _onDataSourceChanged() {
    if (!this.dataSourceDiffer) {
      this.dataSourceDiffer = this.differs.find(this.dataSource).create(this.dataSourceTrackByFn);
    }

    this._needsUpdate = true;
  }
}
