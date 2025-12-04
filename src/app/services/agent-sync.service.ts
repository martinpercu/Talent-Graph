import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';


@Injectable({
  providedIn: 'root'
})
export class AgentSyncService {
  private apiUrl = environment.BACK_AGENT_BRIDGE; // 'http://localhost:8000'

  constructor(private http: HttpClient) {}

  syncAllJobs(jobs: any[]) {
    return this.http.post(`${this.apiUrl}/jobs/sync`, {
      jobs: jobs.map(j => ({
        jobId: j.jobId,
        ownerId: j.ownerId,
        name: j.name,
        description: j.description,
        showSalary: j.showSalary || false,
        showRange: j.showRange || false,
        minSalary: j.minSalary ? String(j.minSalary) : null,  // ← Convertir a string
        maxSalary: j.maxSalary ? String(j.maxSalary) : null,  // ← Convertir a string
        fixSalary: j.fixSalary ? String(j.fixSalary) : null,  // ← Convertir a string
        salaryHour: j.salaryHour || false,
        salaryWeek: j.salaryWeek || false,
        salaryMonth: j.salaryMonth || false,
        salaryYear: j.salaryYear || false,
        hoursPerWeek: j.hoursPerWeek ? String(j.hoursPerWeek) : null, // ← Convertir a string
        currencySalary: j.currencySalary
      }))
    }).toPromise();
  }

  /**
   * Elimina un job específico de la DB del Agente AI.
   * @param jobId El ID del job a eliminar.
   * @returns Una Promise que se resuelve al finalizar la eliminación.
   */
  deleteJobFromAgent(jobId: string): Promise<any> {
    // 1. Construir la URL: ${this.apiUrl}/jobs/{job_id}
    const url = `${this.apiUrl}/jobs/${jobId}`;

    // 2. Usar HttpClient.delete() para hacer la petición DELETE
    //    y convertir el Observable resultante a Promise.
    return this.http.delete(url).toPromise();
  }


// ===== RESUMES RESUMES RESUMES =====

  syncResumes(resumes: any[]) {
    return this.http.post(`${this.apiUrl}/resumes/sync`, {
      resumes: resumes.map(r => ({
        resumeId: r.resumeId,
        candidateUID: r.candidateUID,
        recruiterId: r.recruiterId,
        jobRelated: r.jobRelated,
        scoreToPosition: this.convertToPercentage(r.scoreToPosition),  // ← Convertir a porcentaje redondeado
        thumbUp: r.thumbUp,
        name: r.name,
        email: r.email,
        phone: r.phone,
        city: r.city,
        zipcode: r.zipcode,
        summary: r.summary,

        // ← Convertir skills: de string a array
        skills: this.parseToArray(r.skills),

        // ← Convertir languages: de string a array
        languages: this.parseToArray(r.languages),

        works: r.works || [],

        // ← Convertir certifications.year: de number a string
        certifications: (r.certifications || []).map((c: any) => ({
          certificate: c.certificate,
          issuingOrganization: c.issuingOrganization,
          year: c.year ? String(c.year) : null
        })),

        // ← Convertir education.graduationYear: de number a string
        education: (r.education || []).map((e: any) => ({
          degree: e.degree,
          institution: e.institution,
          graduationYear: e.graduationYear ? String(e.graduationYear) : null
        }))
      }))
    }).toPromise();
  }

  // Función helper para parsear strings a arrays
  private parseToArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Separar por comas y limpiar espacios
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    return [];
  }

  // Función helper para convertir score a porcentaje redondeado
  private convertToPercentage(score: any): string | null {
    if (!score) return null;
    const numScore = Number(score);
    if (isNaN(numScore)) return null;
    const percentage = Math.round(numScore / 10);
    return `${percentage}%`;
  }

  deleteResumeFromAgent(resumeId: string) {
    return this.http.delete(`${this.apiUrl}/resumes/${resumeId}`).toPromise();
  }



}
