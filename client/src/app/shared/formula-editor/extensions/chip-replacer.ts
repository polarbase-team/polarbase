import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { Prec, Range, SelectionRange } from '@codemirror/state';

class ChipWidget extends WidgetType {
  private id: any;
  private replaceFn: (id: any) => Promise<string>;

  constructor(id: any, replaceFn: (id: any) => Promise<string>) {
    super();

    this.id = id;
    this.replaceFn = replaceFn;
  }

  toDOM() {
    const chip = document.createElement('div');

    chip.textContent = `#${this.id}`;
    chip.style.display = 'inline-block';
    chip.style.maxHeight = '22px';
    chip.style.padding = '2px 6px';
    chip.style.marginLeft = '4px';
    chip.style.borderRadius = '8px';
    chip.style.fontSize = '10px';
    chip.style.backgroundColor = '#E0E0E0';

    this.replaceFn?.(this.id)
      .then((html) => {
        chip.innerHTML = html;
      })
      .catch(() => {
        chip.textContent = 'Not available';
        chip.style.backgroundColor = '#FFCDD2';
      });

    return chip;
  }

  override ignoreEvent() {
    return true;
  }
}

export interface ChipReplacerPluginConfig {
  regex: RegExp;
  replace?(id: any): Promise<string>;
}

export const chipReplacerPlugin = (config: ChipReplacerPluginConfig) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.getDecorations(view);

        (view as any)._chipReplacerPlugin = this;
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = this.getDecorations(update.view);
        }

        if (update.selectionSet) {
          this.adjustCursor(update.view);
        }
      }

      getDecorations(view: EditorView) {
        const decorations: Range<Decoration>[] = [];
        const text = view.state.doc.toString();

        let match: RegExpMatchArray | null;
        while ((match = config.regex.exec(text)) !== null) {
          const id = match[1];
          const start = match.index;
          const end = start + match[0].length;
          const widget = new ChipWidget(id, config.replace);
          decorations.push(Decoration.replace({ widget, side: 1 }).range(start, end));
        }

        return Decoration.set(decorations);
      }

      removeDecorationAt(view: EditorView, pos: number) {
        let textStart = pos;
        let textEnd = pos;

        this.decorations.between(0, view.state.doc.length, (from, to) => {
          if (to === pos) {
            textStart = from;
            textEnd = to;
          }
        });

        this.decorations = this.decorations.update({
          filter: (from) => from !== pos,
        });

        view.dispatch({
          changes: { from: textStart, to: textEnd },
        });
      }

      adjustCursor(view: EditorView) {
        const cursorPos = view.state.selection.main.head;

        this.decorations.between(cursorPos, cursorPos, (from, to) => {
          if (cursorPos === from + 1) {
            setTimeout(() => {
              view.dispatch({
                selection: { anchor: to },
              });
            });
          } else if (cursorPos === to - 1) {
            setTimeout(() => {
              view.dispatch({
                selection: { anchor: from },
              });
            });
          }
        });
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: () =>
        Prec.highest([
          keymap.of([
            {
              key: 'Backspace',
              run(view) {
                const selection = view.state.selection.main;
                if (selection.from !== selection.to) return false;

                const cursorPos = selection.head;
                const plugin = (view as any)._chipReplacerPlugin;
                if (!plugin) return false;

                let hasWidget = false;
                plugin.decorations.between(cursorPos, cursorPos, () => {
                  hasWidget = true;
                });
                if (hasWidget) {
                  plugin.removeDecorationAt(view, cursorPos);
                  return true;
                }

                return false;
              },
            },
          ]),
        ]),
    },
  );
