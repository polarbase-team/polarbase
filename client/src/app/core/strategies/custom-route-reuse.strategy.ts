import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  // 1. Should we save this route?
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data && route.data['shouldReuse'];
  }

  // 2. Save it
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.handlers[this.getRouteKey(route)] = handle;
  }

  // 3. Should we restore a saved route?
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!this.handlers[this.getRouteKey(route)];
  }

  // 4. Give it back
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.handlers[this.getRouteKey(route)] || null;
  }

  // 5. Normal reuse logic
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    return route.routeConfig ? route.routeConfig.path! : '';
  }
}

export const provideCustomRouteReuseStrategy = () => {
  return [{ provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy }];
};
