import { Component, inject } from '@angular/core';

import { VisualStatesService } from '@services/visual-states.service';
import { PagesService } from '@services/pages.service';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-modalhowitworks',
  imports: [MatIconModule],
  templateUrl: './modalhowitworks.component.html'
})
export class ModalhowitworksComponent {

  visualStatesService = inject(VisualStatesService);
  pagesService = inject(PagesService);

  closeModal() {
    this.visualStatesService.showModalInfo.set(false)
  };

}
