import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="relative overflow-hidden bg-white dark:bg-black py-24 sm:py-32">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Audit your code for <br>
            <span class="text-indigo-600">Accessibility</span> compliance
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Powered by advanced AI models, our tool checks your Angular & HTML code against WCAG A, AA, and AAA standards. Build a more inclusive web today.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <a routerLink="/audit" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all">
              Start Auditing
            </a>
            <a routerLink="/about" class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent { }
