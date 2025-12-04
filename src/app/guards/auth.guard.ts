import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { take, map } from 'rxjs/operators';
import { from } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Usa el Observable de Firebase 'user$' que se define en AuthService.
  // 2. Este Observable emite el estado de autenticación de Firebase después de la inicialización.
  return authService.user$.pipe(
    take(1), // Asegura que solo se compruebe el primer valor (al inicializar/cargar)
    map(firebaseUser => {
      if (firebaseUser) {
        // Firebase dice que SÍ hay un usuario, permite el acceso.
        // La lógica de cargar datos (Recruiter/Candidate) puede seguir en el constructor.
        console.log("GUARD - Usuario de Firebase autenticado. Permitiendo acceso.");
        return true;
      } else {
        // Firebase dice que NO hay usuario. Redirige.
        console.log("GUARD - No hay usuario de Firebase. Redirigiendo a /login.");
        return router.parseUrl('/login'); // Usa parseUrl para devolver un UrlTree
      }
    })
  );



};

