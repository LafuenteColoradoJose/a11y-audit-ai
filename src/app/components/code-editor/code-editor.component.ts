import { Component, ChangeDetectionStrategy, signal, computed, effect, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';

@Component({
    selector: 'app-code-editor',
    standalone: true,
    imports: [FormsModule],
    template: `
    <div class="relative w-full h-full min-h-[300px] border border-gray-600 rounded bg-[#2d2d2d] overflow-hidden group">
      <!-- Highlighted Layer -->
      <pre class="language-html m-0 p-4 absolute inset-0 pointer-events-none font-mono text-sm" aria-hidden="true"><code [innerHTML]="highlightedCode()"></code></pre>

      <!-- Editing Layer -->
      <textarea
        [ngModel]="code()"
        (ngModelChange)="onCodeChange($event)"
        class="block w-full h-full p-4 bg-transparent text-transparent caret-white resize-none border-0 focus:ring-0 absolute inset-0 font-mono text-sm leading-6 outline-none"
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
    textarea, pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    }
    /* Hide scrollbar for cleaner look if needed, but keeping it is better for UX */
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeEditorComponent {
    code = model<string>('');

    highlightedCode = computed(() => {
        const raw = this.code() || '';
        // Use Prism to highlight using HTML grammar
        // Check if Prism is loaded
        if (!Prism) return raw;

        // Safety check for grammar
        const grammar = Prism.languages['html'];
        if (!grammar) return raw;

        // We add a trailing newline to match textarea behavior if needed, 
        // but typically just highlighting the raw code is enough.
        // Sometimes textareas allow scrolling past end.
        return Prism.highlight(raw, grammar, 'html');
    });

    onCodeChange(newValue: string) {
        this.code.set(newValue);
    }

    clearCode() {
        this.code.set('');
    }
}
