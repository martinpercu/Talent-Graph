import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PagesService } from '@services/pages.service';
import { TeacherCrudService } from '@services/teacher-crud.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Teacher } from '@models/teacher';
import { Section } from '@models/section';

@Component({
  selector: 'app-teachers-crud',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './teachers-crud.component.html'
})

export class TeachersCRUDComponent implements OnInit {
  teachers$!: Observable<Teacher[]>;
  newTeacher: Partial<Teacher> = {
    name: '',
    defaultTitle: '',
    doc_path: ''
  };
  sections: Section[] = [
    { name: 'Section 0', subtext: 'Introducción', pages: '0' }
  ];
  errorMessage: string = '';
  editingTeacherId: string | null = null;
  selectedTeacherId: string = '';

  constructor(
    private teacherCrudService: TeacherCrudService,
    private pagesService: PagesService
  ) {}

  ngOnInit() {
    this.teachers$ = this.teacherCrudService.getTeachers();
    this.pagesService.initialize();
  }

  loadTeacher(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const teacherId = selectElement.value;
    this.selectedTeacherId = teacherId;

    if (teacherId) {
      this.pagesService.setConfiguration(teacherId).then(() => {
        this.teacherCrudService.getTeacherById(teacherId).subscribe({
          next: (teacher) => {
            if (teacher) {
              this.newTeacher = {
                name: teacher.name,
                defaultTitle: teacher.defaultTitle,
                doc_path: teacher.doc_path
              };

              this.sections = [];
              const sectionKeys = Object.keys(teacher.pageMap).sort((a, b) => {
                const aNum = a.match(/Section (\d+)/)?.[1] || a;
                const bNum = b.match(/Section (\d+)/)?.[1] || b;
                return aNum < bNum ? -1 : 1;
              });

              this.sections = sectionKeys
                .filter(key => teacher.pageMap[key] && teacher.indexSubtext[key] !== undefined)
                .map(key => ({
                  name: key,
                  subtext: teacher.indexSubtext[key] || '',
                  pages: teacher.pageMap[key].join(',')
                }));

              if (this.sections.length === 0) {
                this.errorMessage = 'No se encontraron secciones válidas para este teacher';
                this.sections = [{ name: 'Section 0', subtext: 'Introducción', pages: '0' }];
              } else {
                this.errorMessage = '';
              }

              this.editingTeacherId = teacherId;
              console.log('Secciones cargadas:', this.sections);
            } else {
              this.errorMessage = 'Teacher no encontrado';
              this.resetForm();
            }
          },
          error: (error) => {
            console.error('Error al cargar el teacher:', error);
            this.errorMessage = 'Error al cargar el teacher';
            this.resetForm();
          }
        });
      }).catch(error => {
        console.error('Error al configurar PagesService:', error);
        this.errorMessage = 'Error al configurar el teacher';
        this.resetForm();
      });
    } else {
      this.resetForm();
    }
  }

  saveTeacher() {
    if (!this.newTeacher.name?.trim() || !this.newTeacher.defaultTitle?.trim() || !this.newTeacher.doc_path?.trim()) {
      this.errorMessage = 'Todos los campos son requeridos';
      return;
    }

    if (this.editingTeacherId) {
      this.teacherCrudService.updateTeacher(this.editingTeacherId, this.newTeacher, this.sections).subscribe({
        next: (success) => {
          if (success) {
            console.log(`Teacher ${this.editingTeacherId} actualizado exitosamente`);
            this.resetForm();
          } else {
            this.errorMessage = 'Error al actualizar el teacher o nombre duplicado';
          }
        },
        error: (error) => {
          console.error('Error al actualizar el teacher:', error);
          this.errorMessage = 'Error al actualizar el teacher';
        }
      });
    } else {
      this.teacherCrudService.createTeacher(this.newTeacher, this.sections).subscribe({
        next: (id) => {
          if (id) {
            console.log(`Teacher creado con ID: ${id}`);
            this.resetForm();
          } else {
            this.errorMessage = 'Error al crear el teacher o nombre duplicado';
          }
        },
        error: (error) => {
          console.error('Error al crear el teacher:', error);
          this.errorMessage = 'Error al crear el teacher';
        }
      });
    }
  }

