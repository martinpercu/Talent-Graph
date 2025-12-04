export interface Job {
  jobId: string;
  magicId?: string;
  name: string;
  description: string;
  ownerId: string;
  active: boolean;
  examActive?: boolean;
  examId?: string;
  showSalary?: boolean;
  showRange?: boolean;
  minSalary?: string;
  maxSalary?: string;
  fixSalary?: string;
  salaryHour?: boolean;
  salaryWeek?: boolean;
  salaryMonth?: boolean;
  salaryYear?: boolean;
  hoursPerWeek?: string;
  currencySalary?: string;
  dateStart?: string;
}
