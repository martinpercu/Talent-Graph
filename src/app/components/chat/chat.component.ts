import { Component, signal, inject, ViewChild, ElementRef } from '@angular/core';

import { environment } from '@env/environment';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';

import { MatIconModule } from '@angular/material/icon';

import { FormsModule } from '@angular/forms';

import { MessageWaitingComponent } from '@components/message-waiting/message-waiting.component';
import { TopRightComponent } from '@components/top-right/top-right.component';

import { ChatMessage } from '@models/chatMessage';

import { VisualStatesService } from '@services/visual-states.service';
import { PagesService } from '@services/pages.service';
import { UserService } from '@services/user.service';


@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, MatIconModule, MessageWaitingComponent, TopRightComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  @ViewChild('chatInput') chatInput!: ElementRef<HTMLTextAreaElement>;

  private http = inject(HttpClient);
  visualStatesService = inject(VisualStatesService);
  pagesService = inject(PagesService);
  userService = inject(UserService);

  userMessage: string = '';

  messages: string[] = [];

  currentUserMessage!: string;
  chatMessages: ChatMessage[] = [];

  loadingResponse: boolean = false;
  startingResponse: boolean = false;

  showArrowDown: boolean = false;
  userScrolled: boolean = false; // Nueva bandera para controlar el scroll manual

  // start Voice
  speakIsEnabled: boolean = false; // Controla si TTS está activado
  // End Voice

  // start Voice
  ngOnInit(): void {
    // Cargar voces disponibles al iniciar el componente
    this.loadVoices();
  }
  // End Voice

  ngAfterViewInit(): void {
    // Escuchar el evento de scroll en el contenedor de los mensajes
    this.messagesContainer.nativeElement.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngAfterViewChecked(): void {
    // Este hook se asegura de que el scroll se mueva solo después de que el DOM se haya actualizado.
    this.scrollToBottom();
  }

  startLesson() {
    const textStart = `In the docs you will find one starting with ${this.pagesService.titleSelected()} this is the subject of this lesson. Please order the others docs and find the best way to teach me this info. Please start with no more than 110 words to explain me and then just ask me if I want to continue the lesson or if I need you to explain me again the same.`
    return textStart
  }

  testButton() {
    // console.log(this.pagesService.startLessonFull());
    // console.log(this.pagesService.startLesson());
    // console.log(this.pagesService.hardTest());
    // console.log(this.pagesService.shortTest());
    console.log(this.userService.userSig()?.email);

  }

  // Start Voice
  // Nueva función para cargar voces disponibles
  private loadVoices(): void {
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
    };
  }

  toggleSpeak(): void {
    this.speakIsEnabled = !this.speakIsEnabled;
  }

  // Nueva función para reproducir texto como voz
  speakText(text: string): void {
    // VERY IMPORTANT ===> Clean the tail ==>  LIMPIAR LA COLA DE SPEECH!!!
    window.speechSynthesis.cancel(); // clean the reproduction queu

    if (!this.speakIsEnabled) return; // No reproducir si TTS está desactivado
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Idioma Inglés (puedes cambiar a 'es-US' u otros)
    utterance.volume = 1; // Volumen (0 a 1)
    utterance.rate = 1; // Velocidad (0.1 a 10)
    utterance.pitch = 1; // Tono (0 a 2)

    // Opcional: Seleccionar una voz específica
    // List of en-US inChrome: 'Samantha', 'Victoria', 'Alex', 'Fred' and 'Google US English'
    const voices = window.speechSynthesis.getVoices();
    console.log('Voces disponibles en speakText:', voices.map(v => v.name)); // Depuración
    const selectedVoice = voices.find(voice => voice.name === 'Samantha'); // Seleccionar Samantha
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Voz seleccionada:', selectedVoice.name, selectedVoice.voiceURI);
    } else {
      console.log('the selected voice not found , use en-US by default');
    }

    window.speechSynthesis.speak(utterance);
  }
  // End Voice


  onScroll(): void {
    const container = this.messagesContainer.nativeElement;
    const isAtBottom = container.scrollHeight === container.scrollTop + container.clientHeight;
    if (!isAtBottom) {
      this.userScrolled = true; // El usuario ha hecho scroll manualmente
      this.showArrowDown = true; // Muestra la flecha para volver abajo
    } else {
      this.userScrolled = false; // Usuario ha llegado al final, reanudar auto-scroll
      this.showArrowDown = false;
    }
  }

  sendMessage(message: string, showUserMessage: boolean = true): void {
    if (message.trim() === "") return;

    this.loadingResponse = true;
    if (showUserMessage) {
      this.chatMessages.push({ role: "user", message });
    }

    const responseMessage = { role: "assistant", message: "" };
    this.chatMessages.push(responseMessage);

    let completeResponse = "";
    let displayedChars = 0;
    let typingInterval: any = null;

    const charsPerTick = 3; // Puedes ajustarlo o hacerlo dinámico más adelante

    const simulateTyping = () => {
      if (displayedChars < completeResponse.length) {
        const nextChunk = Math.min(displayedChars + charsPerTick, completeResponse.length);
        responseMessage.message = completeResponse.substring(0, nextChunk);
        displayedChars = nextChunk;
        this.loadingResponse = false;
        setTimeout(() => this.scrollToBottom(), 10);
      } else {
        clearInterval(typingInterval);
        responseMessage.message = completeResponse;
        this.loadingResponse = false;
        this.startingResponse = false;
      }
    };

    const formData = {
      message,
      session_id: this.userService.userSig()?.email,
      pages: this.pagesService.pagesSelected(),
      doc_path: this.pagesService.docPath()
    };

    const timeout = setTimeout(() => {
      clearInterval(typingInterval);
      responseMessage.message = completeResponse;
      this.loadingResponse = false;
    }, 10000);

    // this.http.post("https://assistant-chat-backend-production.up.railway.app/stream_chat_test", formData, {
    // this.http.post("http://127.0.0.1:8000/stream_chat_test", formData, {
    this.http.post(`${environment.BACK_CHAT_URL}/stream_chat_test`, formData, {
      responseType: 'text',
      observe: 'events',
      reportProgress: true,
    })
      .subscribe({
        next: (event: HttpEvent<string>) => {
          if (event.type === HttpEventType.DownloadProgress) {
            const rawText = (event as HttpDownloadProgressEvent).partialText ?? "";
            completeResponse = rawText.trim();
            if (!typingInterval) {
              typingInterval = setInterval(simulateTyping, 80);
            }
          } else if (event.type === HttpEventType.Response) {
            completeResponse = (event.body as string)?.trim() || completeResponse;
            this.speakText(completeResponse); // Solo reproducimos el texto, no lo mostramos
          }
        },
        error: (err) => {
          console.error('Error:', err);
          clearInterval(typingInterval);
          clearTimeout(timeout);
          responseMessage.message = "Error getting response. Please try again.";
          this.loadingResponse = false;
        },
        complete: () => {
          clearTimeout(timeout);
        }
      });

    this.userMessage = "";
    if (showUserMessage) {
      setTimeout(() => {
        this.userMessage = "";
        this.adjustHeight();
      }, 100);
    }

    setTimeout(() => {
      this.scrollToBottomFromArrow();
    }, 100);
  }

  // sendMessage(message: string, showUserMessage: boolean = true): void {
  //   if (message.trim() === "") return;

  //   this.loadingResponse = true;
  //   if (showUserMessage) {
  //     this.chatMessages.push({ role: "user", message });
  //   }

  //   const responseMessage = { role: "assistant", message: "" };
  //   this.chatMessages.push(responseMessage);

  //   let completeResponse = "";
  //   let displayedChars = 0;
  //   let typingInterval: any = null;
  //   let responseReceived = false;

  //   const charsPerTick = Math.max(3, Math.floor(completeResponse.length / 80));

  //   const simulateTyping = () => {
  //     if (displayedChars < completeResponse.length && !responseReceived) {
  //       const nextChunk = Math.min(displayedChars + charsPerTick, completeResponse.length);
  //       responseMessage.message = completeResponse.substring(0, nextChunk);
  //       displayedChars = nextChunk;
  //       this.loadingResponse = false;
  //       setTimeout(() => this.scrollToBottom(), 10);
  //     }
  //     if (displayedChars >= completeResponse.length || responseReceived) {
  //       clearInterval(typingInterval);
  //       responseMessage.message = completeResponse;
  //       this.loadingResponse = false;
  //       this.startingResponse = false;
  //     }
  //   };

  //   const formData = {
  //     message,
  //     session_id: this.userService.userSig()?.email,
  //     pages: this.pagesService.pagesSelected(),
  //     doc_path: this.pagesService.docPath()
  //   };

  //   const timeout = setTimeout(() => {
  //     clearInterval(typingInterval);
  //     responseMessage.message = completeResponse;
  //     this.loadingResponse = false;
  //   }, 10000);

  //   // this.http.post("https://assistant-chat-backend-production.up.railway.app/stream_chat_test", formData, {
  //   this.http.post("http://127.0.0.1:8000/stream_chat_test", formData, {
  //     responseType: 'text',
  //     observe: 'events',
  //     reportProgress: true,
  //   })
  //     .subscribe({
  //       next: (event: HttpEvent<string>) => {
  //         if (event.type === HttpEventType.DownloadProgress) {
  //           const rawText = (event as HttpDownloadProgressEvent).partialText ?? "";
  //           completeResponse = rawText.trim();
  //           if (!typingInterval) {
  //             typingInterval = setInterval(simulateTyping, 80);
  //           }
  //         } else if (event.type === HttpEventType.Response) {
  //           completeResponse = (event.body as string)?.trim() || completeResponse;
  //           responseReceived = true;
  //           responseMessage.message = completeResponse;
  //           this.speakText(completeResponse);
  //         }
  //       },
  //       error: (err) => {
  //         console.error('Error:', err);
  //         clearInterval(typingInterval);
  //         clearTimeout(timeout);
  //         responseMessage.message = "Error getting response. Please try again.";
  //         this.loadingResponse = false;
  //       },
  //       complete: () => {
  //         clearTimeout(timeout);
  //       }
  //     });

  //   this.userMessage = "";
  //   if (showUserMessage) {
  //     setTimeout(() => {
  //       this.userMessage = "";
  //       this.adjustHeight();
  //     }, 100);
  //   }

  //   setTimeout(() => {
  //     this.scrollToBottomFromArrow();
  //   }, 100);
  // }



  scrollToBottom(): void {
    if (!this.userScrolled && this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;  // Solo hacer scroll si el usuario no lo ha detenido
    }
  }

  scrollToBottomFromArrow(): void {
    console.log('hello');
    const container = this.messagesContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }

  adjustHeight(): void {
    const textarea = this.chatInput.nativeElement;
    textarea.style.height = 'auto'; // Reinicia la altura para reducir si es necesario
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  // handleKeydown(event: KeyboardEvent): void {
  //   if (event.key === 'Enter' && !event.shiftKey) {
  //     event.preventDefault();
  //     this.sendMessage_stream();
  //   }
  // }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage(this.userMessage);
    }
  }

  toggleShowLeftMenuHeader() {
    this.visualStatesService.togleShowLeftMenu()
  }



  // sendMessage_stream() {
  //   if (this.userMessage.trim() === "") return;

  //   this.loadingResponse = true;
  //   this.chatMessages.push({ role: "user", message: this.userMessage });

  //   const responseMessage = { role: "assistant", message: "" };
  //   this.chatMessages.push(responseMessage);

  //   console.log(this.chatMessages);


  //   let completeResponse = "";
  //   let displayedChars = 0;
  //   let typingInterval: any = null;
  //   let responseReceived = false; // Bandera para saber si la respuesta completa está lista

  //   // Velocidad dinámica basada en la longitud
  //   const charsPerTick = Math.max(3, Math.floor(completeResponse.length / 80));

  //   // Función para simular la escritura gradual
  //   const simulateTyping = () => {
  //     if (displayedChars < completeResponse.length) {
  //       const nextChunk = Math.min(displayedChars + charsPerTick, completeResponse.length);
  //       responseMessage.message = completeResponse.substring(0, nextChunk);
  //       displayedChars = nextChunk;
  //       this.loadingResponse = false;
  //       setTimeout(() => this.scrollToBottom(), 10);
  //     }
  //     if (displayedChars >= completeResponse.length) {
  //       clearInterval(typingInterval);
  //       responseMessage.message = completeResponse; // Asegurar que el texto completo se muestre
  //       this.loadingResponse = false;
  //       this.startingResponse = false;
  //       // // Start Voice
  //       // // Reproducir la respuesta completa como voz
  //       // this.speakText(completeResponse);
  //       // // End Voice
  //     }
  //   };


  //   const formData = {
  //     message: this.userMessage,
  //     session_id: 'gagaga',
  //     // session_id: this.authService.currentUserSig()?.email + '-' + this.assistSelector.assistant_name(),
  //     // session_id: this.combinedUserEmailAndAssistant(),
  //     // system_prompt_text: this.assistSelector.assistant_description()
  //     // system_prompt_text: 'Eres un asistente que responde unicamente usando la informacion de los PDFs que tienes en las vectorstore',
  //     pages: this.pagesService.pagesSelected(),
  //     doc_path: this.pagesService.docPath()
  //   };

  //   const timeout = setTimeout(() => {
  //     clearInterval(typingInterval);
  //     responseMessage.message = completeResponse;
  //     this.loadingResponse = false;
  //   }, 10000); // 10 segundos de timeout

  //   // this.http.post("https://assistant-chat-backend-production.up.railway.app/stream_chat_test", formData, {
  //   this.http.post("http://127.0.0.1:8000/stream_chat_test", formData, {
  //     responseType: 'text',
  //     observe: 'events',
  //     reportProgress: true,
  //   })
  //     .subscribe({
  //       next: (event: HttpEvent<string>) => {
  //         if (event.type === HttpEventType.DownloadProgress) {
  //           const rawText = (event as HttpDownloadProgressEvent).partialText ?? "";
  //           completeResponse = rawText.trim();

  //           if (!typingInterval) {
  //             typingInterval = setInterval(simulateTyping, 80);
  //           }
  //         }
  //         else if (event.type === HttpEventType.Response) {
  //           // Guarda el texto completo pero **NO lo muestra directamente**
  //           completeResponse = (event.body as string)?.trim() || completeResponse;

  //           responseReceived = true; // Marcar que la respuesta completa está recibida
  //           responseMessage.message = completeResponse; // Mostrar el texto completo en la UI

  //           // Start Voice
  //           // Reproducir la respuesta completa como voz
  //           this.speakText(completeResponse);
  //           // End Voice

  //           // Si el simulador sigue activo, permite que termine naturalmente
  //         }
  //       },
  //       error: (err) => {
  //         console.error('Error:', err);
  //         clearInterval(typingInterval);
  //         clearTimeout(timeout);
  //         responseMessage.message = "Error al obtener la respuesta. Intenta de nuevo.";
  //         this.loadingResponse = false;
  //       },
  //       complete: () => {
  //         // El simulador se encargará de completar el mensaje
  //         clearTimeout(timeout);
  //       }
  //     });

  //   // Clear input
  //   this.userMessage = "";
  //   setTimeout(() => {
  //     this.userMessage = "";
  //     this.adjustHeight()
  //   }, 100);

  //   setTimeout(() => {
  //     this.scrollToBottomFromArrow();
  //   }, 100);

  // }




  // sendMessage_stream_without_text(sendingMessage: string) {
  //   // if (this.userMessage.trim() === "") return;
  //   console.log('esot aqui<s');

  //   console.log(this.pagesService.pagesSelected());


  //   this.userMessage = sendingMessage

  //   this.loadingResponse = true;
  //   // this.chatMessages.push({ role: "user", message: this.userMessage });

  //   const responseMessage = { role: "assistant", message: "" };
  //   this.chatMessages.push(responseMessage);

  //   let completeResponse = "";
  //   let displayedChars = 0;
  //   let typingInterval: any = null;
  //   let responseReceived = false; // Bandera para saber si la respuesta completa está lista

  //   // Velocidad dinámica basada en la longitud
  //   const charsPerTick = Math.max(3, Math.floor(completeResponse.length / 80));

  //   // Función para simular la escritura gradual
  //   const simulateTyping = () => {
  //     if (displayedChars < completeResponse.length) {
  //       const nextChunk = Math.min(displayedChars + charsPerTick, completeResponse.length);
  //       responseMessage.message = completeResponse.substring(0, nextChunk);
  //       displayedChars = nextChunk;
  //       this.loadingResponse = false;
  //       setTimeout(() => this.scrollToBottom(), 10);
  //     }
  //     if (displayedChars >= completeResponse.length) {
  //       clearInterval(typingInterval);
  //       responseMessage.message = completeResponse; // Asegurar que el texto completo se muestre
  //       this.loadingResponse = false;
  //       this.startingResponse = false;
  //     }
  //   };

  //   const formData = {
  //     message: this.userMessage,
  //     // session_id: this.authService.currentUserSig()?.email + '-' + this.assistSelector.assistant_name(),
  //     // session_id: this.combinedUserEmailAndAssistant(),
  //     // system_prompt_text: this.assistSelector.assistant_description()
  //     // system_prompt_text: 'Eres un profesor que analiza y entiende los documentos recibidos. Puedes hacer preguntas en relacion a los PDF y testear el conocimiento del user. Importante solamente puedes usar la informacion de los PDFs que tienes en las vectorstore',
  //     pages: this.pagesService.pagesSelected(),
  //     doc_path: this.pagesService.docPath()
  //   };

  //   console.log(formData);

  //   const timeout = setTimeout(() => {
  //     clearInterval(typingInterval);
  //     responseMessage.message = completeResponse;
  //     this.loadingResponse = false;
  //   }, 10000); // 10 segundos de timeout

  //   // this.http.post("https://assistant-chat-backend-production.up.railway.app/stream_chat_test", formData, {
  //   this.http.post("http://127.0.0.1:8000/stream_chat_test", formData, {
  //     responseType: 'text',
  //     observe: 'events',
  //     reportProgress: true,
  //   })
  //     .subscribe({
  //       next: (event: HttpEvent<string>) => {
  //         if (event.type === HttpEventType.DownloadProgress) {
  //           const rawText = (event as HttpDownloadProgressEvent).partialText ?? "";
  //           completeResponse = rawText.trim();

  //           if (!typingInterval) {
  //             typingInterval = setInterval(simulateTyping, 80);
  //           }
  //         }
  //         else if (event.type === HttpEventType.Response) {
  //           // Guarda el texto completo pero **NO lo muestra directamente**
  //           completeResponse = (event.body as string)?.trim() || completeResponse;
  //           responseReceived = true; // Marcar que la respuesta completa está recibida
  //           responseMessage.message = completeResponse; // Mostrar el texto completo en la UI

  //           // Start Voice
  //           // Reproducir la respuesta completa como voz
  //           this.speakText(completeResponse);
  //           // End Voice

  //           // Si el simulador sigue activo, permite que termine naturalmente
  //         }
  //       },
  //       error: (err) => {
  //         console.error('Error:', err);
  //         clearInterval(typingInterval);
  //         clearTimeout(timeout);
  //         responseMessage.message = "Error al obtener la respuesta. Intenta de nuevo.";
  //         this.loadingResponse = false;
  //       },
  //       complete: () => {
  //         // El simulador se encargará de completar el mensaje
  //         clearTimeout(timeout);
  //       }
  //     });


  //   // Clear input
  //   this.userMessage = "";
  //   setTimeout(() => {
  //     this.userMessage = "";
  //   }, 100);

  //   setTimeout(() => {
  //     this.scrollToBottomFromArrow();
  //   }, 100);
  // }

}