  deleteTeacher() {
    if (this.editingTeacherId) {
      const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar este teacher?');
      if (confirmDelete) {
        this.teacherCrudService.deleteTeacher(this.editingTeacherId).subscribe({
          next: (success) => {
            if (success) {
              console.log(`Teacher ${this.editingTeacherId} eliminado exitosamente`);
              this.resetForm();
            } else {
              this.errorMessage = 'Error al eliminar el teacher';
            }
          },
          error: (error) => {
            console.error('Error al eliminar el teacher:', error);
            this.errorMessage = 'Error al eliminar el teacher';
          }
        });
      }
    }
  }

  resetForm() {
    this.newTeacher = {
      name: '',
      defaultTitle: '',
      doc_path: ''
    };
    this.sections = [{ name: 'Section 0', subtext: 'Introducción', pages: '0' }];
    this.editingTeacherId = null;
    this.selectedTeacherId = '';
    this.errorMessage = '';
  }

  addSection() {
    this.sections.push({
      name: `Section ${this.sections.length}`,
      subtext: '',
      pages: ''
    });
  }

  removeSection(index: number) {
    if (this.sections.length > 1) {
      this.sections.splice(index, 1);
    } else {
      this.errorMessage = 'Debe haber al menos una sección';
    }
  }
}

// export class TeachersCRUDComponent implements OnInit {
//   teachers$!: Observable<Teacher[]>;
//   newTeacher: Partial<Teacher> = {
//     name: '',
//     defaultTitle: '',
//     doc_path: ''
//   };
//   sections: Section[] = [
//     { name: 'Section 0', subtext: 'Introducción', pages: '0' }
//   ];
//   errorMessage: string = '';
//   editingTeacherId: string | null = null;
//   selectedTeacherId: string = ''; // Para sincronizar el dropdown

//   constructor(
//     private firestore: Firestore,
//     private pagesService: PagesService
//   ) {}

//   ngOnInit() {
//     const teachersCollection = collection(this.firestore, 'teachers');
//     this.teachers$ = collectionData(teachersCollection, { idField: 'id' }) as Observable<Teacher[]>;
//     this.pagesService.initialize();
//   }

//   async loadTeacher(event: Event) {
//     const selectElement = event.target as HTMLSelectElement;
//     const teacherId = selectElement.value;
//     this.selectedTeacherId = teacherId; // Sincronizar dropdown

//     if (teacherId) {
//       try {
//         // Cargar el teacher en el servicio
//         await this.pagesService.setConfiguration(teacherId);

//         // Obtener los datos del teacher
//         const teacherDoc = doc(this.firestore, `teachers/${teacherId}`);
//         const docSnap = await getDoc(teacherDoc);
//         if (docSnap.exists()) {
//           const teacherData = docSnap.data() as Teacher;
//           this.newTeacher = {
//             name: teacherData.name,
//             defaultTitle: teacherData.defaultTitle,
//             doc_path: teacherData.doc_path
//           };

//           // Reiniciar secciones para evitar datos residuales
//           this.sections = [];

//           // Cargar secciones en orden predecible
//           const sectionKeys = Object.keys(teacherData.pageMap).sort((a, b) => {
//             const aNum = a.match(/Section (\d+)/)?.[1] || a;
//             const bNum = b.match(/Section (\d+)/)?.[1] || b;
//             return aNum < bNum ? -1 : 1;
//           });

//           this.sections = sectionKeys
//             .filter(key => teacherData.pageMap[key] && teacherData.indexSubtext[key] !== undefined)
//             .map(key => ({
//               name: key,
//               subtext: teacherData.indexSubtext[key] || '',
//               pages: teacherData.pageMap[key].join(',')
//             }));

//           // Verificar si se cargaron secciones
//           if (this.sections.length === 0) {
//             this.errorMessage = 'No se encontraron secciones válidas para este teacher';
//             this.sections = [{ name: 'Section 0', subtext: 'Introducción', pages: '0' }];
//           } else {
//             this.errorMessage = '';
//           }

