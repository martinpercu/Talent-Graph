import { Injectable, inject } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storage = inject(AngularFireStorage);
  firestore = inject(AngularFirestore);


  constructor() {}

  uploadFile(file: File, path: string): Observable<string | null> {
    const fileRef = this.storage.ref(path);
    const uploadTask = this.storage.upload(path, file);
    return from(uploadTask).pipe(
      switchMap(() => fileRef.getDownloadURL()),
      map(url => {
        console.log('URL type:', typeof url, url); // Should log: string, <URL>
        return url;
      }),
      catchError(error => {
        console.error('Error al subir archivo:', error);
        return of(null);
      })
    );
  }


}
