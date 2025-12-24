import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, NavbarComponent, FooterComponent],
    template: `
    <div class="flex flex-col min-h-screen bg-gray-50 dark:bg-black">
      <app-navbar />
      
      <main class="flex-1 w-full">
        <router-outlet />
      </main>

      <app-footer />
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent { }
