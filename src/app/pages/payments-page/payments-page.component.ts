import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { stripe } from '@env/environment'
// import { bootstrapApplication } from '@angular/platform-browser';
// import { loadStripe, Stripe } from '@stripe/stripe-js';



declare const Stripe: any;


@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './payments-page.component.html',
  styleUrl: './payments-page.component.css'
})
export class PaymentsPageComponent implements OnInit {
  stripe_key = stripe.STRIPE_PUBLIC_KEY;

  // Datos del formulario
  customerId = 'cus_T0M34TJcs6JScP'; // Ejemplo de ID de cliente
  fixedPriceId = 'price_1S4T4L2NbFTciyd3t4CpqWU5'; // Ejemplo de ID de precio fijo
  meteredPriceId = 'price_1S4T5W2NbFTciyd3BQIsYngw'; // Ejemplo de ID de precio por uso

  // Estados de la UI con Signals
  isLoading = signal(false);
  message = signal('');

  // Servicios inyectados
  private http = inject(HttpClient);

  // Instancias de Stripe
  private stripe: any = null;

  constructor() {}

  ngOnInit() {
    this.initializeStripe();
  }

  initializeStripe() {
    const stripeUrl = 'https://js.stripe.com/v3/';

    // Si la librería ya está cargada, la inicializamos
    if ((window as any).Stripe) {
      this.stripe = (window as any).Stripe(this.stripe_key);
      return;
    }

    // Si no está cargada, inyectamos el script dinámicamente
    const script = document.createElement('script');
    script.src = stripeUrl;
    script.onload = () => {
      this.stripe = (window as any).Stripe(this.stripe_key);
    };
    script.onerror = () => {
      this.message.set('Error al cargar Stripe.');
    };
    document.head.appendChild(script);
  }

  async createSubscription() {
    if (!this.stripe) {
      this.message.set('Stripe no está listo.');
      return;
    }

    this.isLoading.set(true);
    this.message.set('');

    try {
      const response = await this.http.post<{ client_secret: string | null }>(
        'http://localhost:8000/create-subscription', // Reemplaza con la URL de tu endpoint
        {
          customer_id: this.customerId,
          fixed_price_id: this.fixedPriceId,
          metered_price_id: this.meteredPriceId
        }
      ).toPromise();

      if (response && response.client_secret) {
        // Caso 1: Se necesita un pago.
        this.message.set('Se requiere un pago. Redirigiendo...');
        const result = await this.stripe.confirmCardPayment(response.client_secret);

        if (result.error) {
          this.message.set('Error en el pago: ' + result.error.message);
        } else {
          this.message.set('Éxito: Pago completado. ¡Suscripción activa!');
        }

      } else {
        // Caso 2: No se requiere pago (ej. precio $0)
        this.message.set('Éxito: Suscripción creada. No se requirió pago inicial.');
      }

    } catch (error) {
      const errorMessage = (error as any)?.error?.detail || 'Error inesperado.';
      this.message.set(`Error: ${errorMessage}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}
