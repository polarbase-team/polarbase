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
import { roundBracketFoldService } from './extensions/round-bracket-fold';
import { replaceDoubleQuotes } from './extensions/replace-double-quotes';
import { formulaAutocomplete } from './extensions/autocomplete';
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
          '&': {
            height: '100%',
            borderRadius: 'inherit',
            overflow: 'visible',
          },
          '.cm-scroller': {
            lineHeight: 2,
            borderRadius: 'inherit',
          },
          '.cm-gutters': {
            lineHeight: 2,
            borderTopLeftRadius: 'inherit',
            borderBottomLeftRadius: 'inherit',
            minWidth: '30px',
            display: 'flex',
            justifyContent: 'center',
          },
          '.cm-content': { lineHeight: 2 },
          '&.cm-focused .cm-cursor': { borderLeftColor: '#3b82f6' },
          '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
            backgroundColor: '#dbeafe',
          },
          '.cm-tooltip-autocomplete': {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
          },
          '.cm-tooltip-autocomplete > ul': {
            fontFamily: 'inherit',
          },
          '.cm-tooltip-autocomplete > ul > li': {
            padding: '6px 12px',
          },
          '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
          },
          '.cm-completionDetail': {
            fontStyle: 'italic',
            color: '#6b7280',
            marginLeft: '8px',
          },
        }),
        keymap.of(defaultKeymap),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlightPlugin,
        indentInsideBrackets,
        deleteBracketPair,
        formulaAutocomplete(() => this.columns()),
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
