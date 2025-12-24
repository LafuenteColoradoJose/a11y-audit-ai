import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-checker',
    imports: [FormsModule],
    template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="space-y-8">
        <!-- Header -->
        <div class="md:flex md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <h2 class="text-3xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-4xl sm:tracking-tight">
              AI Accessibility Auditor
            </h2>
            <p class="mt-2 text-lg text-gray-500 dark:text-gray-400">
              Paste your HTML/Angular code below and let AI check for WCAG compliance.
            </p>
          </div>
        </div>

        <!-- Controls -->
        <div class="bg-white dark:bg-zinc-900 shadow rounded-lg p-6 border border-gray-100 dark:border-zinc-800">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label for="wcag-level" class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                Target WCAG Level
              </label>
              <select
                id="wcag-level"
                [(ngModel)]="selectedLevel"
                class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
              >
                <option value="A">Level A (Essential)</option>
                <option value="AA">Level AA (Standard)</option>
                <option value="AAA">Level AAA (Strict)</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                (click)="analyzeCode()"
                class="w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-95"
              >
                Analyze Code
              </button>
            </div>
          </div>
        </div>

        <!-- Editor & Results Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          <!-- Simple Code Editor (Textarea for MVP) -->
          <div class="flex flex-col h-full">
            <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 mb-2">
              Source Code
            </label>
            <textarea
              [(ngModel)]="codeSnippet"
              class="flex-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-mono text-xs dark:bg-zinc-900 dark:text-gray-300 dark:ring-zinc-700 p-4 resize-none"
              placeholder="<!-- Paste your element here -->
<button>Click me</button>"
            ></textarea>
          </div>

          <!-- Results Panel -->
          <div class="flex flex-col h-full bg-gray-50 dark:bg-zinc-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-700 p-6">
             <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 mb-2">
              Audit Results
            </label>
            
            @if (results().length === 0) {
              <div class="flex flex-1 items-center justify-center text-center">
                <p class="text-sm text-gray-500">No issues found yet... or maybe you haven't analyzed anything!</p>
              </div>
            } @else {
              <div class="overflow-y-auto space-y-4">
                 @for (res of results(); track $index) {
                   <div class="p-4 bg-white dark:bg-zinc-800 rounded-lg border-l-4 border-yellow-400 shadow-sm">
                     <h4 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <span class="text-yellow-600">⚠️ Recommendation</span>
                     </h4>
                     <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ res }}</p>
                   </div>
                 }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckerComponent {
    selectedLevel = signal('AA'); // Signals for modern state
    codeSnippet = signal('');
    results = signal<string[]>([]); // Array of string results

    analyzeCode() {
        // Mock AI response for now
        if (!this.codeSnippet()) return;

        // Simulating "thinking"
        setTimeout(() => {
            this.results.set([
                `For WCAG Level ${this.selectedLevel()}: Ensure all interactive elements have accessible names.`,
                'Consider adding aria-label if the button text is purely iconic.',
                'Contrast ratio check: Pending analysis.'
            ]);
        }, 500);
    }
}
