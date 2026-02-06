import { lineNumbers } from '@codemirror/view';
import { foldGutter, foldService } from '@codemirror/language';

export const roundBracketFoldService = [
  lineNumbers(),
  foldGutter(),
  foldService.of((state, lineStart) => {
    const line = state.doc.lineAt(lineStart);
    const text = line.text;
    const functionMatch = /\b[A-Z]+\s*\(/.exec(text);
    if (functionMatch) {
      const from = lineStart + functionMatch.index + functionMatch[0].length - 1;
      let to = from;
      let openCount = 1;

      for (let i = from + 1; i < state.doc.length; i++) {
        const char = state.doc.sliceString(i, i + 1);
        if (char === '(') openCount++;
        if (char === ')') openCount--;
        if (openCount === 0) {
          to = i;
          break;
        }
      }

      if (to > from) {
        const content = state.doc.sliceString(from + 1, to);
        if (content.includes('\n')) {
          return { from: from + 1, to };
        }
      }
    }

    return null;
  }),
];
