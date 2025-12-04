import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { stripe } from '@env/environment';
import { firstValueFrom } from 'rxjs';





@Injectable({
  providedIn: 'root'
})
export class StripeService {
  stripe_key = stripe.STRIPE_PUBLIC_KEY;
  back_stripe = stripe.BACK_STRIPE;
  private http = inject(HttpClient);

  constructor() { }

  async setCardToCustomer(paymentMethodId: string): Promise<any> {
    const customerId = "cus_T21WkKXY2dJwe7"; // Reemplaza con tu customer_id real
    const url = `${this.back_stripe}/attach-payment-method`;
    const body = {
      customer_id: customerId,
      payment_method_id: paymentMethodId
    };

    console.log(paymentMethodId);

    const theReturn = await firstValueFrom(this.http.post(url, body));
    console.log(theReturn);

    return theReturn
  }

  async createOnetimePayment(paymentMethodId: string): Promise<string> {
    const customerId = "cus_T0M5u9QFE1trTB"; // Reemplaza con tu customer_id real
    const priceId = "price_1S55jJ2NbFTciyd3T40OivLh" // Reemplaza con tu price_id real
    // const priceId = "price_1S4onD2NbFTciyd3OCwUW0oD" // PRECIO Recurrent real

    const url = `${this.back_stripe}/create-onetime-payment`;
    const body = {
      customer_id: customerId,
      price_id: priceId
    };

    const response: any = await firstValueFrom(this.http.post(url, body));
    return response.client_secret;
  }

  // async createCombinedSubscription(paymentMethodId: string): Promise<string> {
  //   const customerId = "cus_T20Zf9xsR91kn6"; // Reemplaza con tu customer_id real
  //   const oneTimePriceId = "price_1S55jJ2NbFTciyd3T40OivLh" // Reemplaza con tu price_id real
  //   const subscriptionPriceId = "price_1S4onD2NbFTciyd3OCwUW0oD" // PRECIO Recurrent real

  //   const url = `${this.back_stripe}/create-combined-subscription`;
  //   const body = {
  //     customer_id: customerId,
  //     one_time_price_id: oneTimePriceId,
  //     subscription_price_id: subscriptionPriceId
  //   };

  //   const response: any = await firstValueFrom(this.http.post(url, body));
  //   console.log(response);

  //   return response.client_secret;
  // }

  async createCombinedSubscription(paymentMethodId: string): Promise<any> {
    const customerId = "cus_T21WkKXY2dJwe7";
    const oneTimePriceId = "price_1S55jJ2NbFTciyd3T40OivLh"
    const subscriptionPriceId = "price_1S4onD2NbFTciyd3OCwUW0oD"

    const url = `${this.back_stripe}/create-combined-subscription`;
    const body = {
      customer_id: customerId,
      one_time_price_id: oneTimePriceId,
      subscription_price_id: subscriptionPriceId
    };

    const response: any = await firstValueFrom(this.http.post(url, body));
    console.log(response);
    return response; // Devolver toda la respuesta, no solo client_secret
  }

}