//           this.editingTeacherId = teacherId;
//           console.log('Secciones cargadas:', this.sections); // Para depuración
//         } else {
//           this.errorMessage = 'Teacher no encontrado';
//           this.resetForm();
//         }
//       } catch (error) {
//         console.error('Error al cargar el teacher:', error);
//         this.errorMessage = 'Error al cargar el teacher';
//         this.resetForm();
//       }
//     } else {
//       this.resetForm();
//     }
//   }

//   async saveTeacher() {
//     if (!this.newTeacher.name?.trim() || !this.newTeacher.defaultTitle?.trim() || !this.newTeacher.doc_path?.trim()) {
//       this.errorMessage = 'Todos los campos son requeridos';
//       return;
//     }

//     // Validar que el nombre del teacher no esté duplicado
//     const teachersCollection = collection(this.firestore, 'teachers');
//     const q = query(teachersCollection, where('name', '==', this.newTeacher.name.trim()));
//     const querySnapshot = await getDocs(q);
//     if (!querySnapshot.empty && !querySnapshot.docs.some(doc => doc.id === this.editingTeacherId)) {
//       this.errorMessage = 'Ya existe un teacher con este nombre';
//       return;
//     }

//     // Convertir y validar secciones
//     const pageMap: { [key: string]: number[] } = {};
//     const indexSubtext: { [key: string]: string } = {};
//     for (const section of this.sections) {
//       if (!section.name?.trim() || !section.subtext?.trim() || !section.pages?.trim()) {
//         this.errorMessage = 'Todas las secciones deben tener nombre, subtítulo y páginas';
//         return;
//       }
//       const pages = section.pages
//         .split(',')
//         .map(page => parseInt(page.trim()))
//         .filter(page => !isNaN(page));
//       if (pages.length === 0) {
//         this.errorMessage = `Páginas inválidas en la sección ${section.name}`;
//         return;
//       }
//       pageMap[section.name.trim()] = pages;
//       indexSubtext[section.name.trim()] = section.subtext.trim();
//     }

//     try {
//       const teacherData: Partial<Teacher> = {
//         name: this.newTeacher.name!.trim(),
//         defaultTitle: this.newTeacher.defaultTitle!.trim(),
//         doc_path: this.newTeacher.doc_path!.trim(),
//         pageMap,
//         indexSubtext
//       };

//       if (this.editingTeacherId) {
//         const teacherDoc = doc(this.firestore, `teachers/${this.editingTeacherId}`);
//         await updateDoc(teacherDoc, teacherData);
//         console.log(`Teacher ${this.editingTeacherId} actualizado exitosamente`);
//       } else {
//         const newDocRef = await addDoc(teachersCollection, teacherData);
//         await updateDoc(doc(this.firestore, `teachers/${newDocRef.id}`), { id: newDocRef.id });
//         console.log(`Teacher creado con ID: ${newDocRef.id}`);
//       }

//       this.resetForm();
//     } catch (error) {
//       console.error('Error al guardar el teacher:', error);
//       this.errorMessage = 'Error al guardar el teacher';
//     }
//   }

//   async deleteTeacher() {
//     if (this.editingTeacherId) {
//       const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar este teacher?');
//       if (confirmDelete) {
//         try {
//           const teacherDoc = doc(this.firestore, `teachers/${this.editingTeacherId}`);
//           await deleteDoc(teacherDoc);
//           console.log(`Teacher ${this.editingTeacherId} eliminado exitosamente`);
//           this.resetForm();
//         } catch (error) {
//           console.error('Error al eliminar el teacher:', error);
//           this.errorMessage = 'Error al eliminar el teacher';
//         }
//       }
//     }
//   }

//   resetForm() {
//     this.newTeacher = {
//       name: '',
//       defaultTitle: '',
//       doc_path: ''
//     };
//     this.sections = [{ name: 'Section 0', subtext: 'Introducción', pages: '0' }];
//     this.editingTeacherId = null;
//     this.selectedTeacherId = '';
//     this.errorMessage = '';
//   }

//   addSection() {
//     this.sections.push({
//       name: `Section ${this.sections.length}`,
//       subtext: '',
//       pages: ''
//     });
//   }

//   removeSection(index: number) {
//     if (this.sections.length > 1) {
//       this.sections.splice(index, 1);
//     } else {
//       this.errorMessage = 'Debe haber al menos una sección';
//     }
//   }
// }


