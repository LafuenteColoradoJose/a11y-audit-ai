import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  template: `
    <div class="py-12 min-h-screen">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="text-center mb-16">
          <h1 class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-4">
            Mastering <span class="text-indigo-600">Accessibility</span>
          </h1>
          <p class="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            Building the web for everyone isn't just a nice-to-have, it's a responsibility. 
            Here are the best resources to help you create inclusive digital experiences.
          </p>
        </div>

        <!-- Resources Grid -->
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          
          <!-- Resource 1: Web.dev -->
          <a href="https://web.dev/learn/accessibility" target="_blank" class="group relative block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="h-10 w-10 text-indigo-600 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <!-- Icon: Academic/Learn -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.258 50.55 50.55 0 01-2.715.813m-15.482 0a50.55 50.55 0 012.715.813m15.482 0a50.55 50.55 0 01-2.715.813M3.5 10.75c0 7.402 6.024 13.55 12.96 13.55 0 0 .54 0 1.54 0" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Google web.dev Course</h3>
            <p class="text-gray-500 dark:text-gray-400">An excellent, structured course created by Google Chrome team. It covers everything from basic semantics to advanced ARIA patterns.</p>
          </a>

          <!-- Resource 2: MDN -->
          <a href="https://developer.mozilla.org/es/docs/Web/Accessibility" target="_blank" class="group relative block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="h-10 w-10 text-indigo-600 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <!-- Icon: Book/Docs -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">MDN Web Docs</h3>
            <p class="text-gray-500 dark:text-gray-400">The gold standard for web documentation. Practical guides, code snippets, and deep explanations of HTML accessibility features.</p>
          </a>

          <!-- Resource 3: WCAG Quickref -->
          <a href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank" class="group relative block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="h-10 w-10 text-indigo-600 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <!-- Icon: Checklist/Standards -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">WCAG 2.2 QuickRef</h3>
            <p class="text-gray-500 dark:text-gray-400">The customizable quick reference for Web Content Accessibility Guidelines. Essential for understanding the legal and technical requirements.</p>
          </a>

          <!-- Resource 4: HTML ARIA -->
          <a href="https://www.w3.org/TR/html-aria/" target="_blank" class="group relative block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="h-10 w-10 text-indigo-600 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
               <!-- Icon: Code/Technical -->
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
               </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">W3C HTML ARIA</h3>
            <p class="text-gray-500 dark:text-gray-400">The technical specification for ARIA in HTML. Use this to understand how to build complex interactive components correctly.</p>
          </a>

          <!-- Resource 5: A11y Project (Extra) -->
          <a href="https://www.a11yproject.com/" target="_blank" class="group relative block p-8 bg-indigo-600 border border-indigo-600 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
             <div class="h-10 w-10 text-white mb-4 bg-white/20 rounded-lg flex items-center justify-center">
              <!-- Icon: Community/Heart -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">The A11y Project</h3>
            <p class="text-indigo-100">A community-driven checklist and knowledge base. It simplifies the complex W3C guidelines into consumable advice.</p>
          </a>

        </div>

        <!-- Footer Note -->
        <div class="mt-16 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 p-4 rounded-r">
          <div class="flex">
            <div class="flex-shrink-0">
               <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700 dark:text-yellow-200">
                Remember: Automated tools (like this app!) only catch ~30-50% of issues. 
                Manual testing with screen readers (NVDA, VoiceOver) and keyboard navigation is essential.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent { }