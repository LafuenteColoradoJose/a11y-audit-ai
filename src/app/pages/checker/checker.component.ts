import { Component, ChangeDetectionStrategy, signal, inject, EffectRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs/operators';
import { AuditService, AuditIssue } from '../../services/audit.service';
import { CodeEditorComponent } from '../../components/code-editor/code-editor.component';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-checker',
  imports: [FormsModule, CodeEditorComponent],
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
                (change)="analyzeCode()"
                class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
              >
                <option value="A">Level A (Essential)</option>
                <option value="AA">Level AA (Standard)</option>
                <option value="AAA">Level AAA (Strict)</option>
              </select>
            </div>

            <!-- Model toggle removed: We now default to Local AI + Regex Fallback -->


            <div class="flex items-end">
              <button
                (click)="analyzeCode()"
                [disabled]="isAnalyzing()"
                class="w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              >
                @if (isAnalyzing()) {
                  <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                } @else {
                  Analyze Code
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Editor & Results Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          <!-- Pro Code Editor -->
          <div class="flex flex-col h-full">
            <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 mb-2">
              Source Code
            </label>
            <div class="flex-1 rounded-md overflow-hidden shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-zinc-700">
               <app-code-editor [code]="codeSnippet()" (codeChange)="onCodeChange($event)" />
            </div>
          </div>

          <!-- Results Panel -->
          <div class="flex flex-col h-full bg-gray-50 dark:bg-zinc-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-700 p-6 overflow-hidden">
             <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 mb-2">
              Audit Results
            </label>
            
            @if (results().length === 0 && !hasAnalyzed()) {
              <div class="flex flex-1 items-center justify-center text-center">
                <p class="text-sm text-gray-500">Paste some code and click Analyze to start.</p>
              </div>
            } @else if (results().length === 0 && hasAnalyzed()) {
               <div class="flex flex-1 items-center justify-center text-center">
                <p class="text-sm text-green-500 font-medium">✨ No obvious issues found! You are a pro!</p>
              </div>
            } @else {
              <div class="overflow-y-auto space-y-4 pr-2">
                 @for (issue of results(); track issue.id) {
                   <div class="p-4 bg-white dark:bg-zinc-800 rounded-lg border-l-4 shadow-sm"
                        [class.border-red-500]="issue.severity === 'high'"
                        [class.border-yellow-400]="issue.severity === 'medium'"
                        [class.border-blue-400]="issue.severity === 'low'">
                     <h4 class="text-sm font-bold flex items-center gap-2 justify-between"
                         [class.text-red-600]="issue.severity === 'high'"
                         [class.text-yellow-600]="issue.severity === 'medium'"
                         [class.text-blue-600]="issue.severity === 'low'">
                        <span class="flex items-center gap-2">
                          @if(issue.severity === 'high') { ⛔ Critical }
                          @else if(issue.severity === 'medium') { ⚠️ Warning }
                          @else { ℹ️ Info }
                        </span>

                        @if(canFix(issue)) {
                          <button 
                            (click)="fixIssue(issue)" 
                            [disabled]="isFixing() === issue.id || isAnalyzing()"
                            class="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded hover:bg-indigo-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait">
                               @if(isFixing() === issue.id) {
                                 <svg class="animate-spin h-3 w-3 text-indigo-700 dark:text-indigo-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                   <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                   <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Fixing...
                               } @else {
                                 🪄 Auto-Fix
                               }
                          </button>
                        }
                     </h4>
                     <p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-200">{{ issue.message }}</p>
                     <p class="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 p-2 rounded">
                       💡 {{ issue.suggestion }}
                     </p>
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
  protected auditService = inject(AuditService);

  selectedLevel = signal('AA');
  codeSnippet = signal('<!-- Paste your element here -->\n<button>Click me</button>');
  results = signal<AuditIssue[]>([]);
  isAnalyzing = signal(false);
  hasAnalyzed = signal(false);

  private codeChangeSubject = new Subject<string>();

  constructor() {
    // Setup automatic analysis debounce
    this.codeChangeSubject.pipe(
      debounceTime(2000), // Wait 2 seconds of inactivity
      distinctUntilChanged(),
      filter(code => code.length > 5) // Don't analyze empty/tiny code
    ).subscribe(() => {
      this.analyzeCode();
    });
  }

  onCodeChange(newCode: string) {
    this.codeSnippet.set(newCode);
    this.codeChangeSubject.next(newCode);
    // Reset analysis state while typing to indicate freshness
    if (this.hasAnalyzed()) {
      this.hasAnalyzed.set(false);
    }
  }

  analyzeCode() {
    if (!this.codeSnippet()) return;

    this.isAnalyzing.set(true);
    // Keep results visible while reloading to avoid flicker, or clear if you prefer
    // this.results.set([]); 

    this.auditService.analyzeCode(this.codeSnippet(), this.selectedLevel())
      .subscribe((issues) => {
        this.results.set(issues);
        this.isAnalyzing.set(false);
        this.hasAnalyzed.set(true);
      });
  }

  isFixing = signal<string | null>(null); // Store the ID of the issue being fixed

  canFix(issue: AuditIssue): boolean {
    // Enable Auto-Fix for AI-detected issues (which start with 'ai-') 
    if (issue.ruleId.startsWith('ai-')) return true;

    return ['image-alt', 'button-name', 'prefer-native-button', 'label', 'label-title-only', 'aria-hidden-focus', 'minimize-tabindex', 'missing-skip-link', 'focus-obscured', 'aria-required-parent', 'aria-allowed-role', 'redundant-role', 'aria-hidden-body', 'nested-interactive', 'th-has-data-cells'].includes(issue.ruleId);
  }

  async fixIssue(issue: AuditIssue) {
    this.isFixing.set(issue.id);
    try {
      // UX Improvement: Artificial delay (500ms) so the user sees the spinner 
      // and realizes "work" is being done. Instant fixes can be confusing.
      await new Promise(resolve => setTimeout(resolve, 500));

      const fixedCode = await this.auditService.applyFix(this.codeSnippet(), issue);
      this.codeSnippet.set(fixedCode);
      this.analyzeCode();
    } finally {
      this.isFixing.set(null);
    }
  }


}
