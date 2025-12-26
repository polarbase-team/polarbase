import _ from 'lodash';

type CallbackFn<T> = (events: T[]) => void;

interface Config<T = any> {
  autoEmit: boolean;
  throttleTime: number;
  onEmitted: CallbackFn<T>;
}

export class EmitEventController<K, T> {
  static DEFAULT_CONFIG: Partial<Config> = {
    autoEmit: true,
    throttleTime: 2000,
  };

  private config: Config<T>;
  private eventStack: Map<K, T>;
  private emitThrottledFn: _.DebouncedFunc<(keys?: K[], cb?: CallbackFn<T>) => void>;

  constructor(config?: Partial<Config<T>>) {
    this.config = _.defaults(config, EmitEventController.DEFAULT_CONFIG) as Config<T>;

    this.eventStack = new Map();
    this.emitThrottledFn = _.throttle((keys?: K[], cb?: CallbackFn<T>) => {
      return this._emit(keys, cb);
    }, this.config.throttleTime);
  }

  emit(keys?: K[], cb?: CallbackFn<T>) {
    this.emitThrottledFn(keys, cb);
  }

  flush() {
    this.emitThrottledFn.cancel();
    this._emit();
  }

  getLength() {
    return this.eventStack.size;
  }

  getEvents() {
    return [...this.eventStack.values()];
  }

  getEvent(key: K) {
    return this.eventStack.get(key);
  }

  addEvent(key: K, event: T) {
    this.eventStack.set(key, event);
    if (!this.config.autoEmit) return;
    this.emitThrottledFn();
  }

  removeEvent(key: K) {
    this.eventStack.delete(key);
  }

  emitEvent(key: K, cb?: CallbackFn<T>) {
    const event: T = this.eventStack.get(key);
    if (!event) return;

    this.eventStack.delete(key);

    const events: T[] = [event];
    this.config.onEmitted?.(events);
    cb?.(events);
  }

  private _emit(keys?: K[], cb?: CallbackFn<T>) {
    if (!this.eventStack.size) return;

    let events: T[];
    if (keys === undefined) {
      events = [...this.eventStack.values()];
      this.eventStack.clear();
    } else {
      events = [];
      for (const key of keys) {
        if (!this.eventStack.has(key)) continue;

        events.push(this.eventStack.get(key));
        this.eventStack.delete(key);
      }
    }
    if (!events.length) return;
    this.config.onEmitted?.(events);
    cb?.(events);
  }
}
