import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class StringTransformerService {
  private caracteresBase62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  constructor() {
   }

  nowInBase62() {
    const rightNow = Date.now();
    console.log(rightNow);
    const almostNow = 1757000000000
    // almostNow help to get 6 characters longer at the end till 2027
    const rightNowShorter = rightNow - almostNow
    console.log(rightNowShorter);

    if (rightNowShorter === 0) {
      return "0";
    }

    let base62String = "";
    let cociente = rightNowShorter;

    while (cociente > 0) {
      let residuo = cociente % 62;
      base62String = this.caracteresBase62[residuo] + base62String;
      cociente = Math.floor(cociente / 62);
    }
    console.log(base62String);

    return base62String;
  }


}
