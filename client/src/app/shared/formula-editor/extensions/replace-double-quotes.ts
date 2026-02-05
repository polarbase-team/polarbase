import { EditorState } from '@codemirror/state';

export const replaceDoubleQuotes = EditorState.transactionFilter.of((tr) => {
  let hasDoubleQuote = false;
  tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
    if (inserted.sliceString(0).includes('"')) {
      hasDoubleQuote = true;
    }
  });

  if (!hasDoubleQuote) return tr;

  const changes = [];
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    changes.push({
      from: fromA,
      to: toA,
      insert: inserted.sliceString(0).replace(/"/g, "'"),
    });
  });

  return {
    changes,
    selection: tr.selection,
    scrollIntoView: tr.scrollIntoView,
    annotations: (tr as any).annotations,
  };
});
