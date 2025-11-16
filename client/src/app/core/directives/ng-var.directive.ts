import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[ngVar]',
  exportAs: 'ngVar',
})
export class NgVarDirective {
  private readonly _templateRef: TemplateRef<any> = inject(TemplateRef);
  private readonly _vcRef: ViewContainerRef = inject(ViewContainerRef);

  private _context: Record<string, unknown> = {};

  @Input()
  set ngVar(context: any) {
    this._context['$implicit'] = this._context['ngVar'] = context;

    this._updateView();
  }

  private _updateView() {
    this._vcRef.clear();
    this._vcRef.createEmbeddedView(this._templateRef, this._context);
  }
}
