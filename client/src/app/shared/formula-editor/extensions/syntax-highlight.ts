import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Range } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';

const REGEX = /\b(NULL|TRUE|FALSE)\b/g;

export const syntaxHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = this.getDecorations(update.view);
      }
    }

    getDecorations(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      const text = view.state.doc.toString();

      let match: RegExpMatchArray | null;
      while ((match = REGEX.exec(text)) !== null) {
        decorations.push(
          Decoration.mark({ class: 'highlight-primitive-literals' }).range(
            match.index,
            match.index + match[0].length,
          ),
        );
      }

      return Decoration.set(decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: () => [
      javascript(),
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.string, color: '#a11' },
          { tag: tags.number, color: '#164' },
          { tag: tags.function(tags.variableName), color: '#00f' },
        ]),
      ),
      EditorView.theme({
        '.highlight-primitive-literals': { color: '#708' },
      }),
    ],
  },
);
