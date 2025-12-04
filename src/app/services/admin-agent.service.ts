import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

interface MaintenanceRequest {
  recruiterId: string;
}

interface MaintenanceResponse {
  status: string;
  table?: string | string[];
  deleted?: number;
  details?: any;
  message: string;
  recruiter: string;
  results?: any[];
  errors?: any[];
  action?: string;
}

interface AuthorizationResponse {
  recruiterId: string;
  authorized: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAgentService {
  private http = inject(HttpClient);
  private apiUrl = environment.BACK_AGENT_BRIDGE;

  /**
   * Verifica si un recruiter está autorizado para operaciones de mantenimiento
   */
  async checkAuthorization(recruiterId: string): Promise<AuthorizationResponse> {
    const url = `${this.apiUrl}/maintenance/authorized-recruiters?recruiterId=${recruiterId}`;
    return firstValueFrom(this.http.get<AuthorizationResponse>(url));
  }

  /**
   * DESTRUCTIVO: Elimina TODOS los resumes de la base de datos
   */
  async truncateResumes(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/truncate/resumes`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina TODOS los jobs de la base de datos
   */
  async truncateJobs(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/truncate/jobs`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina TODOS los threads/conversaciones de la base de datos
   */
  async truncateThreads(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/truncate/threads`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina TODO (resumes, jobs, threads)
   */
  async truncateAll(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/truncate/all`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina y recrea la tabla de resumes con el schema correcto
   */
  async recreateResumes(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/recreate/resumes`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina y recrea la tabla de jobs con el schema correcto
   */
  async recreateJobs(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/recreate/jobs`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }

  /**
   * DESTRUCTIVO: Elimina y recrea TODAS las tablas (resumes + jobs)
   */
  async recreateAllTables(recruiterId: string): Promise<MaintenanceResponse> {
    const url = `${this.apiUrl}/maintenance/recreate/all-tables`;
    const body: MaintenanceRequest = { recruiterId };
    return firstValueFrom(this.http.post<MaintenanceResponse>(url, body));
  }
}
