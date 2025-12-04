import { Injectable } from '@angular/core';
import { Course } from '@models/course';

@Injectable({
  providedIn: 'root'
})
export class CourseService {

  private courses: Course[] = [
    {
      id: '1',
      title: 'Introducción a Angular',
      description: 'Aprende los fundamentos de Angular 19 para construir aplicaciones web modernas.',
      teacherId: 'kjshdfkjhsdf',
      difficulty: 5
    },
    {
      id: '2',
      title: 'Tailwind CSS Avanzado',
      description: 'Domina Tailwind CSS para crear interfaces responsivas y estilizadas.',
      teacherId: 'kjshdfkjhsdf',
      difficulty: 5
    },
    {
      id: '3',
      title: 'Gestión de Proyectos',
      description: 'Técnicas y herramientas para liderar proyectos tecnológicos con éxito.',
      teacherId: 'kjshdfkjhsdf',
      difficulty: 5
    }
  ];

  getCourses(): Course[] {
    return this.courses;
  }
}
