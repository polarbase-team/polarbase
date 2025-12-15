import { Component, ContentChild, Directive } from '@angular/core';

import { VirtualScrollGroupRepeaterDirective } from './virtual-scroll-group-repeater.directive';
import { VirtualScrollRowRepeaterDirective } from './virtual-scroll-row-repeater.directive';
import { TableColumn } from '../../models/table-column';

@Directive()
class VirtualScrollContentWrapperComponent {
  @ContentChild(VirtualScrollGroupRepeaterDirective, { static: true, descendants: true })
  readonly groupRepeater: VirtualScrollGroupRepeaterDirective;
  @ContentChild(VirtualScrollRowRepeaterDirective, { static: true, descendants: true })
  readonly rowRepeater: VirtualScrollRowRepeaterDirective;
  columns: TableColumn[];
}

@Component({
  selector: '[virtualScrollLeftContentWrapper]',
  template: '<ng-content></ng-content>',
  styles: [':host { position: relative; display: block; }'],
})
export class VirtualScrollLeftContentWrapperComponent extends VirtualScrollContentWrapperComponent {}

@Component({
  selector: '[virtualScrollRightContentWrapper]',
  template: '<ng-content></ng-content>',
  styles: [':host { position: relative; display: block; }'],
})
export class VirtualScrollRightContentWrapperComponent extends VirtualScrollContentWrapperComponent {}
