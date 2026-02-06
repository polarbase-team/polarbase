import {
  autocompletion,
  CompletionContext,
  CompletionSource,
  Completion,
} from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';

import { SUPPORTED_FUNCTIONS } from '../supported-functions';

export function formulaAutocomplete(columns: string[] | (() => string[])) {
  const getColumns = typeof columns === 'function' ? columns : () => columns;

  const completionSource: CompletionSource = (context: CompletionContext) => {
    const word = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*/);
    if (!word || (word.from === word.to && !context.explicit)) {
      return null;
    }

    const colOptions = getColumns().map((col) => ({
      label: col,
      type: 'variable',
      boost: 1,
    }));

    const funcOptions = SUPPORTED_FUNCTIONS.map((func) => ({
      label: func,
      type: 'function',
      detail: 'function',
      apply: (view: EditorView, completion: Completion, from: number, to: number) => {
        view.dispatch({
          changes: { from, to, insert: func + '()' },
          selection: { anchor: from + func.length + 1 },
        });
      },
    }));

    return {
      from: word.from,
      options: [...colOptions, ...funcOptions],
      validFor: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    };
  };

  return autocompletion({
    override: [completionSource],
  });
}
