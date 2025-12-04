import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { take, map } from 'rxjs/operators';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Usamos el Observable 'user$' de Firebase para verificar el estado
  return authService.user$.pipe(
    take(1),
    map(firebaseUser => {
      if (firebaseUser) {
        // ⚠️ Si SÍ hay un usuario logueado, lo enviamos al root de la app.
        console.log("GUARD público - Usuario ya logueado. Redirigiendo a /.");
        return router.parseUrl('/'); // Redirige a la página principal
      } else {
        // ✅ Si NO hay usuario, permitimos que acceda a esta ruta (ej: /login, /register).
        console.log("GUARD público - No hay usuario. Permitiendo acceso a la ruta.");
        return true;
      }
    })
  );
};


