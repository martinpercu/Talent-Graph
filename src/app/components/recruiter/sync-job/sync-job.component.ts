
import { Component, inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { JobCrudService } from '@services/job-crud.service';
import { AgentSyncService } from '@services/agent-sync.service';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sync-job',
  imports: [MatIconModule],
  templateUrl: './sync-job.component.html'
})
export class SyncJobComponent {
  authService = inject(AuthService);
  jobCrudService = inject(JobCrudService);
  agentSyncService = inject(AgentSyncService);

  userId = this.authService.getCurrentUserId();

  syncing = false;


  async syncAllJobsToAgent() {
    this.syncing = true;

    if(this.userId) {
      try {
        // Obtener jobs del owner actual
        const allJobs = await firstValueFrom(
          this.jobCrudService.getJobs(this.userId)
        );


        console.log('🔍 Jobs obtenidos de Firebase:', allJobs.length);
        console.log('📦 Datos completos:', allJobs);

        // ← AGREGAR ESTE CHECK
        if (allJobs.length === 0) {
          alert('⚠️ No hay jobs para sincronizar');
          this.syncing = false;
          return;
        }
        // console.log(`Sincronizando ${allJobs.length} jobs con el agente...`);
        // console.log(allJobs)

        const result = await this.agentSyncService.syncAllJobs(allJobs);
        console.log('✅ Resultado del servidor:', result);
        alert(`✅ ${allJobs.length} jobs sincronizados correctamente`);

      } catch (error) {
        console.error('Error sincronizando:', error);
        alert('❌ Error al sincronizar jobs');
      } finally {
        this.syncing = false;
      }
    }

  }

  async syncOneJobToAgent() {
    this.syncing = true;
    alert('a verga')

    const theJob = await this.jobCrudService.getJobByIdRaw("Ca5dUqEuky5dGqQmyJJr")
    console.log(theJob);

    const result = await this.agentSyncService.syncAllJobs([theJob]);
    console.log(result);

    this.syncing = false;
  }



  async syncDeleteOneJobToAgent() {

    // 2. LLAMADA A FASTAPI/AGENTE AI (DB Secundaria)
    try {
        // Usamos await porque deleteJobFromAgent devuelve una Promise (por .toPromise())
        await this.agentSyncService.deleteJobFromAgent("Ca5dUqEuky5dGqQmyJJr");
        console.log('✅ Job eliminado del Agente AI exitosamente.');
        // alert('✅ Job eliminado del Agente AI exitosamente.');

    } catch (error) {
        // Si el Agente AI no lo encuentra o falla por otra razón,
        // registramos el error pero no bloqueamos el flujo, pues ya se eliminó de la fuente principal.
        console.error('⚠️ Error al eliminar job en Agente AI:', error);
    }

  }
  // En tu componente .ts
  // Suponiendo que tienes inyectado el AgentSyncService
  // constructor(private agentSyncService: AgentSyncService) {}

  async handleAgentToggle(jobId: string, useWithAgent: boolean) {
    if (!useWithAgent) { // Si el usuario desmarca la opción
      try {
        console.log(`Intentando eliminar job ${jobId} del agente AI...`);

        // La llamada al servicio
        await this.agentSyncService.deleteJobFromAgent(jobId);

        console.log(`✅ Job ${jobId} eliminado correctamente del agente AI.`);
        // Opcional: mostrar una notificación al usuario

      } catch (error) {
        console.error(`❌ Error al eliminar job ${jobId} del agente AI:`, error);
        // Opcional: Manejar el error, como un 404 si ya no existía
      }
    }
  }

}
