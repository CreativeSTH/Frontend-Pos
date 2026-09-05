import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EstadoOnboarding } from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly api = inject(ApiService);

  estado() {
    return this.api.get<EstadoOnboarding>('/onboarding/estado');
  }
}
