import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  input,
  output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { minimalSetup } from 'codemirror';
import { EditorView, EditorViewConfig, keymap, ViewUpdate, placeholder } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';

import { indentInsideBrackets } from './extensions/indent-inside-brackets';
import { deleteBracketPair } from './extensions/delete-bracket-pair';
import { syntaxHighlightPlugin } from './extensions/syntax-highlight';
import { inlineSuggestionPlugin } from './extensions/inline-suggestion';
import { roundBracketFoldService } from './extensions/round-bracket-fold';
import { replaceDoubleQuotes } from './extensions/replace-double-quotes';
import { SUPPORTED_FUNCTIONS } from './supported-functions';

@Component({
  selector: 'formula-editor',
  template: '',
  styleUrl: './formula-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormulaEditorComponent),
      multi: true,
    },
  ],
})
export class FormulaEditorComponent implements AfterViewInit, ControlValueAccessor {
  placeholder = input('');
  columns = input<string[]>([]);

  focus = output();
  blur = output();

  editorView: EditorView;
  isFocused: boolean;

  private _value = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    const config: EditorViewConfig = {
      doc: this._value,
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
        inlineSuggestionPlugin({
          suggest: async (text) => {
            const lastWordMatch = text.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
            if (!lastWordMatch) return null;

            const lastWord = lastWordMatch[0];
            const lowerLastWord = lastWord.toLowerCase();

            // Try matching functions first
            const funcMatch = SUPPORTED_FUNCTIONS.find((f) => f.startsWith(lowerLastWord));
            if (funcMatch) {
              const suggestionText = funcMatch.slice(lastWord.length);
              const isUpper = lastWord === lastWord.toUpperCase() && lastWord.length > 0;
              const result = isUpper ? suggestionText.toUpperCase() : suggestionText;
              return [result + '()', -1];
            }

            // Try matching columns
            const colMatch = this.columns().find(
              (c) => c.toLowerCase().startsWith(lastWord.toLowerCase()) && c !== lastWord,
            );
            if (colMatch) {
              return [colMatch.slice(lastWord.length)];
            }

            return null;
          },
        }),
        roundBracketFoldService,
        replaceDoubleQuotes,
        placeholder(this.placeholder()),
        EditorView.updateListener.of(this.onUpdated.bind(this)),
      ],
    };

    this.editorView = new EditorView(config);
  }

  writeValue(value: string) {
    const newValue = value || '';
    if (this._value !== newValue) {
      this._value = newValue;
      if (this.editorView) {
        const currentDoc = this.editorView.state.doc.toString();
        if (currentDoc !== newValue) {
          this.editorView.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: newValue },
          });
        }
      }
    }
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean) {
    // Implement if needed
  }

  private onUpdated(update: ViewUpdate) {
    if (update.docChanged) {
      const val = update.state.doc.toString();
      this._value = val;
      this.onChange(val);
    }

    if (update.focusChanged || update.selectionSet) {
      if (update.view.hasFocus) {
        if (!this.isFocused) this.focus.emit();
      } else {
        if (this.isFocused) {
          this.blur.emit();
          this.onTouched();
        }
      }

      this.isFocused = update.view.hasFocus;
    }
  }
}
