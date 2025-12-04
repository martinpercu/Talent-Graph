import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LightdarkthemeService {

  isDarkModeSig = signal<Boolean | undefined>(undefined);

  constructor() {
    const savedTheme = localStorage.getItem('theme');
    console.log(savedTheme);
    if (savedTheme === 'dark') {
      this.isDarkModeSig.set(true)
    }
  }

  toggleDarkMode() {
    this.isDarkModeSig.set(!this.isDarkModeSig());
    if (this.isDarkModeSig()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

}
