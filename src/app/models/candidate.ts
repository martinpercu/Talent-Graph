export interface Candidate {
  candidateUID: string;
  email: string,
  // firstname: string;
  username: string;
  displayname?: string;
  lastname?: string;
  recruiters?: string[];
  jobs?: string[];
  lastJobId?: string;
  resumePath?: string;
  resumeDocName?: string;
  resumeInDB?: boolean;
  phone?: string;
  birthdate?: string;
  optionalText?: string;
  byPhone?: boolean;
  byEmail?: boolean;
  agree?: boolean;
  subscription?: boolean;
  address?: string;
  addressExtra?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}
