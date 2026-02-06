import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  viewChild,
  output,
  effect,
  input,
  ChangeDetectionStrategy,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import * as ace from 'ace-builds';

ace.config.set('basePath', 'ace-builds/src-noconflict');

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-textmate';

@Component({
  selector: 'json-editor',
  template: `<div #editorContainer style="height: 100%; width: 100%;"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => JSONEditorComponent),
      multi: true,
    },
  ],
})
export class JSONEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

  viewOnly = input(false);
  placeholder = input('');

  focus = output();
  blur = output();
  editorReady = output<ace.Ace.Editor>();

  private editor!: ace.Ace.Editor;

  private _value = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      this.editor && this.setReadOnly(this.viewOnly());
    });

    effect(() => {
      this.editor && this.editor.setOption('placeholder', this.placeholder());
    });
  }

  ngAfterViewInit() {
    this.editor = ace.edit(this.editorContainer()!.nativeElement, {
      mode: 'ace/mode/json',
      theme: 'ace/theme/textmate',
      showPrintMargin: false,
      fontSize: '14px',
      tabSize: 2,
      useSoftTabs: true,
      highlightActiveLine: true,
      showGutter: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      placeholder: this.placeholder(),
    });

    this.editor.setValue(this._value || '', -1);

    this.editor.on('change', () => {
      const newValue = this.editor.getValue();
      if (this._value !== newValue) {
        this._value = newValue;
        this.onChange(newValue);
      }
    });

    this.editor.on('focus', () => {
      this.focus.emit();
    });

    this.editor.on('blur', () => {
      this.blur.emit();
      this.onTouched();
    });

    this.editorReady.emit(this.editor);
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  writeValue(value: string) {
    const newValue = value || '';
    if (this._value !== newValue) {
      this._value = newValue;
      if (this.editor) {
        const currentValue = this.editor.getValue();
        if (currentValue !== newValue) {
          this.editor.setValue(newValue, -1);
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
    if (this.editor) {
      this.editor.setReadOnly(isDisabled);
    }
  }

  setValue(value: string) {
    this.editor.setValue(value, -1);
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setReadOnly(readOnly: boolean) {
    this.editor.setReadOnly(readOnly);
  }
}
