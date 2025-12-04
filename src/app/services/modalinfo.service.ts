import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalinfoService {

  showModalInfo = signal<Boolean | undefined>(undefined);

}
