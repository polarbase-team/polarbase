import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  model,
  output,
} from '@angular/core';
import { minimalSetup } from 'codemirror';
import { EditorView, EditorViewConfig, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';

import { indentInsideBrackets } from './extensions/indent-inside-brackets';
import { deleteBracketPair } from './extensions/delete-bracket-pair';
import { syntaxHighlightPlugin } from './extensions/syntax-highlight';
import { chipReplacerPlugin } from './extensions/chip-replacer';
import { inlineSuggestionPlugin } from './extensions/inline-suggestion';
import { roundBracketFoldService } from './extensions/round-bracket-fold';

@Component({
  selector: 'formula-editor',
  template: '',
  styleUrl: './formula-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaEditorComponent implements AfterViewInit {
  doc = model('');

  focus = output();
  blur = output();

  editorView: EditorView;
  isFocused: boolean;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    const config: EditorViewConfig = {
      doc: this.doc(),
      parent: this.elementRef.nativeElement,
      extensions: [
        minimalSetup,
        EditorView.theme({
          '.cm-content': { lineHeight: 2 },
          '.cm-gutter': { lineHeight: 2 },
        }),
        keymap.of(defaultKeymap),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlightPlugin,
        indentInsideBrackets,
        deleteBracketPair,
        chipReplacerPlugin({
          regex: /#{field_([0-7][0-9A-HJKMNP-TV-Z]{25})}/g,
          async replace(id) {
            return '<i class="icon icon-text mr-4 pv-2"></i><span>Name</span>';
          },
        }),
        inlineSuggestionPlugin({
          async suggest(text) {
            if (text.endsWith('SU')) {
              return ['M()', -1];
            } else if (text.endsWith('Na')) {
              return ['me'];
            }

            return null;
          },
        }),
        roundBracketFoldService,
        EditorView.updateListener.of(this.onUpdated.bind(this)),
      ],
    };

    this.editorView = new EditorView(config);
  }

  private onUpdated(update: ViewUpdate) {
    if (update.docChanged) {
      this.doc.set(update.state.doc.toString());
    }

    if (update.focusChanged || update.selectionSet) {
      if (update.view.hasFocus) {
        if (!this.isFocused) this.focus.emit();
      } else {
        if (this.isFocused) this.blur.emit();
      }

      this.isFocused = update.view.hasFocus;
    }
  }
}
