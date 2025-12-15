import _ from 'lodash';

import { Component, SimpleChanges } from '@angular/core';

import { JSONEditorDrawerComponent } from '../../../../json-editor/json-editor-drawer.component';
import { JSONData } from '../../../field/interfaces/json-field.interface';
import { FieldCellInputable } from '../field-cell-inputable';
import { InputBoxComponent } from '../input-box.component';

@Component({
  selector: 'json-field-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['../field-cell.scss', '../field-cell-inputable.scss'],
  host: { class: 'json-field-cell' },
  imports: [JSONEditorDrawerComponent, InputBoxComponent],
})
export class JSONFieldCellComponent extends FieldCellInputable<JSONData> {
  protected visibleJSONEditor = false;
  protected jsonText = '';

  override ngOnChanges(changes: SimpleChanges): void {
    if ('data' in changes) {
      this.jsonText = this.field.toString(this.data);
    }
  }

  override save(data = this.data) {
    if (_.isString(data)) {
      data = this.field.convertTextToData(data);
    }

    this.jsonText = this.field.toString(data);

    super.save(data);
  }
}
