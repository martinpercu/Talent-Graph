import { Component, inject, OnInit, OnDestroy, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { stripe } from '@env/environment';
import { StripeService } from '@services/stripe.service';

declare var Stripe: any;


@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stripe-card.component.html',
  styleUrl: './stripe-card.component.css'
})
export class StripeCardComponent implements OnInit, OnDestroy, AfterViewInit {
  stripeService = inject(StripeService);

  stripe_key = stripe.STRIPE_PUBLIC_KEY;
  stripe: any = null;
  cardElement: any = null;
  elements: any = null;

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  paymentMethodId = signal<string | null>(null);

  constructor() {}

  // El método ngOnInit se mantiene para el ciclo de vida, pero no inicializaremos Stripe aquí.
  ngOnInit() { }

  ngAfterViewInit() {
    this.initializeStripe();
  }

  ngOnDestroy() {
    if (this.cardElement) {
      this.cardElement.destroy();
    }
  }

  /**
   * Inicializa Stripe y monta el elemento de la tarjeta en el DOM.
   */
  private initializeStripe() {
    this.loading.set(true);
    this.error.set(null);

    const script = document.createElement('script');
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      try {
        if (typeof Stripe === 'undefined') {
          throw new Error('Error al cargar Stripe.');
        }
        this.stripe = new Stripe(this.stripe_key);
        this.elements = this.stripe.elements();
        this.cardElement = this.elements.create('card');

        // Ahora montamos el elemento de la tarjeta directamente.
        this.cardElement.mount('#card-element');
        this.loading.set(false);

      } catch (e: any) {
        this.error.set(e.message);
        this.loading.set(false);
      }
    };
    script.onerror = () => {
      this.error.set('Error al cargar el script de Stripe. Por favor, revisa tu conexión a internet.');
      this.loading.set(false);
    };
    document.head.appendChild(script);
  }



  /**
   * Captura los detalles de la tarjeta y crea un Payment Method con Stripe.
   */
  async addCard() {
    this.loading.set(true);
    this.error.set(null);

    const { error, paymentMethod } = await this.stripe.createPaymentMethod({
      type: 'card',
      card: this.cardElement,
    });

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
    } else {
      console.log(paymentMethod.id); // este es el PM
      // this.paymentMethodId.set(paymentMethod.id);
      const theResponse = await this.stripeService.setCardToCustomer(paymentMethod.id);
      this.success.set(true);
      this.loading.set(false);
      console.log(theResponse);
      this.handleSubscription();
    }
  }


  /**
   * Captura los detalles de la tarjeta y luego inicia el proceso de pago.
   */
  async handlePayment() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Paso 1: Obtener el Payment Method ID de Stripe
      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.paymentMethodId.set(paymentMethod.id);

      // Paso 2: Llamar a tu backend para crear un PaymentIntent y obtener el client_secret
      const clientSecret = await this.stripeService.createOnetimePayment(paymentMethod.id);
      console.log(clientSecret);


      // Paso 3: Confirmar el pago en el frontend
      const { paymentIntent, error: confirmError } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: this.paymentMethodId(),
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        this.success.set(true);
      } else {
        throw new Error('El pago no fue exitoso.');
      }

    } catch (e: any) {
      this.error.set(e.message);
      this.success.set(false);
    } finally {
      this.loading.set(false);
    }
  }


  /**
   * Captura los detalles de la tarjeta y luego inicia el proceso de pago.
   */
  // async handleSubscription() {
  //   this.loading.set(true);
  //   this.error.set(null);

  //   try {
  //     // Paso 1: Obtener el Payment Method ID de Stripe
  //     const { error, paymentMethod } = await this.stripe.createPaymentMethod({
  //       type: 'card',
  //       card: this.cardElement,
  //     });

  //     if (error) {
  //       throw new Error(error.message);
  //     }

  //     this.paymentMethodId.set(paymentMethod.id);

  //     // Paso 2: Llamar a tu backend para crear un PaymentIntent y obtener el client_secret
  //     const clientSecret = await this.stripeService.createCombinedSubscription(paymentMethod.id);
  //     console.log(clientSecret);


  //     // Paso 3: Confirmar el pago en el frontend
  //     const { paymentIntent, error: confirmError } = await this.stripe.confirmCardPayment(clientSecret, {
  //       payment_method: this.paymentMethodId(),
  //     });

  //     if (confirmError) {
  //       throw new Error(confirmError.message);
  //     }

  //     if (paymentIntent.status === 'succeeded') {
  //       this.success.set(true);
  //     } else {
  //       throw new Error('El pago no fue exitoso.');
  //     }

  //   } catch (e: any) {
  //     this.error.set(e.message);
  //     this.success.set(false);
  //   } finally {
  //     this.loading.set(false);
  //   }
  // }

  /**
 * Crea la suscripción usando el método de pago guardado del customer
 */
  async handleSubscription() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Como el customer ya tiene método de pago, solo llamamos al backend
      const result = await this.stripeService.createCombinedSubscription("");

      console.log(result);

      // Verificar que la suscripción se creó exitosamente
      if (result.status === 'success' && result.subscription_id) {
        this.success.set(true);
      } else {
        throw new Error('La suscripción no se pudo crear correctamente.');
      }

    } catch (e: any) {
      this.error.set(e.message);
      this.success.set(false);
    } finally {
      this.loading.set(false);
    }
  }

}
