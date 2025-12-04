import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { firebaseConfig } from '@env/environment';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';

import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { provideAnimations } from '@angular/platform-browser/animations'; // Necesario para Angular Material
import { HttpClient } from '@angular/common/http'; // Necesario para MatIconRegistry
import { DomSanitizer } from '@angular/platform-browser';
import { ErrorHandler, isDevMode } from '@angular/core'; // Importa ErrorHandler
import { DOCUMENT } from '@angular/common'; // Importa DOCUMENT

import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';

import { provideStorage, getStorage } from '@angular/fire/storage';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideStorage(() => getStorage()),
    { provide: FIREBASE_OPTIONS, useValue: firebaseConfig },
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnimations(), // Requerido por Angular Material
    importProvidersFrom(MatIconModule), // Importa el módulo de íconos
    provideTransloco({
      config: {
        availableLangs: ['en', 'es'],
        defaultLang: 'en',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }), provideHttpClient(), provideTransloco({
        config: {
          availableLangs: ['en', 'es', 'fr'],
          defaultLang: 'en',
          // Remove this option if your application doesn't support changing language in runtime.
          reRenderOnLangChange: true,
          prodMode: !isDevMode(),
        },
        loader: TranslocoHttpLoader
      }),
  ]
};


