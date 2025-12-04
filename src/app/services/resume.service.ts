import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  collectionData,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  orderBy,
  query,
  where,
  CollectionReference,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '@env/environment';
import { Resume } from '@models/resume'
import { Ownresume } from '@models/ownResume';

@Injectable({
  providedIn: 'root'
})

export class ResumeService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private resumesCollection = collection(this.firestore, 'resumes');
  private ownResumesCollection = collection(this.firestore, 'ownresumes');

  private apiUrl = environment.BACK_CHAT_URL; // Define esto en tu environment.ts

  async processResumeWithPython(resumeUrl: string, userId: string, fileType: string): Promise<any> {
    const body = { resume_url: resumeUrl, user_id: userId, file_type: fileType };
    return firstValueFrom(this.http.post(`${this.apiUrl}/process_resume_content`, body));
  }

  async processResumeWithPythonTest(resumeUrl: string, userId: string, fileType: string): Promise<any> {
    const body = { resume_url: resumeUrl, user_id: userId, file_type: fileType };
    const timeoutDuration = 30000;
    console.log(body);

    return firstValueFrom(
      this.http.post(`${this.apiUrl}/process_resume_content`, body).pipe(
        timeout(timeoutDuration)
      )
    );
  }

  /**
   * Saves the structured resume data to Firestore.
   * @param resumeData The structured JSON object from the Python backend.
   * @param candidateUID The UID of the candidate.
   * @returns A Promise that resolves when the data is saved.
   */
  async saveResumeDataToFirestore(resumeData: any, candidateUID: string, jobId: string, recruiterId: string): Promise<string> {
    console.log(`Saving resume data for user: ${candidateUID}`);
    // 1. Crear una referencia al nuevo documento **antes** de guardarlo
    // Esto genera un ID único automáticamente.
    const resumesRef = collection(this.firestore, 'resumes') as CollectionReference<Resume>; // Asegúrate de que resumesRef apunte a tu colección
    const docRef = doc(resumesRef); // Referencia con el ID generado

    // // **OBTENEMOS EL ID DEL DOCUMENTO GENERADO**
    const documentId = docRef.id;

    const newResume: Resume = {
      candidateUID: candidateUID,
      jobRelated: jobId,
      recruiterId: recruiterId,
      // *** AGREGAMOS EL ID DEL DOCUMENTO AQUÍ ***
      resumeId: documentId, // Agregamos el campo para guardar el ID dentro

      name: resumeData['Name'] || null,
      email: resumeData['Email'] || null,
      phone: resumeData['Phone Number'] || null,
      zipcode: resumeData['Postal Code'] || null,
      city: resumeData['City'] || null,

      summary: resumeData['Summary/Objective'] || null,
      skills: resumeData['Skills'] || null,
      languages: resumeData['Languages'] || null,

      // Validamos si 'Work Experience' existe antes de mapear
      works: (resumeData['Work Experience'] || []).map((work: any) => ({
        jobtitle: work['Job Title'] || null,
        company: work['Company'] || null,
        dates: work['Dates'] || null,
        description: work['Description'] || null,
      })),

      // <-- CORRECCIÓN AQUÍ: Validamos si 'Certification' existe antes de mapear
      certifications: (resumeData['Certification'] || []).map((cert: any) => ({
        certificate: cert['Certificate'] || null,
        issuingOrganization: cert['Issuing Organization'] || null,
        year: cert['Year'] || null,
      })),

      // <-- CORRECCIÓN AQUÍ: Validamos si 'Education' existe antes de mapear
      education: (resumeData['Education'] || []).map((edu: any) => ({
        degree: edu['Degree'] || null,
        institution: edu['Institution'] || null,
        graduationYear: edu['Graduation Year'] || null,
      })),
    };

    console.log(newResume);

    // 3. Usar setDoc para guardar el objeto en la referencia que creamos
    await setDoc(docRef, newResume);
    console.log(`Resume data saved successfully with document ID: ${documentId}`);

    // const docRef = await addDoc(this.resumesCollection, newResume);
    // console.log(`Resume data saved successfully with document ID: ${docRef.id}`);

    return documentId;
  };


  async saveResumeDataToFirestoreOld(resumeData: any, candidateUID: string, jobId: string, recruiterId: string): Promise<string> {
    console.log(`Saving resume data for user: ${candidateUID}`);

    const newResume: Resume = {
      candidateUID: candidateUID,
      jobRelated: jobId,
      recruiterId: recruiterId,

      name: resumeData['Name'] || null,
      email: resumeData['Email'] || null,
      phone: resumeData['Phone Number'] || null,
      zipcode: resumeData['Postal Code'] || null,
      city: resumeData['City'] || null,

      summary: resumeData['Summary/Objective'] || null,
      skills: resumeData['Skills'] || null,
      languages: resumeData['Languages'] || null,

      // Validamos si 'Work Experience' existe antes de mapear
      works: (resumeData['Work Experience'] || []).map((work: any) => ({
        jobtitle: work['Job Title'] || null,
        company: work['Company'] || null,
        dates: work['Dates'] || null,
        description: work['Description'] || null,
      })),

      // <-- CORRECCIÓN AQUÍ: Validamos si 'Certification' existe antes de mapear
      certifications: (resumeData['Certification'] || []).map((cert: any) => ({
        certificate: cert['Certificate'] || null,
        issuingOrganization: cert['Issuing Organization'] || null,
        year: cert['Year'] || null,
      })),

      // <-- CORRECCIÓN AQUÍ: Validamos si 'Education' existe antes de mapear
      education: (resumeData['Education'] || []).map((edu: any) => ({
        degree: edu['Degree'] || null,
        institution: edu['Institution'] || null,
        graduationYear: edu['Graduation Year'] || null,
      })),
    };

    console.log(newResume);

    const docRef = await addDoc(this.resumesCollection, newResume);
    console.log(`Resume data saved successfully with document ID: ${docRef.id}`);

    return docRef.id;
  };

  /**
   * Agrega el ID del documento ('resumeId') como un campo dentro de los documentos existentes.
   * ⚠️ ADVERTENCIA: Ejecuta esto una sola vez, en un entorno controlado.
   * @returns Una Promise que resuelve cuando la migración ha terminado.
   */
  async migrateResumesAddId(): Promise<void> {
    const resumesRef = collection(this.firestore, 'resumes');

    // 1. Obtiene todos los documentos
    const querySnapshot = await getDocs(resumesRef);

    // 2. Crea un lote de escritura (writeBatch) para eficiencia
    const batch = writeBatch(this.firestore);

    let updatedCount = 0;

    console.log(`Iniciando migración. Documentos encontrados: ${querySnapshot.size}`);

    // 3. Itera y prepara la actualización para cada documento
    querySnapshot.forEach((docSnapshot) => {
        // Obtenemos el ID del documento (la clave)
        const docId = docSnapshot.id;

        // Creamos una referencia para el update
        const docRef = doc(this.firestore, 'resumes', docId);

        // Añadimos la operación al lote: actualizar el campo resumeId con el ID del documento
        batch.update(docRef, {
            resumeId: docId
        });

        updatedCount++;
    });

    // 4. Ejecuta el lote de forma atómica
    if (updatedCount > 0) {
        console.log(`Ejecutando ${updatedCount} actualizaciones en lote...`);
        await batch.commit();
        console.log('✅ Migración de resumeId completada con éxito.');
    } else {
        console.log('No se encontraron documentos para actualizar.');
    }
  }


  async getScore(resumeData: any, description: string): Promise<any> {

    const experience = {
      works: (resumeData['Work Experience'] || []).map((work: any) => ({
        jobtitle: work['Job Title'] || null,
        company: work['Company'] || null,
        dates: work['Dates'] || null,
        description: work['Description'] || null,
      })),
    };

    // Convertir el array de experiencias a un único string
    const experienceString = experience.works
      .map((work: any) => {
        // Une los campos de cada trabajo en una frase
        const jobDetails = [work.jobtitle, work.company, work.dates, work.description]
          .filter(Boolean) // Filtra valores nulos o vacíos
          .join('. '); // Usa un punto para separar los detalles de cada trabajo

        return jobDetails;
      })
      .join(' | '); // Usa un separador distintivo para cada trabajo

    const summary = resumeData['Summary/Objective'] ?? ''; // This is to return something if Summary is NULL
    const skills = resumeData['Skills'] ?? ''; // This is to return something if Summary is NULL

    const body = {
      candidate_summary: summary,
      candidate_experience: experienceString,
      candidate_skills:skills,
      job_description: description
    };

    // return resumeData + description + experienceString + summary
    return firstValueFrom(this.http.post(`${this.apiUrl}/calculate_embedding_score`, body));
  }




  async getOneResume(candidateUID: string, jobRelated: string): Promise<Resume | null> {
    // Usa 'this.resumesCollection' directamente
    const q = query(
      this.resumesCollection,
      where('candidateUID', '==', candidateUID),
      where('jobRelated', '==', jobRelated)
    );

    try {
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No se encontró ningún currículum con esos datos.');
        return null;
      }

      const resumeDoc = querySnapshot.docs[0];
      const resumeData = resumeDoc.data();

      return resumeData as Resume;
    } catch (error) {
      console.error('Error al obtener el currículum:', error);
      return null;
    }

  }

