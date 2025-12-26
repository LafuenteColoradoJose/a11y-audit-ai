import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-white border-b border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="shrink-0 flex items-center">
              <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
                A11y Auditor
              </span>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a routerLink="/" 
                 routerLinkActive="border-indigo-500 text-gray-900 dark:text-white"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200">
                Home
              </a>
              <a routerLink="/audit"
                 routerLinkActive="border-indigo-500 text-gray-900 dark:text-white"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200">
                Auditor
              </a>
              <a routerLink="/about"
                 routerLinkActive="border-indigo-500 text-gray-900 dark:text-white"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200">
                About
              </a>
            </div>
          </div>
          <div class="flex items-center">

          </div>
        </div>
      </div>
    </nav>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent { }
