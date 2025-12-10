import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  viewChild,
  output,
  model,
  effect,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as ace from 'ace-builds';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';

@Component({
  selector: 'json-editor',
  template: `<div #editorContainer style="height: 100%; width: 100%;"></div>`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JSONEditorComponent implements AfterViewInit, OnDestroy {
  editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

  value = model('');
  viewOnly = input(false);

  editorReady = output<any>();

  private editor!: ace.Ace.Editor;

  constructor() {
    effect(() => {
      this.editor && this.setValue(this.value());
    });

    effect(() => {
      this.editor && this.setReadOnly(this.viewOnly());
    });
  }

  ngAfterViewInit() {
    this.editor = ace.edit(this.editorContainer()!.nativeElement, {
      mode: 'ace/mode/json',
      theme: 'ace/theme/monokai',
      showPrintMargin: false,
      fontSize: '14px',
      tabSize: 2,
      useSoftTabs: true,
      highlightActiveLine: true,
      showGutter: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
    });

    this.editor.setValue(this.value() || '', -1);

    this.editor.on('change', () => {
      const newValue = this.editor.getValue();
      this.value.set(newValue);
    });

    this.editorReady.emit(this.editor);
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
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
