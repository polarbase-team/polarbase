import { Field } from '../field/objects/field.object';
import { TableCell } from '../models/table-cell';
import { TableColumn } from '../models/table-column';
import { ClipboardItem } from './clipboard';

export function parseClipboardInternal(
  column: TableColumn,
  { text, data, metadata }: ClipboardItem<TableCell>,
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
  sourceField?: Field,
) {
  return field.convertTextToData(text);
}