//   async updatedThisResume(resume: Partial<Resume>, candidateUID: string, jobRelated: string): Promise<void> {
//   const q = query(
//     this.resumesCollection,
//     where('candidateUID', '==', candidateUID),
//     where('jobRelated', '==', jobRelated)
//   );

//   try {
//     const querySnapshot = await getDocs(q);

//     if (querySnapshot.empty) {
//       console.log('No se encontró ningún currículum con esos datos.');
//       throw new Error('Resume not found');
//     }

//     const resumeDocRef = querySnapshot.docs[0].ref;
//     await updateDoc(resumeDocRef, resume);
//     console.log('Resume updated');
//   } catch (error) {
//     console.error('Error updating resume:', error);
//     throw error;
//   }
// }

  async updatedThisResume(
    resume: Partial<Resume>,
    candidateUID: string,
    jobRelated: string
  ): Promise<Resume | null> {
    const q = query(
      this.resumesCollection,
      where('candidateUID', '==', candidateUID),
      where('jobRelated', '==', jobRelated)
    );

    try {
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No se encontró ningún currículum con esos datos.');
        throw new Error('Resume not found');
      }

      const resumeDocRef = querySnapshot.docs[0].ref;

      // Primero, actualizamos el documento en Firestore
      await updateDoc(resumeDocRef, resume);
      console.log('Resume updated');

      // Luego, obtenemos el documento actualizado para retornarlo
      const updatedDoc = await getDoc(resumeDocRef);

      if (updatedDoc.exists()) {
        // Obtenemos los datos del documento y se los asignamos a la interfaz Resume.
        // Firebase se encarga de que los datos coincidan.
        const updatedResume = updatedDoc.data() as Resume;

        return updatedResume;
      } else {
        console.log('Documento actualizado no encontrado.');
        return null;
      }
    } catch (error) {
      console.error('Error updating or retrieving resume:', error);
      throw error;
    }
  }

