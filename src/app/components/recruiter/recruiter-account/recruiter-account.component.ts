import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslocoPipe } from '@jsverse/transloco';
import { RecruiterAuthService } from '@services/recruiter-auth.service';

import { Recruiter } from '@models/recruiter';
import { RecruiterService } from '@services/recruiter.service';
import { VisualStatesService } from '@services/visual-states.service';

import {
  FormControl,
  Validators,
  FormGroup,
  ReactiveFormsModule,
  FormBuilder,
} from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recruiter-account',
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './recruiter-account.component.html',
  styleUrl: './recruiter-account.component.css'
})
export class RecruiterAccountComponent {
  private recruiterService = inject(RecruiterService);
  visualStatesService = inject(VisualStatesService);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  form!: FormGroup;

  editBasicInfo: boolean = true;
  editShipping: boolean = false;

  recruiterAuthService = inject(RecruiterAuthService);

  theRecuiterInForm!: Recruiter;

  recruiter!: Recruiter;


  constructor() {
    console.log(this.recruiterService.recruiterSig());
    effect(() => {
      // 3. Dentro de esta función, lee el valor de la señal
      const theRecruiterSigned = this.recruiterService.recruiterSig();
      console.log('El valor de la señal ha cambiado a:', theRecruiterSigned);
      if(theRecruiterSigned?.recruiterUID) {
        this.theRecuiterInForm = theRecruiterSigned
        this.getOneRecruiter(theRecruiterSigned?.recruiterUID);
      }

      // Aquí puedes ejecutar tu lógica que depende del valor de la señal
      // Por ejemplo, llamar a un servicio, actualizar el localStorage, etc.
    });
  }


  async getOneRecruiter(recruiterUID: string) {
    console.log('entromos get One Recruiter');
    const recruiterGetted = await this.recruiterService.getThisRecruiter(
      recruiterUID
    );
    this.recruiter = recruiterGetted;
    console.log(this.recruiter);
    this.buildForm();
  }


  private buildForm() {
    this.form = this.formBuilder.group({
      firstname: [this.recruiter.username, [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      lastname: [this.recruiter.lastname, [Validators.minLength(2), Validators.maxLength(40)]],
      email: [this.recruiter.email, [Validators.required, Validators.email, Validators.maxLength(80)]],
      cellphone: [this.recruiter.cellphone, [Validators.minLength(9), Validators.maxLength(15), Validators.pattern("^[0-9]*$")]],
      birthdate: [this.recruiter.whatsapp, [Validators.minLength(7)]],
      businessName: [this.recruiter.businessName, [Validators.minLength(2), Validators.maxLength(40)]],
      allowWhatsapp: [this.recruiter.allowWhatsapp],
      useExams: [this.recruiter.useExams],
      useManager: [this.recruiter.useManager],
      useAgentsAI: [this.recruiter.useAgentsAI],
      // state: [this.recruiter.state],
      // zipCode: [this.recruiter.zipCode, [Validators.minLength(5), Validators.maxLength(8)]],
      // // country: [this.candidate.country],
      // optionalText: [this.candidate.optionalText, Validators.maxLength(80)],
    });
  };


  async saveUser(event: Event) {
    if (this.form.valid) {
    console.log(this.form.value);
    console.log(this.recruiter.recruiterUID);
    console.log(this.recruiterService.recruiterSig());
    // recruiterSig

    const updatedRecruiter = await this.recruiterService.updateOneRecruiter(this.form.value, this.recruiter.recruiterUID);
    console.log(updatedRecruiter);
    this.recruiterService.updateRecruiterSig(this.form.value)
    this.visualStatesService.handleRecruiterAccountShow()
    } else {
      this.form.markAllAsTouched();
    };
  };


  get firstnameField() {
    return this.form.get('firstname')
  };
  get lastnameField() {
    return this.form.get('lastname')
  };
  get emailField() {
    return this.form.get('email')
  };
  get phoneField() {
    return this.form.get('cellphone')
  };
  get birthdateField() {
    return this.form.get('birthdate')
  };
  get addressField() {
    return this.form.get('address')
  };
  get businessNameField() {
    return this.form.get('businessName')
  };
  // get cityField() {
  //   return this.form.get('city')
  // };
  // get stateField() {
  //   return this.form.get('state')
  // };
  // get zipCodeField() {
  //   return this.form.get('zipCode')
  // };



  // FIRST name
  get isfirstnameFieldValid() {
    return this.firstnameField!.touched && this.firstnameField!.valid
  };
  get isfirstnameFieldInvalid() {
    return this.firstnameField!.touched && this.firstnameField!.invalid
  };
  // LAST name
  get islastnameFieldValid() {
    return this.lastnameField!.touched && this.lastnameField!.valid
  };
  get islastnameFieldInvalid() {
    return this.lastnameField!.touched && this.lastnameField!.invalid
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
  // BIRTHDATE
  get isbirthdateFieldValid() {
    return this.birthdateField!.touched && this.birthdateField!.valid
  };
  get isbirthdateFieldInvalid() {
    return this.birthdateField!.touched && this.birthdateField!.invalid
  };

  // ADDRESS
  get isaddressFieldValid() {
    return this.addressField!.touched && this.addressField!.valid
  };
  get isaddressFieldInvalid() {
    return this.addressField!.touched && this.addressField!.invalid
  };

  // BUSINESS NAME
  get isbusinessNameFieldValid() {
    return this.businessNameField!.touched && this.businessNameField!.valid
  };
  get isbusinessNameFieldInvalid() {
    return this.businessNameField!.touched && this.businessNameField!.invalid
  };

  // // CITY
  // get iscityFieldValid() {
  //   return this.cityField!.touched && this.cityField!.valid
  // };
  // get iscityFieldInvalid() {
  //   return this.cityField!.touched && this.cityField!.invalid
  // };
  // // STATE
  // get isstateFieldValid() {
  //   return this.stateField!.touched && this.stateField!.valid
  // };
  // get isstateFieldInvalid() {
  //   return this.stateField!.touched && this.stateField!.invalid
  // };
  // // ZIP CODE
  // get iszipCodeFieldValid() {
  //   return this.zipCodeField!.touched && this.zipCodeField!.valid
  // };
  // get iszipCodeFieldInvalid() {
  //   return this.zipCodeField!.touched && this.zipCodeField!.invalid
  // };


  changeEditPersonalInfo() {
    this.editBasicInfo = !this.editBasicInfo;
    this.editShipping = false;
    // this.editBilling = false;
    console.log(this.editBasicInfo);
  };

  changeEditShipping() {
    this.editShipping = !this.editShipping;
    this.editBasicInfo = false;
    // this.editBilling = false;
    console.log(this.editShipping);
  };

  changeEditBilling() {
    // this.editBilling = !this.editBilling;
    this.editShipping = false;
    this.editBasicInfo = false;
  };



}
