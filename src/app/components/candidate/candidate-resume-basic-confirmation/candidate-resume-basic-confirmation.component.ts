import { Component, Input, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MatIconModule } from '@angular/material/icon';


import {
  // FormControl,
  Validators,
  FormGroup,
  ReactiveFormsModule,
  FormBuilder,
  // FormArray, // <-- Importa FormArray
} from '@angular/forms';
import { CandidateService } from '@services/candidate.service';
import { ResumeService } from '@services/resume.service';
import { Candidate } from '@models/candidate';
import { Resume } from '@models/resume';
// import { Resume, Works, Education, Certification } from '@models/resume';

@Component({
  selector: 'app-candidate-resume-basic-confirmation',
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe, MatIconModule],
  templateUrl: './candidate-resume-basic-confirmation.component.html',
  styleUrl: './candidate-resume-basic-confirmation.component.css'
})
export class CandidateResumeBasicConfirmationComponent {
  @Input() jobId!: string;
  // private candidateAuthService = inject(CandidateAuthService);
  private candidateService = inject(CandidateService);
  private resumeService = inject(ResumeService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  // private translocoService = TranslocoService;

  form!: FormGroup;
  candidate!: Candidate;
  candidateId!: string;
  resume!: Resume;
  isLoading = false;

  // isInfoEditing: boolean = true

  // showBasicInfo: boolean = true;
  // showSummary: boolean = false;
  // showWorkExperience: boolean = false;
  // showEducation: boolean = false;
  // showCertification: boolean = false;

  // currentWorkIndex: number = 0;
  // currentCertIndex: number = 0;
  // currentEducationIndex: number = 0;

  constructor(private translocoService: TranslocoService) {
         // <--- Like this

    effect(() => {
      const candidateSigned = this.candidateService.candidateSig();
      console.log('effect:', candidateSigned);
      if (candidateSigned) {
        this.candidate = candidateSigned;
        console.log('estamos');
        if(this.candidate, this.jobId)
        this.getTheResume(this.candidate.candidateUID, this.jobId);
      }
    });
  }

  ngOnInit() {
    console.log('on init');
    console.log(this.jobId);
    console.log(this.candidate);
  }

  private loadResumeIfReady(): void {
    if (this.candidate && this.jobId && !this.isLoading) {
      this.isLoading = true;
      this.getTheResume(this.candidate.candidateUID, this.jobId);
    }
  }

  async getTheResume(candidateUID: string, jobID: string){
    const resume = await this.resumeService.getOneResume(candidateUID, jobID);
    this.isLoading = false;

    if(resume){
      this.resume = resume;
      this.buildForm();
    } else {
      this.buildEmptyForm();
    }
  }


  private buildForm() {
    this.form = this.formBuilder.group({
      name: [this.resume.name ?? null, [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      email: [this.resume.email ?? null, [Validators.required, Validators.email, Validators.maxLength(40)]],
      phone: [this.resume.phone ?? null, [Validators.required, Validators.minLength(7), Validators.maxLength(17), Validators.pattern(/^[0-9\s()+-]*$/)]],
      city: [this.resume.city ?? null, [Validators.required,  Validators.minLength(3), Validators.maxLength(40)]],
      zipcode: [this.resume.zipcode ?? null, [Validators.required,  Validators.minLength(4), Validators.maxLength(10)]],

      summary: [this.resume.summary ?? null, [Validators.minLength(7)]],

      // Creamos los FormArray para las listas
      // works: this.formBuilder.array(
      //   (this.resume.works || []).map(work => this.createWorkFormGroup(work))
      // ),
      // certifications: this.formBuilder.array(
      //   (this.resume.certifications || []).map(cert => this.createCertificationFormGroup(cert))
      // ),
      // education: this.formBuilder.array(
      //   (this.resume.education || []).map(edu => this.createEducationFormGroup(edu))
      // )
    });
  }


  get nameField() {
    return this.form.get('name')
  };
  get emailField() {
    return this.form.get('email')
  };
  get phoneField() {
    return this.form.get('phone')
  };
  get zipcodeField() {
    return this.form.get('zipcode')
  };
  get cityField() {
    return this.form.get('city')
  };


  // FIRST name
  get isnameFieldValid() {
    return this.nameField!.touched && this.nameField!.valid
  };
  get isnameFieldValidInvalid() {
    return this.nameField!.touched && this.nameField!.invalid
  };
  // EMAIL
  get isemailFieldValid() {
    return this.emailField!.touched && this.emailField!.valid
  };
  get isemailFieldInvalid() {
    return this.emailField!.touched && this.emailField!.invalid
  };
  // PHONE
  get isphoneFieldValid() {
    return this.phoneField!.touched && this.phoneField!.valid
  };
  get isphoneFieldInvalid() {
    return this.phoneField!.touched && this.phoneField!.invalid
  };
  // ZIPCODE
  get iszipcodeFieldValid() {
    return this.zipcodeField!.touched && this.zipcodeField!.valid
  };
  get iszipcodeFieldInvalid() {
    return this.zipcodeField!.touched && this.zipcodeField!.invalid
  };
  // CITY
  get iscityFieldValid() {
    return this.cityField!.touched && this.cityField!.valid
  };
  get iscityFieldInvalid() {
    return this.cityField!.touched && this.cityField!.invalid
  };




  // // Método para crear un FormGroup para un Work
  // private createWorkFormGroup(work: Works): FormGroup {
  //   return this.formBuilder.group({
  //     jobtitle: [work.jobtitle, Validators.required],
  //     company: [work.company, Validators.required],
  //     dates: [work.dates],
  //     description: [work.description],
  //   });
  // }

  // // Método para crear un FormGroup para una Certification
  // private createCertificationFormGroup(cert: Certification): FormGroup {
  //   return this.formBuilder.group({
  //     certificate: [cert.certificate, Validators.required],
  //     issuingOrganization: [cert.issuingOrganization],
  //     year: [cert.year],
  //   });
  // }

  // // Método para crear un FormGroup para una Education
  // private createEducationFormGroup(edu: Education): FormGroup {
  //   return this.formBuilder.group({
  //     degree: [edu.degree, Validators.required],
  //     institution: [edu.institution, Validators.required],
  //     graduationYear: [edu.graduationYear],
  //   });
  // }

  // // Obtenemos los FormArray para el template
  // get worksFormArray(): FormArray {
  //   return this.form.get('works') as FormArray;
  // }
  // get certificationsFormArray(): FormArray {
  //   return this.form.get('certifications') as FormArray;
  // }
  // get educationFormArray(): FormArray {
  //   return this.form.get('education') as FormArray;
  // }

  private buildEmptyForm(): void {
    this.form = this.formBuilder.group({
      name: [null, [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      email: [null, [Validators.required, Validators.email, Validators.maxLength(80)]],
      phone: [null, [Validators.required, Validators.minLength(7), Validators.maxLength(17), Validators.pattern(/^[0-9\s()+-]*$/)]],
      city: [null, [Validators.minLength(3), Validators.maxLength(38)]],
      zipcode: [null, [Validators.minLength(3), Validators.maxLength(10)]],
      summary: [null, [Validators.minLength(7)]],
      works: this.formBuilder.array([]),
      certifications: this.formBuilder.array([]),
      education: this.formBuilder.array([]),
    });
  }


  async saveResume(event: Event) {
    if (this.form.valid) {
      console.log('In Save Resume');
      console.log('Valores del formulario:', this.form.value);
      try {
        const updatedResume = await this.resumeService.updatedThisResume(this.form.value, this.resume.candidateUID, this.resume.jobRelated);
        console.log('Currículum actualizado correctamente.');
        if(updatedResume != null){
          this.resume = updatedResume;
          console.log(this.resume);
          // 👇 Aquí marcamos el formulario como "sin cambios"
          this.form.markAsPristine();
          const successMessage = this.translocoService.translate('candidate_resume.resume_sent_success');
          alert(successMessage);

          this.router.navigateByUrl(`/candidate`);
        }
      } catch (error) {
        console.error('No se pudo actualizar el currículum:', error);
      }
    } else {
      this.form.markAllAsTouched();
      console.log('Formulario inválido.');
    }
  }

  get hasChanges(): boolean {
    return this.form && this.form.dirty;
  }

//   switchBasicEditing() {
//     this.isInfoEditing = !this.isInfoEditing
//   }

//   forwardShow() {
//     if(this.showBasicInfo){
//       this.showBasicInfo = false;
//       this.showSummary = true;
//       return
//     }
//     if(this.showSummary){
//       this.showSummary = false;
//       this.showWorkExperience = true;
//       return
//     }
//     if(this.showWorkExperience){
//       this.showWorkExperience = false;
//       this.showCertification = true;
//       return
//     }
//     if(this.showCertification){
//       this.showCertification = false;
//       this.showEducation = true;
//       return
//     }
//     if(this.showEducation){
//       alert('final')
//       // this.showEducation = false;
//       // this.showCertification = true;
//       return
//     }
//   }

//   goBackShow() {
//     if(this.showSummary){
//       this.showSummary = false;
//       this.showBasicInfo = true;
//       return
//     }
//     if(this.showWorkExperience){
//       this.showWorkExperience = false;
//       this.showSummary = true;
//       return
//     }
//     if(this.showCertification){
//       this.showCertification = false;
//       this.showWorkExperience = true;
//       return
//     }
//     if(this.showEducation){
//       this.showEducation = false;
//       this.showCertification = true;
//       return
//     }
//   }


//   // Métodos de navegación para las Experiencia laborales
//   nextWork(): void {
//       if (this.currentWorkIndex < this.worksFormArray.length - 1) {
//         this.currentWorkIndex++;
//       }
//     }

//   previousWork(): void {
//     if (this.currentWorkIndex > 0) {
//       this.currentWorkIndex--;
//     }
//   }

//   // Métodos de navegación para las certificaciones
//   nextCert(): void {
//     if (this.currentCertIndex < this.certificationsFormArray.length - 1) {
//       this.currentCertIndex++;
//     }
//   }

//   previousCert(): void {
//     if (this.currentCertIndex > 0) {
//       this.currentCertIndex--;
//     }
//   }

//   // <-- NUEVOS MÉTODOS de navegación para la educación
//   nextEducation(): void {
//     if (this.currentEducationIndex < this.educationFormArray.length - 1) {
//       this.currentEducationIndex++;
//     }
//   }

//   previousEducation(): void {
//     if (this.currentEducationIndex > 0) {
//       this.currentEducationIndex--;
//     }
//   }


//   // Método para añadir una nueva experiencia laboral, que además la mostrará
//   addWork(): void {
//     this.worksFormArray.push(this.createWorkFormGroup({} as Works));
//     this.currentWorkIndex = this.worksFormArray.length - 1; // Muestra la nueva experiencia
//   }

//   // Método para eliminar la experiencia actual
//   removeWork(index: number): void {
//     this.worksFormArray.removeAt(index);
//     if (this.currentWorkIndex >= this.worksFormArray.length) {
//         this.currentWorkIndex = Math.max(0, this.worksFormArray.length - 1);
//     }
//   }


//   // Sobreescribimos el método para añadir una nueva certificación, que la mostrará automáticamente
//   addCertification(): void {
//     this.certificationsFormArray.push(this.createCertificationFormGroup({} as Certification));
//     this.currentCertIndex = this.certificationsFormArray.length - 1; // Muestra la nueva certificación
//   }

//   // Sobreescribimos el método para eliminar la certificación actual
//   removeCertification(index: number): void {
//     this.certificationsFormArray.removeAt(index);
//     if (this.currentCertIndex >= this.certificationsFormArray.length) {
//         this.currentCertIndex = Math.max(0, this.certificationsFormArray.length - 1);
//     }
//   }

//   // <-- MÉTODOS DE AÑADIR Y ELIMINAR PARA EDUCATION (MODIFICADOS)
//   addEducation(): void {
//     this.educationFormArray.push(this.createEducationFormGroup({} as Education));
//     this.currentEducationIndex = this.educationFormArray.length - 1;
//   }

//   async removeEducation(index: number): Promise<void> {
//   // 1. Pedir confirmación al usuario
//   const confirmation = confirm('¿Estás seguro de que quieres eliminar esta entrada de educación?');
//   // 2. Si el usuario confirma...
//   if (confirmation) {
//     // 3. Eliminar el elemento del FormArray localmente
//     this.educationFormArray.removeAt(index);
//     // 4. Asegurarse de que el índice actual no sea mayor que el nuevo tamaño del array
//     if (this.currentEducationIndex >= this.educationFormArray.length) {
//       this.currentEducationIndex = Math.max(0, this.educationFormArray.length - 1);
//     }
//     // 5. Llamar al método para guardar el currículum actualizado
//     // La eliminación ya modificó el formulario, por lo que el formulario reflejará el cambio
//     // Usamos 'as any' para evitar un error de tipo si el evento no es necesario en saveResume
//     await this.saveResume({} as any);
//   }
// }



  // // Obtenemos el FormGroup actual para la experiencia laboral
  // get currentWorkFormGroup(): FormGroup {
  //   return this.worksFormArray.at(this.currentWorkIndex) as FormGroup;
  // }

  // // Obtenemos el FormGroup actual para la certificación
  // get currentCertFormGroup(): FormGroup {
  //   return this.certificationsFormArray.at(this.currentCertIndex) as FormGroup;
  // }

  // // <-- NUEVO GETTER para Education
  // get currentEducationFormGroup(): FormGroup {
  //   return this.educationFormArray.at(this.currentEducationIndex) as FormGroup;
  // }


// async saveAndGoBack() {
//   await this.saveResume(new Event('submit'));
//   this.goBackShow();
// }

// async saveAndForward() {
//   await this.saveResume(new Event('submit'));
//   this.forwardShow();
// }

// this.form.markAsPristine();



}
