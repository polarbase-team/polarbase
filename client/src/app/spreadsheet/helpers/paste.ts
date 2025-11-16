import _ from 'lodash';

import { Field } from '../field/objects';
import { Cell } from '../components/sub-classes/cell';
import { Column } from '../components/sub-classes/column';
import { ClipboardItem } from './clipboard';

export function parseClipboardInternal(
  column: Column,
  { text, data, metadata }: ClipboardItem<Cell>
): any {
  if (metadata.column.id === column.id) return data;

  const sourceField: Field = metadata.column.field;
  const targetField: Field = column.field;

  if (sourceField.dataType === targetField.dataType) {
    let newData: any = data;

    if ((targetField as Field).validate(data) !== null) return;

    newData = data;

    return newData;
  }

  return parseClipboardExternal(targetField, text, data, sourceField);
}

export function parseClipboardExternal(
  field: Field,
  text: string,
  data?: any,
  sourceField?: Field
) {
  return field.convertTextToData(text);
}
