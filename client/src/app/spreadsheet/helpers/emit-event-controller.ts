import _ from 'lodash';

type CallbackFn<T> = (events: T[]) => void;

type Config<T = any> = {
  autoEmit: boolean;
  throttleTime: number;
  onEmitted: CallbackFn<T>;
};

export class EmitEventController<K, T> {
  public static DEFAULT_CONFIG: Partial<Config> = {
    autoEmit: true,
    throttleTime: 2000,
  };

  private _config: Config<T>;
  private _eventStack: Map<K, T>;
  private _emitThrottledFn: _.DebouncedFunc<(keys?: K[], cb?: CallbackFn<T>) => void>;

  constructor(config?: Partial<Config<T>>) {
    this._config = _.defaults(config, EmitEventController.DEFAULT_CONFIG) as Config<T>;

    this._eventStack = new Map();
    this._emitThrottledFn = _.throttle((keys?: K[], cb?: CallbackFn<T>) => {
      return this._emit(keys, cb);
    }, this._config.throttleTime);
  }

  public emit(keys?: K[], cb?: CallbackFn<T>) {
    this._emitThrottledFn(keys, cb);
  }

  public flush() {
    this._emitThrottledFn.cancel();
    this._emit();
  }

  public getLength(): number {
    return this._eventStack.size;
  }

  public getEvents(): T[] {
    return [...this._eventStack.values()];
  }

  public getEvent(key: K): T {
    return this._eventStack.get(key);
  }

  public addEvent(key: K, event: T) {
    this._eventStack.set(key, event);

    if (!this._config.autoEmit) return;

    this._emitThrottledFn();
  }

  public removeEvent(key: K) {
    this._eventStack.delete(key);
  }

  public emitEvent(key: K, cb?: CallbackFn<T>) {
    const event: T = this._eventStack.get(key);

    if (!event) return;

    this._eventStack.delete(key);

    const events: T[] = [event];

    this._config.onEmitted?.(events);

    cb?.(events);
  }

  private _emit(keys?: K[], cb?: CallbackFn<T>) {
    if (!this._eventStack.size) return;

    let events: T[];

    if (keys === undefined) {
      events = [...this._eventStack.values()];

      this._eventStack.clear();
    } else {
      events = [];

      for (const key of keys) {
        if (!this._eventStack.has(key)) continue;

        events.push(this._eventStack.get(key));

        this._eventStack.delete(key);
      }
    }

    if (!events.length) return;

    this._config.onEmitted?.(events);

    cb?.(events);
  }
}
