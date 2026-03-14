import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MarkdownPipe } from '../pipes/markdown.pipe';

@Component({
  selector: 'chatbot-prose',
  templateUrl: './chatbot-prose.component.html',
  styleUrl: './chatbot-prose.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [CommonModule, MarkdownPipe],
})
export class ChatbotProseComponent {
  content = input.required<string>();
  thought = input<boolean>();
}
