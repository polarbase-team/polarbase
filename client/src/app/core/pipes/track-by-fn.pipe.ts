import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';

@Pipe({ name: 'trackByFn' })
export class TrackByFnPipe implements PipeTransform {
  /**
   * @param {string} property
   * @return {( idx: number, item: any ) => any}
   */
  public transform(property: string): (idx: number, item: any) => any {
    return (_idx: number, item: any) => (property ? _.get(item, property) : item);
  }
}
