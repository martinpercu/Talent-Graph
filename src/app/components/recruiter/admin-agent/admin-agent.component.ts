import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { AdminAgentService } from '@services/admin-agent.service';
import { RecruiterService } from '@services/recruiter.service';

import { SyncJobComponent } from '@recruiter/sync-job/sync-job.component';
import { SyncResumeComponent } from '@recruiter/sync-resume/sync-resume.component';

@Component({
  selector: 'app-admin-agent',
  imports: [CommonModule, MatIconModule, SyncJobComponent, SyncResumeComponent],
  templateUrl: './admin-agent.component.html'
})
export class AdminAgentComponent implements OnInit {
  adminAgentService = inject(AdminAgentService);
  recruiterService = inject(RecruiterService);

  isAuthorized = false;
  isCheckingAuth = true;

  async ngOnInit() {
    await this.checkAuthorization();
  }

  async checkAuthorization() {
    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) {
      console.error('❌ No recruiter UID found');
      this.isCheckingAuth = false;
      return;
    }

    try {
      const response = await this.adminAgentService.checkAuthorization(recruiter.recruiterUID);
      this.isAuthorized = response.authorized;

      if (this.isAuthorized) {
        console.log('✅ Recruiter authorized for maintenance operations:', recruiter.recruiterUID);
      } else {
        console.warn('⚠️  Recruiter NOT authorized for maintenance operations:', recruiter.recruiterUID);
      }
    } catch (error) {
      console.error('❌ Error checking authorization:', error);
      this.isAuthorized = false;
    } finally {
      this.isCheckingAuth = false;
    }
  }

  async handleTruncateResumes() {
    const confirmed = confirm(
      '⚠️  ADVERTENCIA: Esta acción eliminará TODOS los CVs de la base de datos.\n\n' +
      'Esta operación NO se puede deshacer.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!confirmed) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🗑️  Iniciando truncate de RESUMES...');
      const response = await this.adminAgentService.truncateResumes(recruiter.recruiterUID);
      console.log('✅ Resumes eliminados exitosamente:', response);
      alert(`✅ ${response.message}\nEliminados: ${response.deleted} CVs`);
    } catch (error: any) {
      console.error('❌ Error al truncar resumes:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleTruncateJobs() {
    const confirmed = confirm(
      '⚠️  ADVERTENCIA: Esta acción eliminará TODOS los Jobs de la base de datos.\n\n' +
      'Esta operación NO se puede deshacer.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!confirmed) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🗑️  Iniciando truncate de JOBS...');
      const response = await this.adminAgentService.truncateJobs(recruiter.recruiterUID);
      console.log('✅ Jobs eliminados exitosamente:', response);
      alert(`✅ ${response.message}\nEliminados: ${response.deleted} Jobs`);
    } catch (error: any) {
      console.error('❌ Error al truncar jobs:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleTruncateThreads() {
    const confirmed = confirm(
      '⚠️  ADVERTENCIA: Esta acción eliminará TODAS las conversaciones de la base de datos.\n\n' +
      'Esto incluye todos los threads, checkpoints, writes y blobs.\n' +
      'Esta operación NO se puede deshacer.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!confirmed) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🗑️  Iniciando truncate de THREADS...');
      const response = await this.adminAgentService.truncateThreads(recruiter.recruiterUID);
      console.log('✅ Threads eliminados exitosamente:', response);
      alert(`✅ ${response.message}\nEliminados: ${response.deleted} Threads`);
    } catch (error: any) {
      console.error('❌ Error al truncar threads:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleTruncateAll() {
    const firstConfirm = confirm(
      '🚨 PELIGRO: Esta acción eliminará TODO de la base de datos:\n' +
      '• Todos los CVs\n' +
      '• Todos los Jobs\n' +
      '• Todas las conversaciones\n\n' +
      'Esta operación NO se puede deshacer.\n\n' +
      '¿Estás ABSOLUTAMENTE seguro?'
    );

    if (!firstConfirm) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const secondConfirm = confirm(
      '🚨 ÚLTIMA ADVERTENCIA\n\n' +
      'Vas a eliminar TODA la base de datos del agente.\n' +
      'Esta es tu última oportunidad para cancelar.\n\n' +
      '¿Confirmas que deseas eliminar TODO?'
    );

    if (!secondConfirm) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🗑️  Iniciando TRUNCATE ALL...');
      const response = await this.adminAgentService.truncateAll(recruiter.recruiterUID);
      console.log('✅ Truncate ALL completado:', response);

      if (response.status === 'success') {
        alert(`✅ ${response.message}\n\nResultados:\n${JSON.stringify(response.results, null, 2)}`);
      } else {
        alert(`⚠️  ${response.message}\n\nResultados:\n${JSON.stringify(response.results, null, 2)}\n\nErrores:\n${JSON.stringify(response.errors, null, 2)}`);
      }
    } catch (error: any) {
      console.error('❌ Error al ejecutar truncate all:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleRecreateResumes() {
    const confirmed = confirm(
      '⚠️  ADVERTENCIA: Esta acción eliminará y recreará la tabla de RESUMES.\n\n' +
      'Útil cuando hay schema mismatch entre código y DB.\n' +
      'Esta operación eliminará TODOS los CVs existentes.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!confirmed) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🔄 Iniciando recreate de RESUMES table...');
      const response = await this.adminAgentService.recreateResumes(recruiter.recruiterUID);
      console.log('✅ Resumes table recreada exitosamente:', response);
      alert(`✅ ${response.message}\nTabla: ${response.table}\nAcción: ${response.action}`);
    } catch (error: any) {
      console.error('❌ Error al recrear resumes table:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleRecreateJobs() {
    const confirmed = confirm(
      '⚠️  ADVERTENCIA: Esta acción eliminará y recreará la tabla de JOBS.\n\n' +
      'Útil cuando hay schema mismatch entre código y DB.\n' +
      'Esta operación eliminará TODOS los Jobs existentes.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!confirmed) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🔄 Iniciando recreate de JOBS table...');
      const response = await this.adminAgentService.recreateJobs(recruiter.recruiterUID);
      console.log('✅ Jobs table recreada exitosamente:', response);
      alert(`✅ ${response.message}\nTabla: ${response.table}\nAcción: ${response.action}`);
    } catch (error: any) {
      console.error('❌ Error al recrear jobs table:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }

  async handleRecreateAllTables() {
    const firstConfirm = confirm(
      '🚨 ADVERTENCIA: Esta acción recreará TODAS las tablas (Resumes + Jobs).\n\n' +
      'Útil para resetear schema completo cuando hay mismatch con DB.\n' +
      'Esta operación eliminará TODOS los datos.\n\n' +
      '¿Estás seguro de que deseas continuar?'
    );

    if (!firstConfirm) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const secondConfirm = confirm(
      '🚨 ÚLTIMA CONFIRMACIÓN\n\n' +
      'Vas a recrear TODAS las tablas del agente (Resumes + Jobs).\n' +
      'Todos los datos se perderán.\n\n' +
      '¿Confirmas?'
    );

    if (!secondConfirm) {
      console.log('🚫 Operación cancelada por el usuario');
      return;
    }

    const recruiter = this.recruiterService.recruiterSig();
    if (!recruiter?.recruiterUID) return;

    try {
      console.log('🔄 Iniciando RECREATE ALL TABLES...');
      const response = await this.adminAgentService.recreateAllTables(recruiter.recruiterUID);
      console.log('✅ All tables recreadas exitosamente:', response);
      alert(`✅ ${response.message}\nTablas: ${JSON.stringify(response.table)}\nAcción: ${response.action}`);
    } catch (error: any) {
      console.error('❌ Error al recrear all tables:', error);
      alert(`❌ Error: ${error.error?.detail || error.message || 'Error desconocido'}`);
    }
  }
}
