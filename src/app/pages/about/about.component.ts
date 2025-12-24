import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-about',
    imports: [],
    template: `
    <div class="py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            <span class="block">About</span>
            <span class="block text-indigo-600">Angular 21</span>
          </h1>
          <p class="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            This is your new default layout with a sticky footer and a responsive navbar. 
            Start building your amazing app here!
          </p>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent { } 