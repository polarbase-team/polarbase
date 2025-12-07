import {
  Directive,
  AfterViewChecked,
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

export interface ViewRect {
  left: number | undefined;
  right: number | undefined;
  top: number | undefined;
  bottom: number | undefined;
  width: number | undefined;
  height: number | undefined;
}

export interface ViewProps {
  index: number;
  rect: ViewRect;
}

export interface ViewContext<R> {
  $implicit: R & { viewProps: ViewProps };
  index: number;
  rect: ViewRect;
}

export type ViewContextResolver<R, C = ViewContext<R>> = (record: IterableChangeRecord<R>) => C;

export type ViewChanged<R, C = ViewContext<R>> = (
  view: EmbeddedViewRef<C>,
  record: IterableChangeRecord<R>,
  operation: ViewRepeaterOperation,
) => void;

export type ViewUpdated<R, C = ViewContext<R>> = (view: EmbeddedViewRef<C>) => void;

export const ViewRepeaterOperation = {
  Inserted: 1,
  Replaced: 2,
  Removed: 3,
  Moved: 4,
} as const;
export type ViewRepeaterOperation =
  (typeof ViewRepeaterOperation)[keyof typeof ViewRepeaterOperation];

export class RecycleViewRepeaterStrategy<R, C extends ViewContext<R>> {
  private vcRef: ViewContainerRef;
  private tmplRef: TemplateRef<any>;
  private viewCache: EmbeddedViewRef<C>[] = [];
  private _viewCacheSize: number;

  get viewCacheSize() {
    return this._viewCacheSize;
  }
  set viewCacheSize(size: number) {
    this._viewCacheSize = size;
  }

  constructor(vcRef: ViewContainerRef, tmplRef: TemplateRef<C>, viewCacheSize = 40) {
    this.vcRef = vcRef;
    this.tmplRef = tmplRef;
    this.viewCacheSize = viewCacheSize;
  }

  applyChanges(
    changes: IterableChanges<R>,
    contextResolver?: ViewContextResolver<R, C>,
    onViewChanged?: ViewChanged<R, C>,
  ) {
    changes.forEachOperation(
      (record: IterableChangeRecord<R>, adjustedPreviousIndex: number, currentIndex: number) => {
        let view: EmbeddedViewRef<C>;
        let operation: ViewRepeaterOperation;

        if (record.previousIndex === null) {
          view = this.insertView(currentIndex, contextResolver?.(record));
          operation = view ? ViewRepeaterOperation.Inserted : ViewRepeaterOperation.Replaced;
        } else if (currentIndex === null) {
          this.detachAndCacheView(adjustedPreviousIndex);
          operation = ViewRepeaterOperation.Removed;
        } else {
          view = this.moveView(adjustedPreviousIndex, currentIndex, contextResolver?.(record));
          operation = ViewRepeaterOperation.Moved;
        }

        onViewChanged?.(view, record, operation);
      },
    );
  }

  detact() {
    for (const view of this.viewCache) {
      view.destroy();
    }
    this.viewCache = [];
  }

  clear() {
    this.vcRef.clear();
  }

  private insertView(currentIndex: number, context: C) {
    const cachedView = this.insertViewFromCache(currentIndex);
    if (cachedView) {
      cachedView.context.$implicit = context.$implicit;
      cachedView.context.index = context.index;
      cachedView.context.rect = context.rect;
      return void 0;
    }

    return this.vcRef.createEmbeddedView(this.tmplRef, context, currentIndex);
  }

  private detachAndCacheView(index: number) {
    const detachedView = this.vcRef.detach(index) as EmbeddedViewRef<C>;
    this.maybeCacheView(detachedView);
  }

  private moveView(adjustedPreviousIndex: number, currentIndex: number, context: C) {
    const view = this.vcRef.get(adjustedPreviousIndex) as EmbeddedViewRef<C>;
    this.vcRef.move(view, currentIndex);
    view.context.$implicit = context.$implicit;
    view.context.index = context.index;
    view.context.rect = context.rect;
    return view;
  }

  /**
   * Cache the given detached view. If the cache is full,
   * the view will be destroyed.
   */
  private maybeCacheView(view: EmbeddedViewRef<C>) {
    if (this.viewCache.length < this.viewCacheSize) {
      this.viewCache.push(view);
    } else {
      const idx = this.vcRef.indexOf(view);
      // The host component could remove views from the container outside of
      // the view repeater. It's unlikely this will occur, but just in case,
      // destroy the view on its own, otherwise destroy it through the
      // container to ensure that all the references are removed.
      if (idx === -1) {
        view.destroy();
      } else {
        this.vcRef.remove(idx);
      }
    }
  }

  private insertViewFromCache(index: number) {
    const cachedView = this.viewCache.pop();
    if (cachedView) {
      this.vcRef.insert(cachedView, index);
    }
    return cachedView || null;
  }
}

@Directive()
export class ViewRepeater<R, C extends ViewContext<R>> implements AfterViewChecked {
  protected tmplRef = inject(TemplateRef);
  protected vcRef = inject(ViewContainerRef);
  protected differs = inject(IterableDiffers);
  protected repeater = new RecycleViewRepeaterStrategy<R, C>(this.vcRef, this.tmplRef);
  protected needsUpdate: boolean;
  protected dsDiffer: IterableDiffer<R>;
  protected dsStartIndex = 0;
  protected dsTrackByFn: TrackByFunction<R>;

  private _dataSource: R[];
  get dataSource() {
    return this._dataSource;
  }
  set dataSource(dataSource: R[]) {
    this._dataSource = dataSource || [];
    this.onDataSourceChanged();
  }

  ngAfterViewChecked() {
    if (this.dsDiffer && this.needsUpdate) {
      const changes = this.dsDiffer.diff(this.dataSource);
      if (changes) {
        this.applyChanges(changes);
      } else {
        this.updateContext();
      }

      this.needsUpdate = false;
    }
  }

  applyChanges(changes: IterableChanges<R>, onViewChanged?: ViewChanged<R, C>) {
    this.repeater.applyChanges(changes, this.contextResolver, onViewChanged);

    // Update $implicit for any records that had an identity change.
    changes.forEachIdentityChange((record) => {
      const view = this.vcRef.get(record.currentIndex) as EmbeddedViewRef<C>;
      view.context.$implicit = record.item as ViewContext<R>['$implicit'];
    });

    // Update the context variables on all records.
    let i = this.vcRef.length;
    while (i--) {
      const view = this.vcRef.get(i) as EmbeddedViewRef<C>;
      this.updateContextProperties(view.context);
    }
  }

  updateContext(onViewUpdated?: ViewUpdated<R, C>) {
    let i = this.vcRef.length;
    while (i--) {
      const view = this.vcRef.get(i) as EmbeddedViewRef<C>;
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
    const context = {
      $implicit: record.item,
    } as C;
    this.updateContextProperties(context);
    return context;
  };

  protected updateContextProperties(context: C) {
    const { viewProps } = context.$implicit;
    context.index = viewProps.index + this.dsStartIndex;
    context.rect = viewProps.rect;
  }

  private onDataSourceChanged() {
    if (!this.dsDiffer) {
      this.dsDiffer = this.differs.find(this.dataSource).create(this.dsTrackByFn);
    }
    this.needsUpdate = true;
  }
}
