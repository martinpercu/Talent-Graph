import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, of, firstValueFrom } from 'rxjs';
import { startWith, switchMap, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '@env/environment';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  database: 'connected' | 'error';
  checkpointer: 'ok' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class BackendHealthService {
  private http = inject(HttpClient);

  // Signals para el estado de salud del backend
  healthStatus = signal<'ok' | 'degraded' | 'down'>('ok');
  healthDetails = signal<HealthResponse | null>(null);

  // Observable que hace polling cada 30s
  private healthCheck$ = interval(30000).pipe(
    startWith(0), // Ejecutar inmediatamente al iniciar
    switchMap(() =>
      this.http.get<HealthResponse>(`${environment.BACK_AGENT_BRIDGE}/health`).pipe(
        catchError((error) => {
          console.error('❌ Health check failed:', error);
          return of({
            status: 'down' as const,
            version: 'unknown',
            timestamp: new Date().toISOString(),
            database: 'error' as const,
            checkpointer: 'error' as const
          });
        })
      )
    ),
    tap(health => {
      const previousStatus = this.healthStatus();
      this.healthStatus.set(health.status);
      this.healthDetails.set(health);

      // Loggear cambios de estado con detalles
      if (previousStatus !== health.status) {
        if (health.status === 'down') {
          console.warn('🔴 Backend is DOWN');
        } else if (health.status === 'degraded') {
          console.warn(`🟡 Backend is DEGRADED - DB: ${health.database}, Checkpointer: ${health.checkpointer}`);
        } else {
          console.log(`🟢 Backend is OK - Version: ${health.version}, DB: ${health.database}`);
        }
      }
    }),
    shareReplay(1) // Compartir el último valor entre suscriptores
  );

  constructor() {
    // Iniciar polling automáticamente
    this.healthCheck$.subscribe();
    console.log('🏥 Backend health monitoring started (polling every 30s)');
  }

  /**
   * Obtiene el estado actual de salud del backend
   */
  getHealthStatus(): 'ok' | 'degraded' | 'down' {
    return this.healthStatus();
  }

  /**
   * Verifica si el backend está disponible para operaciones
   */
  isBackendAvailable(): boolean {
    return this.healthStatus() !== 'down';
  }

  /**
   * Verifica si el backend está completamente OK (no degradado)
   */
  isBackendHealthy(): boolean {
    return this.healthStatus() === 'ok';
  }

  /**
   * Fuerza una verificación inmediata del backend
   * (útil antes de operaciones críticas)
   */
  async checkNow(): Promise<boolean> {
    try {
      const health = await firstValueFrom(
        this.http.get<HealthResponse>(`${environment.BACK_AGENT_BRIDGE}/health`)
      );

      this.healthStatus.set(health.status);
      this.healthDetails.set(health);

      console.log(`🔍 Health check manual: ${health.status} (v${health.version})`);
      return health.status === 'ok';
    } catch (error) {
      console.error('❌ Immediate health check failed:', error);
      this.healthStatus.set('down');
      this.healthDetails.set(null);
      return false;
    }
  }

  /**
   * Obtiene los detalles completos del último health check
   */
  getHealthDetails(): HealthResponse | null {
    return this.healthDetails();
  }

  /**
   * Verifica si la base de datos está conectada
   */
  isDatabaseConnected(): boolean {
    const details = this.healthDetails();
    return details?.database === 'connected';
  }

  /**
   * Verifica si el checkpointer está funcionando
   */
  isCheckpointerWorking(): boolean {
    const details = this.healthDetails();
    return details?.checkpointer === 'ok';
  }
}
