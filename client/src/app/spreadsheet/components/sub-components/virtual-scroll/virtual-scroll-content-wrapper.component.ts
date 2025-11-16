import { ChangeDetectionStrategy, Component, ContentChild, Directive } from '@angular/core';

import { Column } from '../../sub-classes/column';

import { VirtualScrollGroupRepeaterDirective } from './virtual-scroll-group-repeater.directive';
import { VirtualScrollRowRepeaterDirective } from './virtual-scroll-row-repeater.directive';

@Directive()
class VirtualScrollContentWrapperComponent {
  @ContentChild(VirtualScrollGroupRepeaterDirective, { static: true, descendants: true })
  readonly groupRepeater: VirtualScrollGroupRepeaterDirective;
  @ContentChild(VirtualScrollRowRepeaterDirective, { static: true, descendants: true })
  readonly rowRepeater: VirtualScrollRowRepeaterDirective;
  columns: Column[];
}

@Component({
  selector: '[virtualScrollLeftContentWrapper]',
  template: '<ng-content></ng-content>',
  styles: [':host { position: relative; display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollLeftContentWrapperComponent extends VirtualScrollContentWrapperComponent {}

@Component({
  selector: '[virtualScrollRightContentWrapper]',
  template: '<ng-content></ng-content>',
  styles: [':host { position: relative; display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollRightContentWrapperComponent extends VirtualScrollContentWrapperComponent {}
