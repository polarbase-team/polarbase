import { keymap } from '@codemirror/view';
import { insertNewlineAndIndent, insertTab } from '@codemirror/commands';
import { EditorState, Prec } from '@codemirror/state';

export const indentInsideBrackets = [
  EditorState.tabSize.of(4),
  Prec.high(
    keymap.of([
      {
        key: 'Tab',
        preventDefault: true,
        run: insertTab,
      },
      {
        key: 'Enter',
        preventDefault: true,
        run: insertNewlineAndIndent,
      },
    ]),
  ),
];
