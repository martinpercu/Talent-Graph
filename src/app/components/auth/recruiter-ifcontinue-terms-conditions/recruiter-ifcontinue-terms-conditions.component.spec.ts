import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruiterIfcontinueTermsConditionsComponent } from './recruiter-ifcontinue-terms-conditions.component';

describe('RecruiterIfcontinueTermsConditionsComponent', () => {
  let component: RecruiterIfcontinueTermsConditionsComponent;
  let fixture: ComponentFixture<RecruiterIfcontinueTermsConditionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterIfcontinueTermsConditionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecruiterIfcontinueTermsConditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
