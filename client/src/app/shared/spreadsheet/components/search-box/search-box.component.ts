import _ from 'lodash';
import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';

import { PopoverModule } from 'primeng/popover';
import { InputGroupModule } from 'primeng/inputgroup';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'search-box',
  templateUrl: './search-box.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PopoverModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputIconModule,
    IconFieldModule,
    AutoFocusModule,
    ButtonModule,
  ],
})
export class SearchBoxComponent {
  currentIndex = input<number>();
  totalResults = input<number>();

  onSearch = output<string>();
  onSearchNext = output<void>();
  onSearchPrevious = output<void>();

  protected searchQuery = '';
  protected onInput = _.throttle((value: string) => this.onSearch.emit(value), 500);

  protected onHide() {
    this.searchQuery = '';
    this.onSearch.emit('');
  }
}
