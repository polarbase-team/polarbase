import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language }).value;
      const langClass = lang ? ` class="hljs language-${language}"` : ' class="hljs"';
      return `<pre><code${langClass}>${highlighted}</code></pre>`;
    },
  },
  breaks: true,
  gfm: true,
});

@Pipe({
  name: 'markdown',
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    const html = marked.parse(value, { async: false }) as string;
    return DOMPurify.sanitize(html);
  }
}
