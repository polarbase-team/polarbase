import { Component, signal, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ImageModule } from 'primeng/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ScrollPanelModule,
    ProgressSpinnerModule,
    ImageModule,
  ],
  templateUrl: './chatbot.component.html',
})
export class AppChatBot {
  messages = signal<Message[]>([]);

  inputText = signal('');
  isTyping = signal(false);

  private scrollContainer = viewChild<ScrollPanel>('scrollContainer');
  private editor = viewChild<ElementRef>('editor');

  constructor() {
    effect(() => {
      this.messages();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  scrollToBottom() {
    this.scrollContainer()!.scrollTop(999999);
  }

  protected sendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

    this.messages.update((m) => [...m, { role: 'user', content: text, timestamp: new Date() }]);
    this.editor()!.nativeElement.innerHTML = '';
    this.inputText.set('');
    this.isTyping.set(true);
    this.scrollToBottom();
  }

  protected onInput(event: InputEvent) {
    const target: any = event.target;

    const text = target.innerHTML;
    this.inputText.set(text);

    const trimmed = target.innerText.trim();
    if (trimmed === '') target.innerHTML = '';
  }

  protected onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
