import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { Prec } from '@codemirror/state';

class InlineSuggestionWidget extends WidgetType {
  private suggestion: string;

  constructor(suggestion: string) {
    super();

    this.suggestion = suggestion;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.suggestion;
    span.style.color = '#888';
    span.style.fontStyle = 'italic';
    span.style.opacity = '0.6';
    return span;
  }

  override ignoreEvent() {
    return true;
  }
}

export type InlineSuggestion = [string | null, number?];

export interface InlineSuggestionPluginConfig {
  suggest(text: string): Promise<InlineSuggestion>;
}

export const inlineSuggestionPlugin = (config: InlineSuggestionPluginConfig) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      currentSuggestion: InlineSuggestion;

      constructor(view: EditorView) {
        (view as any)._inlineSuggestionPlugin = this;

        this.decorations = Decoration.none;
        this.currentSuggestion = null;

        this.updateSuggestions(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.updateSuggestions(update.view);
        }

        if (update.focusChanged) {
          this.clearSuggestions(update.view);
        }
      }

      async updateSuggestions(view: EditorView) {
        const cursorPos = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursorPos);
        if (line.text.slice(cursorPos, cursorPos + 1) !== '') return;

        const textBeforeCursor = line.text.slice(0, cursorPos - line.from);
        const suggestion = await config.suggest(textBeforeCursor);
        if (suggestion) {
          const widget = new InlineSuggestionWidget(suggestion[0]);
          this.currentSuggestion = suggestion;
          this.decorations = Decoration.set([
            Decoration.widget({ widget, side: 1 }).range(cursorPos),
          ]);
        } else {
          this.currentSuggestion = null;
          this.decorations = Decoration.none;
        }

        view.dispatch({});
      }

      clearSuggestions(view: EditorView) {
        this.currentSuggestion = null;
        this.decorations = Decoration.none;
        view.requestMeasure();
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: () =>
        Prec.highest(
          keymap.of([
            {
              key: 'Tab',
              preventDefault: true,
              run(view) {
                const plugin = (view as any)._inlineSuggestionPlugin;
                if (!plugin) return false;

                const currentSuggestion: InlineSuggestion = plugin.currentSuggestion;
                if (currentSuggestion) {
                  plugin.clearSuggestions(view);

                  const cursorPos = view.state.selection.main.head;

                  view.dispatch({
                    changes: {
                      from: cursorPos,
                      insert: currentSuggestion[0],
                    },
                    selection: {
                      anchor: cursorPos + currentSuggestion[0].length + (currentSuggestion[1] || 0),
                    },
                  });

                  return true;
                }

                return false;
              },
            },
          ]),
        ),
    },
  );
