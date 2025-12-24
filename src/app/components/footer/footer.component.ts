import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-footer',
    imports: [],
    template: `
    <footer class="bg-white border-t border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 mt-auto">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="md:flex md:items-center md:justify-between">
          <div class="mt-8 md:mt-0 md:order-1">
            <p class="text-center text-base text-gray-400">
              &copy; {{ currentYear }} Angular21 Project. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
    currentYear = new Date().getFullYear();
}
