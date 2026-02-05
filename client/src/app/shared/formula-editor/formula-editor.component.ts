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
