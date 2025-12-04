import { TestBed } from '@angular/core/testing';

import { StringTransformerService } from './string-transformer.service';

describe('StringTransformerService', () => {
  let service: StringTransformerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StringTransformerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
