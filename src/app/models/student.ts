import { Course } from './course';

export interface Student {
  id: string;
  name: string;
  email: string;
  enrolledCourses: Course[];
}