// async updateOneResume(resumeUpdate: Partial<Resume>, resumeId: string) {
//   const resumeDocRef = doc(this.resumesCollection, resumeId);
//   return updateDoc(resumeDocRef, resumeUpdate)
//     .then(() => {
//       console.log('Documento del candidato actualizado correctamente.');
//     })
//     .catch((error) => {
//       console.error('Error al actualizar el documento:', error);
//       throw error; // Propaga el error para manejarlo en la función que llama
//     });
// }
// async updateOneResume(resumeUpdate: Partial<Resume>, resumeId: string): Promise<void> {
//   const resumeDocRef = doc(this.resumesCollection, resumeId);

//   // Devuelve la promesa completa para que el código que llama pueda usarla
//   return updateDoc(resumeDocRef, resumeUpdate);
// }
  async updateOneResume(resumeUpdate: Partial<Resume>, resumeId: string): Promise<Resume | null> {
    const resumeDocRef = doc(this.resumesCollection, resumeId);
    try {
      await updateDoc(resumeDocRef, resumeUpdate);
      console.log('Documento del candidato actualizado correctamente.');

      const docSnap = await getDoc(resumeDocRef);

      if (docSnap.exists()) {
        // ✅ Solución: Realiza el cast a `unknown` primero
        // Esto le dice a TypeScript que confíe en la estructura de los datos que vienen de Firestore
        const updatedResume = { id: docSnap.id, ...(docSnap.data() as unknown as Resume) };
        return updatedResume;
      } else {
        console.warn('El documento no se encontró después de la actualización.');
        return null;
      }
    } catch (error) {
      console.error('Error al actualizar y leer el documento:', error);
      throw error;
    }
  }


  /**
   * Obtiene todos los resumes que corresponden a una lista de IDs de trabajos.
   *
   * @param jobIds Un array de strings con los IDs de los trabajos.
   * @returns Un Promise que resuelve con un array de objetos Resume.
   */
  async getResumesForJobs(jobIds: string[]): Promise<Resume[]> {
    console.log('IN GET RESU FOR JOS SERVICE');

    // Si la lista de jobIds está vacía, no hay nada que buscar.
    if (jobIds.length === 0) {
      return [];
    }
    // Usamos una consulta `where('jobRelated', 'in', jobIds)`
    // para buscar todos los documentos que tengan el campo `jobRelated`
    // en la lista de `jobIds` que proporcionamos.
    // Nota: Firestore limita la cláusula 'in' a un máximo de 10 elementos.
    // Si tu lista de trabajos puede ser más larga, necesitarías hacer
    // múltiples consultas. Por ahora, asumimos que es 10 o menos.
    const resumesQuery = query(
      this.resumesCollection,
      where('jobRelated', 'in', jobIds)
    );

    // `getDocs` devuelve una instantánea de la consulta.
    const snapshot = await getDocs(resumesQuery);

    // Mapeamos los documentos de la instantánea a nuestro modelo `Resume`.
    const resumes: Resume[] = snapshot.docs.map((doc) => {
      // Usamos `doc.data()` para obtener los datos del documento
      // y `doc.id` para obtener el ID del documento.
      return { resumeId: doc.id, ...doc.data() } as Resume;
    });

    return resumes;
  }


  async getResumesForJob(jobId: string): Promise<Resume[]> {
    // Si el jobId no es válido, no hay nada que buscar.
    if (!jobId) {
      return [];
    }

    // Consulta que busca documentos donde `jobRelated` es IGUAL al jobId proporcionado.
    const resumesQuery = query(
      this.resumesCollection,
      where('jobRelated', '==', jobId)
    );

    // Ejecuta la consulta.
    const snapshot = await getDocs(resumesQuery);

    // Mapea los resultados al modelo Resume, incluyendo el ID del documento.
    const resumes: Resume[] = snapshot.docs.map((doc) => {
      return { resumeId: doc.id, ...doc.data() } as Resume;
    });

    return resumes;
  }


  // async getResumesForRecruiter(recruiterId: string): Promise<Resume[]> {
  //   // Si el jobId no es válido, no hay nada que buscar.
  //   if (!recruiterId) {
  //     return [];
  //   }

  //   // Consulta que busca documentos donde `jobRelated` es IGUAL al jobId proporcionado.
  //   const resumesQuery = query(
  //     this.resumesCollection,
  //     where('recruiterId', '==', recruiterId)
  //   );

  //   // Ejecuta la consulta.
  //   const snapshot = await getDocs(resumesQuery);

  //   // Mapea los resultados al modelo Resume, incluyendo el ID del documento.
  //   const resumes: Resume[] = snapshot.docs.map((doc) => {
  //     return { id: doc.id, ...doc.data() } as Resume;
  //   });

  //   return resumes;
  // }


  /**
   * Obtiene todos los trabajos.
   * @returns Un Observable de un array de Resumes.
   */
  getResumesForRecruiter(recruiterId: string): Observable<Resume[]> {
    const q = query(this.resumesCollection, where('recruiterId', '==', recruiterId));
    return collectionData(q, { idField: 'resumeId' }) as Observable<Resume[]>;
  }


  /**
   * Obtiene un trabajo por su ID.
   * @param resumeId El ID del trabajo.
   * @returns Una Promise con el Job o undefined si no se encuentra.
   */
  async getResumeByIdRaw(resumeId: string): Promise<Resume | undefined> {
    const jobDocRef = doc(this.firestore, `resumes/${resumeId}`);
    const jobSnapshot = await getDoc(jobDocRef);
    return jobSnapshot.exists()
      ? ({ resumeId, ...jobSnapshot.data() } as unknown as Resume) // <-- Añadir 'as unknown'
      : undefined;
  }
  // async getResumeByIdRaw(resumeId: string): Promise<Resume | undefined> {
  //   const jobDocRef = doc(this.firestore, `resumes/${resumeId}`);
  //   const jobSnapshot = await getDoc(jobDocRef);
  //   return jobSnapshot.exists()
  //     ? ({ resumeId, ...jobSnapshot.data() } as Resume)
  //     : undefined;
  // }



  // UNDER is OWN RESUMES
  // UNDER is OWN RESUMES
  // UNDER is OWN RESUMES



  async processOwnResumeWithPython(resumeUrl: string, recruiterId: string, fileType: string): Promise<any> {
    const body = { resume_url: resumeUrl, user_id: recruiterId, file_type: fileType };
    return firstValueFrom(this.http.post(`${this.apiUrl}/process_resume_content`, body));
  }

  async processOwnResumeWithPythonTest(resumeUrl: string, recruiterId: string, fileType: string): Promise<any> {
    const body = { resume_url: resumeUrl, user_id: recruiterId, file_type: fileType };
    const timeoutDuration = 30000;
    console.log(body);

    return firstValueFrom(
      this.http.post(`${this.apiUrl}/process_resume_content`, body).pipe(
        timeout(timeoutDuration)
      )
    );
  }

  /**
   * Saves the structured resume data to Firestore.
   * @param resumeData The structured JSON object from the Python backend.
   * @param candidateUID The UID of the candidate.
   * @returns A Promise that resolves when the data is saved.
   */

  async saveOwnResumeDataToFirestore(ownResumeData: any, recruiterId: string): Promise<string> {
    // 1. Crear una referencia al nuevo documento **antes** de guardarlo
    // Esto genera un ID único automáticamente.
    const ownResumesRef = collection(this.firestore, 'ownresumes') as CollectionReference<Ownresume>; // Asegúrate de que ownResumesRef apunte a tu colección
    const docRef = doc(ownResumesRef); // Referencia con el ID generado

    // **OBTENEMOS EL ID DEL DOCUMENTO GENERADO**
    const documentId = docRef.id;

    // 2. Construir el objeto Ownresume **usando el ID generado**
    const newOwnResume: Ownresume = {
        // ... (Tu mapeo de datos original) ...

        recruiterId: recruiterId,
        // *** AGREGAMOS EL ID DEL DOCUMENTO AQUÍ ***
        resumeId: documentId, // Agregamos el campo para guardar el ID dentro

        name: ownResumeData['Name'] || null,
        email: ownResumeData['Email'] || null,
        phone: ownResumeData['Phone Number'] || null,
        zipcode: ownResumeData['Postal Code'] || null,
        city: ownResumeData['City'] || null,
        // ... (El resto de tus campos mapeados) ...
        summary: ownResumeData['Summary/Objective'] || null,
        skills: ownResumeData['Skills'] || null,
        languages: ownResumeData['Languages'] || null,
        works: (ownResumeData['Work Experience'] || []).map((work: any) => ({
            jobtitle: work['Job Title'] || null,
            company: work['Company'] || null,
            dates: work['Dates'] || null,
            description: work['Description'] || null,
        })),
        certifications: (ownResumeData['Certification'] || []).map((cert: any) => ({
            certificate: cert['Certificate'] || null,
            issuingOrganization: cert['Issuing Organization'] || null,
            year: cert['Year'] || null,
        })),
        education: (ownResumeData['Education'] || []).map((edu: any) => ({
            degree: edu['Degree'] || null,
            institution: edu['Institution'] || null,
            graduationYear: edu['Graduation Year'] || null,
        })),
    };

    console.log(newOwnResume);

    // 3. Usar setDoc para guardar el objeto en la referencia que creamos
    await setDoc(docRef, newOwnResume);
    console.log(`Resume data saved successfully with document ID: ${documentId}`);

    return documentId;
  };


  /**
   * Obtiene todos los trabajos.
   * @returns Un Observable de un array de Ownresume.
   */
  getOwnResumesForRecruiter(recruiterId: string): Observable<Ownresume[]> {
    const q = query(this.ownResumesCollection, where('recruiterId', '==', recruiterId));
    return collectionData(q, { idField: 'resumeId' }) as Observable<Ownresume[]>;
  }


  // async updatedThisOwnResumeById(
  //     resume: Partial<Ownresume>,
  //     resumeId: string // Ahora recibimos el ID del documento
  // ): Promise<Ownresume | null> {

  //     // 1. Crear la referencia DIRECTA al documento
  //     // Debes obtener la referencia a la colección base si no la tienes como propiedad.
  //     // Usaremos 'ownResumes' como nombre de colección de ejemplo
  //     const ownResumesCollection = collection(this.firestore, 'ownResumes');

  //     // Creamos la referencia al documento específico usando el ID
  //     const resumeDocRef = doc(ownResumesCollection, resumeId);

  //     try {
  //         // 2. Actualizar el documento en Firestore
  //         await updateDoc(resumeDocRef, resume);
  //         console.log(`Resume with ID ${resumeId} updated successfully.`);

  //         // 3. Obtener el documento actualizado para retornarlo
  //         const updatedDoc = await getDoc(resumeDocRef);

  //         if (updatedDoc.exists()) {
  //             // Incluimos el ID del documento en los datos que retornamos
  //             const updatedResume = updatedDoc.data() as Ownresume;

  //             return updatedResume;
  //         } else {
  //             console.log('Documento actualizado no encontrado (debería existir).');
  //             return null;
  //         }
  //     } catch (error) {
  //         console.error(`Error updating resume with ID ${resumeId}:`, error);
  //         throw error;
  //     }
  // }

  async updatedThisOwnResumeById(
    resume: Partial<Ownresume>,
    documentId: string // Ahora recibimos el ID del documento
  ): Promise<Ownresume | null> {

    // 1. Crear la referencia DIRECTA al documento
    // Debes obtener la referencia a la colección base si no la tienes como propiedad.
    // Usaremos 'ownResumes' como nombre de colección de ejemplo
    const ownResumesCollection = collection(this.firestore, 'ownresumes');

    // Creamos la referencia al documento específico usando el ID
    const resumeDocRef = doc(ownResumesCollection, documentId);

    try {
        // 2. Actualizar el documento en Firestore
        await updateDoc(resumeDocRef, resume);
        console.log(`Resume with ID ${documentId} updated successfully.`);

        // 3. Obtener el documento actualizado para retornarlo
        const updatedDoc = await getDoc(resumeDocRef);

        if (updatedDoc.exists()) {
            // Incluimos el ID del documento en los datos que retornamos
            const updatedResume = updatedDoc.data() as Ownresume;

            return updatedResume;
        } else {
            console.log('Documento actualizado no encontrado (debería existir).');
            return null;
        }
    } catch (error) {
        console.error(`Error updating resume with ID ${documentId}:`, error);
        throw error;
    }
  }


}
