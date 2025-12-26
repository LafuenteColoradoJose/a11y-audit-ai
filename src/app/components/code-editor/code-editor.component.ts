import { Component, ChangeDetectionStrategy, signal, computed, effect, model, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/themes/prism-okaidia.css'; // Dark theme matches our UI

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative w-full h-full min-h-[300px] border border-gray-600 rounded bg-[#2d2d2d] overflow-hidden group">
      <!-- Highlighted Layer -->
      <pre #preElement class="language-html m-0 p-4 absolute inset-0 pointer-events-none font-mono text-sm overflow-hidden" aria-hidden="true"><code [innerHTML]="highlightedCode()"></code></pre>

      <!-- Editing Layer -->
      <textarea
        #textareaElement
        [ngModel]="code()"
        (ngModelChange)="onCodeChange($event)"
        (scroll)="syncScroll()"
        class="block w-full h-full p-4 bg-transparent text-transparent caret-white resize-none border-0 focus:ring-0 absolute inset-0 font-mono text-sm outline-none overflow-auto custom-scrollbar"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
      ></textarea>
      
      <div class="absolute top-2 right-2 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity z-10">
        <span class="text-[10px] text-white pointer-events-none">HTML/Angular</span>
        <button 
          type="button"
          (click)="clearCode()"
          class="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded shadow transition-colors cursor-pointer"
        >
          Limpiar
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Container Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #2d2d2d;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 5px;
      border: 2px solid #2d2d2d;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #777;
    }

    textarea, pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      white-space: pre !important; /* Keep horizontal scroll behavior */
      padding: 1rem !important;
      border: 0 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    /* Force text transparency on textarea to avoid ghosting */
    textarea {
        color: transparent !important;
    }

    /* Adjust Prism overrides */
    pre[class*="language-"] {
        background: transparent !important;
        text-shadow: none !important;
    }
  `],

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeEditorComponent {
  code = model<string>('');

  @ViewChild('textareaElement') textareaElement!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('preElement') preElement!: ElementRef<HTMLPreElement>;

  highlightedCode = computed(() => {
    const raw = this.code() || '';
    if (!Prism) return raw;

    const grammar = Prism.languages['html'];
    if (!grammar) return raw;

    return Prism.highlight(raw, grammar, 'html');
  });

  onCodeChange(newValue: string) {
    this.code.set(newValue);
  }

  clearCode() {
    this.code.set('');
  }

  syncScroll() {
    if (this.textareaElement && this.preElement) {
      this.preElement.nativeElement.scrollTop = this.textareaElement.nativeElement.scrollTop;
      this.preElement.nativeElement.scrollLeft = this.textareaElement.nativeElement.scrollLeft;
    }
  }
}
