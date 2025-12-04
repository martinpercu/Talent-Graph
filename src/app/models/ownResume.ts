export interface Works {
  jobtitle?: string;
  company?: string;
  dates?: string;
  description?: string;
}

export interface Certification {
  certificate?: string;
  issuingOrganization?: string;
  year?: string;
}

export interface Education {
  degree?: string;
  institution?: string;
  graduationYear?: string;
}

export interface Ownresume {
  resumeId: string; // Is only to make work getResumesForJobsAndCandidates in resume.service
  candidateUID?: string;
  jobRelated?: string;
  recruiterId: string;
  scoreToPosition?: any;
  thumbUp?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  zipcode?: string;
  summary?: string;
  skills?: string[];
  languages?: string[];
  works?: Works[]; // Texto de la pregunta
  certifications?: Certification[]; // Texto de la pregunta
  education?: Education[]; // Texto de la pregunta
  useWithAgent?: boolean;
}
