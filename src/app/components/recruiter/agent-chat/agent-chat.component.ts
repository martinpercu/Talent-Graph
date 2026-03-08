import { Component, inject, ViewChild, ElementRef, ChangeDetectorRef, OnInit, effect, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

import { FormsModule } from '@angular/forms';

import { firstValueFrom } from 'rxjs';

import { MessageWaitingComponent } from '@components/message-waiting/message-waiting.component';

import { ChatMessage, AgentState } from '@models/chatMessage';

import { VisualStatesService } from '@services/visual-states.service';
import { AgentChatService } from '@services/agent-chat.service';
import { AgentChatListService } from '@services/agent-chat-list.service';
import { TranslocoPipe } from '@jsverse/transloco';

import { AgentChatsListComponent } from '@recruiter/agent-chats-list/agent-chats-list.component';

import { environment } from '@env/environment';


@Component({
  selector: 'app-agent-chat',
  imports: [CommonModule, FormsModule, MatIconModule, MessageWaitingComponent, TranslocoPipe, AgentChatsListComponent],
  templateUrl: './agent-chat.component.html',
  styleUrl: './agent-chat.component.css'
})
export class AgentChatComponent implements OnInit {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLTextAreaElement>;
  private cdr = inject(ChangeDetectorRef);

  visualStatesService = inject(VisualStatesService);
  agentChatService = inject(AgentChatService);
  agentChatListService = inject(AgentChatListService);


  userMessage: string = '';

  chatMessages: ChatMessage[] = [];

  loadingResponse: boolean = false;

  showArrowDown: boolean = false;
  userScrolled: boolean = false; // Nueva bandera para controlar el scroll manual

  // Estado actual del agente
  currentAgentState = signal<AgentState>('chat');


  // start Voice
  speakIsEnabled: boolean = false; // Controla si TTS está activado
  selectedVoice: string = 'af_heart'; // Voz por defecto del backend TTS (af_heart, af_bella, em_alex, ef_dora, ff_siwis)
  // End Voice

  // STT - Speech to Text (grabación de audio)
  isRecording = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  // End STT

  message_1: string = "Email"
  message_2: string = "Questions"
  message_3: string = "Compare"
  message_4: string = "Schedule Interview"


  platformName: string = environment.WEBSITE_NAME;
  isExpanded = false; // Por defecto cerrado para no ocupar espacio, o true si querés que lo lean sí o sí.
  demoMainEmail: string = "talentgraph.demo@gmail.com"
  demoDollyEmail: string = "martinpercu@gmail.com"

  // Para rastrear el thread anterior
  private previousThreadId: string | null = null;

  constructor() {
    // 👂 Escuchar cambios en el threadId seleccionado
    effect(() => {
      const threadId = this.agentChatListService.currentThreadId();

      // Solo cargar mensajes si el thread CAMBIÓ (no si se actualizó el mismo thread)
      if (threadId !== this.previousThreadId) {
        console.log('🔄 Thread cambió de', this.previousThreadId, 'a', threadId);
        this.loadMessagesForThread(threadId);
      } else {
        console.log('✅ Thread no cambió, no recargar mensajes');
      }
    });

    // 👂 Escuchar cuando se necesita hacer focus en el textarea
    effect(() => {
      const shouldFocus = this.visualStatesService.shouldFocusTextarea();
      if (shouldFocus) {
        setTimeout(() => {
          if (this.chatInput) {
            this.chatInput.nativeElement.focus();
          }
          // Resetear el signal
          this.visualStatesService.shouldFocusTextarea.set(false);
        }, 100);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Limpiar threads vacíos con nombre ". . ." al cargar el componente
    await this.cleanEmptyThreads();

    // El effect ya se encargará de cargar los mensajes iniciales
  }

  /**
   * Limpia threads con nombre ". . ." que no tienen mensajes reales
   * (solo tienen el mensaje trigger o están completamente vacíos)
   *
   * IMPORTANTE: NO elimina threads si hay errores de red para evitar pérdida de datos
   */
  private async cleanEmptyThreads(): Promise<void> {
    const threads = this.agentChatListService.getThreads();

    // Buscar threads con nombre ". . ."
    const emptyThreads = threads.filter(t => t.name === '. . .');

    if (emptyThreads.length === 0) {
      console.log('✅ No hay threads vacíos para limpiar');
      return;
    }

    console.log(`🧹 Encontrados ${emptyThreads.length} threads con nombre ". . ." - verificando si están vacíos...`);

    for (const thread of emptyThreads) {
      // Obtener mensajes del caché
      const cachedMessages = this.agentChatListService.getMessagesFromCache(thread.threadId);

      // Si no hay mensajes en caché, intentar obtener del backend
      if (cachedMessages.length === 0) {
        try {
          const history = await firstValueFrom(this.agentChatService.getThreadHistory(thread.threadId, 50));

          console.log(`🔍 Backend response para thread ${thread.threadId}:`, history);
          console.log(`   exists: ${history.exists}, isEmpty: ${history.isEmpty}, hasUserMessages: ${history.hasUserMessages}, messageCount: ${history.messageCount}`);

          // ✅ Usar los nuevos campos del backend (más confiables)
          if (!history.exists) {
            // Thread nunca existió en el backend
            console.log(`🗑️ Thread no existe en backend - safe to delete: ${thread.threadId}`);
            await this.agentChatListService.deleteThread(thread.threadId);
          } else if (history.isEmpty || !history.hasUserMessages) {
            // Thread existe pero está vacío o solo tiene mensajes del sistema
            console.log(`🗑️ Thread vacío confirmado por backend (messageCount: ${history.messageCount}): ${thread.threadId}`);
            await this.agentChatListService.deleteThread(thread.threadId);

            // También borrar del backend
            this.agentChatService.clearChatHistory(thread.threadId).subscribe({
              next: () => console.log('✅ Thread vacío eliminado del backend'),
              error: (err) => console.error('❌ Error al eliminar thread del backend:', err)
            });
          } else {
            // Thread tiene mensajes válidos del usuario
            console.log(`✅ Thread tiene ${history.messageCount} mensajes (${history.hasUserMessages ? 'con' : 'sin'} mensajes de usuario) - NO eliminar`);
          }
        } catch (error: any) {
          // ⚠️ CRÍTICO: NO eliminar el thread si hay error de red
          // El backend mejorado siempre retorna JSON válido, así que un error aquí es de red
          console.error(`❌ Error de red al obtener historial del thread ${thread.threadId}:`, error);
          console.warn(`⚠️ NO eliminando thread - backend no disponible (posible error de conexión)`);
        }
      } else {
        // Hay mensajes en caché - verificar si hay mensajes del usuario
        const hasUserMessages = cachedMessages.some(m => m.role === 'user');

        // También verificar si solo tiene el trigger
        const onlyHasTrigger = cachedMessages.length === 1 &&
                               cachedMessages[0].message === 'start-loading-state';

        if (!hasUserMessages || onlyHasTrigger) {
          console.log(`🗑️ Eliminando thread vacío (solo trigger en caché): ${thread.threadId}`);
          await this.agentChatListService.deleteThread(thread.threadId);

          // También borrar del backend
          this.agentChatService.clearChatHistory(thread.threadId).subscribe({
            next: () => console.log('✅ Thread vacío eliminado del backend'),
            error: (err) => console.error('❌ Error al eliminar thread del backend:', err)
          });
        } else {
          console.log(`✅ Thread tiene mensajes en caché - NO eliminar`);
        }
      }
    }

    console.log('✅ Limpieza de threads vacíos completada');
  }

  /**
   * Carga los mensajes para un thread específico usando estrategia híbrida:
   * 1. Muestra inmediatamente mensajes del caché (si existen)
   * 2. En paralelo, pide al backend el historial
   * 3. Actualiza con los mensajes del backend
   * @param threadId - ID del thread (null para limpiar pantalla)
   */
  private loadMessagesForThread(threadId: string | null): void {
    // Si threadId es null, limpiar pantalla (modo "nuevo chat")
    if (!threadId) {
      console.log('📭 Sin thread seleccionado - limpiando pantalla');
      this.chatMessages = [];
      this.currentAgentState.set('chat');
      this.previousThreadId = null;
      return;
    }

    console.log('🔄 Cambiando a thread:', threadId);

    // Resetear estado visual del agente al cambiar de thread
    // Si el backend tiene un estado guardado, lo sobreescribirá después
    this.currentAgentState.set('chat');

    // Guardar los mensajes actuales en el caché del thread anterior (si existe)
    if (this.previousThreadId && this.previousThreadId !== threadId && this.chatMessages.length > 0) {
      console.log(`💾 Guardando ${this.chatMessages.length} mensajes del thread anterior: ${this.previousThreadId}`);
      this.agentChatListService.saveMessagesToCache(this.previousThreadId, this.chatMessages);
    }

    // 1️⃣ PASO 1: Cargar inmediatamente desde caché (respuesta instantánea)
    const cachedMessages = this.agentChatListService.getMessagesFromCache(threadId);
    if (cachedMessages.length > 0) {
      console.log(`⚡ Mostrando ${cachedMessages.length} mensajes desde caché`);
      this.chatMessages = [...cachedMessages];
      setTimeout(() => this.scrollToBottomFromArrow(), 100);
    } else {
      // Si no hay caché, limpiar la pantalla
      this.chatMessages = [];
    }

    // 2️⃣ PASO 2: Pedir al backend en paralelo (para sincronizar)
    console.log('🌐 Solicitando historial al backend...');
    this.agentChatService.getThreadHistory(threadId, 50).subscribe({
      next: (history) => {
        console.log(`✅ Historial recibido del backend:`);
        console.log(`   exists: ${history.exists}, isEmpty: ${history.isEmpty}, messageCount: ${history.messageCount}`);
        console.log(`   hasUserMessages: ${history.hasUserMessages}, lastUpdated: ${history.lastUpdated}`);

        if (!history.exists) {
          console.warn('⚠️ Thread no existe en el backend - mantener caché local');
          // Mantener mensajes del caché si los hay
          return;
        }

        // Actualizar con los mensajes del backend
        this.chatMessages = [...history.messages];

        // 🎯 Capturar estado del agente si viene en el history
        if (history.current_state) {
          console.log('🎯 Estado del agente desde history:', history.current_state);
          this.currentAgentState.set(history.current_state);
        }

        // Guardar en caché para la próxima vez
        this.agentChatListService.saveMessagesToCache(threadId, history.messages);

        // Hacer scroll al final
        setTimeout(() => this.scrollToBottomFromArrow(), 100);
      },
      error: (err) => {
        console.error('❌ Error al obtener historial del backend:', err);
        // Si falla, mantener los mensajes del caché (si los había)
        if (cachedMessages.length === 0) {
          console.log('ℹ️ No hay mensajes en caché ni en el backend para este thread');
        } else {
          console.log('ℹ️ Manteniendo mensajes del caché a pesar del error');
        }
      }
    });

    // Actualizar el thread anterior
    this.previousThreadId = threadId;
  }

  // toggleShowLeftMenuHeader() {
  //   this.visualStatesService.togleShowLeftMenu()
  // }


  scrollToBottomFromArrow(): void {
    console.log('SCROLL BOTTOM METHOD');
    const container = this.messagesContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }


  adjustHeight(): void {
    const textarea = this.chatInput.nativeElement;
    textarea.style.height = 'auto'; // Reinicia la altura para reducir si es necesario
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  scrollToBottom(): void {
    if (!this.userScrolled && this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;  // Solo hacer scroll si el usuario no lo ha detenido
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage(this.userMessage);
    }
  }

  /**
   * Crea un nuevo thread y envía el trigger silencioso al backend
   * Esta función se reutiliza tanto en focus como en clearChatHistory
   * @returns El threadId del nuevo thread creado, o null si falló
   */
  private async createNewThreadWithTrigger(): Promise<string | null> {
    // Verificar si ya alcanzó el máximo de threads
    const threads = this.agentChatListService.getThreads();
    const maxThreads = this.agentChatListService.getMaxThreads();

    if (threads.length >= maxThreads) {
      console.log('⚠️ Máximo de threads alcanzado - NO crear thread');
      return null;
    }

    console.log('🎯 Creando thread automáticamente...');

    // Generar threadId
    const newThreadId = this.agentChatListService.generateThreadId();
    console.log('🆔 ThreadId generado:', newThreadId);

    try {
      // Enviar trigger al backend PRIMERO (nueva arquitectura)
      await this.agentChatService.sendTriggerMessage(newThreadId);
      console.log('✅ Trigger enviado exitosamente:', newThreadId);

      // SOLO si el backend responde OK, crear thread en frontend
      await this.agentChatListService.createEmptyThreadWithId(newThreadId);
      console.log('✨ Thread creado automáticamente:', newThreadId);

      console.log('✅ Thread listo para recibir mensajes');
      return newThreadId;

    } catch (error) {
      console.error('❌ Error al crear thread - backend no disponible:', error);
      // NO crear thread si el backend falló
      return null;
    }
  }

  /**
   * Se ejecuta cuando el usuario hace focus en el textarea
   * Crea un thread vacío + envía trigger si no hay thread seleccionado
   */
  async onTextareaFocus(): Promise<void> {
    const currentThreadId = this.agentChatListService.getCurrentThreadId();

    // Si ya hay un thread seleccionado, no hacer nada
    if (currentThreadId) {
      console.log('✅ Ya hay thread seleccionado:', currentThreadId);
      return;
    }

    await this.createNewThreadWithTrigger();
  }

  async sendMessage(message: string, showUserMessage: boolean = true): Promise<void> {
    if (message.trim() === "") return;
    // Desbloquear AudioContext sincrónicamente dentro del gesture handler (requerido por Chrome/Android)
    if (this.speakIsEnabled) this.agentChatService.unlockAudioContext();

    // Obtener el threadId actual del servicio
    let threadId = this.agentChatListService.getCurrentThreadId();

    // ⚠️ CASO EDGE: Si por alguna razón no hay thread (no debería pasar gracias al focus)
    if (!threadId) {
      console.warn('⚠️ No hay thread en sendMessage - esto no debería pasar (el focus debería haberlo creado)');

      // Crear thread de emergencia
      threadId = await this.agentChatListService.createEmptyThread();
      await this.agentChatService.sendTriggerMessage(threadId);
      console.log('✨ Thread de emergencia creado:', threadId);
    }

    // Verificar si alcanzó el máximo de threads ANTES de enviar el mensaje
    const threads = this.agentChatListService.getThreads();
    const maxThreads = this.agentChatListService.getMaxThreads();

    if (threads.length > maxThreads) {
      // Hay más threads que el máximo permitido (porque se creó uno en el focus)
      console.log('⚠️ Máximo de threads alcanzado. Mostrando alert...');

      const confirmed = confirm(
        'Maximum session limit reached. Send anyway? Your oldest conversation will be deleted.'
      );

      if (!confirmed) {
        // Usuario canceló - BORRAR el thread actual (creado en el focus)
        console.log('❌ Usuario canceló - eliminando thread actual');
        await this.agentChatListService.deleteThread(threadId);

        // También borrar del backend
        this.agentChatService.clearChatHistory(threadId).subscribe({
          next: () => console.log('✅ Thread eliminado del backend'),
          error: (err) => console.error('❌ Error al eliminar thread del backend:', err)
        });

        return;
      }

      // Usuario aceptó - borrar el thread más antiguo
      const deletedThread = await this.agentChatListService.deleteOldestThread();
      console.log('🗑️ Thread más antiguo eliminado:', deletedThread?.name);

      // También borrar del backend
      if (deletedThread) {
        this.agentChatService.clearChatHistory(deletedThread.threadId).subscribe({
          next: () => console.log('✅ Thread más antiguo eliminado del backend'),
          error: (err) => console.error('❌ Error al eliminar thread del backend:', err)
        });
      }
    }

    // Si el thread se llama ". . .", renombrarlo con el primer mensaje
    const currentThread = threads.find(t => t.threadId === threadId);
    if (currentThread && currentThread.name === '. . .') {
      console.log('📝 Renombrando thread ". . ." con el primer mensaje');
      await this.agentChatListService.renameThread(threadId, message.substring(0, 50));
    }

    // Mover el thread al principio
    await this.agentChatListService.moveThreadToTop(threadId);

    this.loadingResponse = true;

    if (showUserMessage) {
      this.chatMessages.push({ role: "user", message });
    }

    console.log('📤 Mensaje enviado:', message);
    console.log('🔵 ThreadId usado:', threadId);

    // Crear el mensaje del asistente vacío
    const responseMessage = { role: "assistant", message: "" };
    this.chatMessages.push(responseMessage);
    const responseIndex = this.chatMessages.length - 1;

    // Usar el servicio para el streaming
    // Si speakIsEnabled está activo, pasar la voz seleccionada para TTS del backend
    const voiceParam = this.speakIsEnabled ? this.selectedVoice : undefined;

    this.agentChatService.streamResponse(
      message,
      threadId,
      responseIndex,
      this.chatMessages,
      (content) => {
        // Callback cuando llega contenido - forzar detección de cambios
        this.chatMessages = [...this.chatMessages];
        // 💾 Guardar en caché cada vez que llega contenido
        this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
      },
      (loading) => {
        this.loadingResponse = loading;
        // 💾 Guardar en caché cuando termina el loading
        if (!loading) {
          this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
        }
      },
      () => this.scrollToBottom(),
      // Solo usar browser TTS si NO está habilitado el TTS del backend
      // Cuando speakIsEnabled=true, el backend envía audios que se reproducen via enqueueAudio
      (_text) => {
        // No hacer nada - el TTS del backend maneja la reproducción via audio events
      },
      (_errorMessage) => {
        // Callback de error - forzar detección de cambios
        this.chatMessages = [...this.chatMessages];
        // 💾 Guardar en caché incluso si hay error
        this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
      },
      (state) => {
        // 🎯 Callback cuando cambia el estado del agente
        console.log('🔄 Actualizando estado del agente a:', state);
        this.currentAgentState.set(state as AgentState);
      },
      voiceParam // 🔊 Pasar voz si TTS está habilitado
    );

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


  toggleSpeak(): void {
    this.speakIsEnabled = !this.speakIsEnabled;
    console.log('🔊 TTS está ==> ' + this.speakIsEnabled);

    // Si se desactiva TTS, detener cualquier audio en reproducción
    if (!this.speakIsEnabled) {
      this.agentChatService.stopAudioPlayback();
    }
  }

  async clearChatHistory(): Promise<void> {
    const threadId = this.agentChatListService.getCurrentThreadId();
    if (!threadId) {
      console.error('❌ No hay threadId seleccionado');
      return;
    }

    console.log('🗑️ Eliminando thread completamente:', threadId);

    // Detener cualquier audio en reproducción
    this.agentChatService.stopAudioPlayback();

    // Limpiar mensajes en el frontend inmediatamente
    this.chatMessages = [];

    // Resetear estado del agente a 'chat'
    this.currentAgentState.set('chat');

    // Eliminar el thread de la lista (también limpia caché y deselecciona)
    await this.agentChatListService.deleteThread(threadId);

    // Llamar al servicio para borrar el historial del thread en el backend
    this.agentChatService.clearChatHistory(threadId).subscribe({
      next: (response) => {
        console.log('✅ Thread eliminado del backend:', response);

        if (response.status === 'deleted') {
          console.log(`🗑️ Checkpoints eliminados: ${response.checkpoints_deleted}`);
          console.log(`🗑️ Writes eliminados: ${response.writes_deleted}`);
        } else if (response.status === 'not_found') {
          console.log('ℹ️ Thread no encontrado en la base de datos');
        }
      },
      error: (err) => {
        console.error('❌ Error al borrar thread del backend:', err);
        // El thread ya fue eliminado del frontend y Firestore
      }
    });

    // 🎯 Crear nuevo thread inmediatamente y enviar trigger silencioso
    // Esto permite que el backend precargue datos mientras el usuario escribe
    console.log('🚀 Creando nuevo thread con trigger para precargar backend...');
    await this.createNewThreadWithTrigger();
  }

  // Nueva función para reproducir texto como voz
  speakText(text: string): void {
    console.log("in Speack TEXT ==>" + text);
    
    // if (!this.speakIsEnabled) return; // No reproducir si TTS está desactivado

    // VERY IMPORTANT ===> Clean the tail ==>  LIMPIAR LA COLA DE SPEECH!!!
    window.speechSynthesis.cancel(); // clean the reproduction queu
    if (!this.speakIsEnabled) return; // No reproducir si TTS está desactivado

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Idioma Inglés (puedes cambiar a 'es-US' u otros)
    utterance.volume = 1; // Volumen (0 a 1)
    utterance.rate = 1; // Velocidad (0.1 a 10)
    utterance.pitch = 0.5; // Tono (0 a 2)

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

  // testElChabon() {
  //   const test = this.agentChatService.tester()
  //   console.log(test);
  // }

  // ==================== STT Methods ====================

  /**
   * Toggle de grabación - inicia o detiene según el estado actual
   */
  toggleRecording(): void {
    // Desbloquear AudioContext sincrónicamente dentro del gesture handler (requerido por Chrome/Android)
    if (this.speakIsEnabled) this.agentChatService.unlockAudioContext();
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Inicia la grabación de audio usando MediaRecorder
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('🎤 Audio grabado:', audioBlob.size, 'bytes');

        // Detener todos los tracks del stream
        stream.getTracks().forEach(track => track.stop());

        // Enviar el audio
        this.sendAudioMessage(audioBlob);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      console.log('🔴 Grabación iniciada');

    } catch (error) {
      console.error('❌ Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  }

  /**
   * Detiene la grabación de audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      console.log('⏹️ Grabación detenida');
    }
  }

  /**
   * Envía el audio al backend y procesa la respuesta streaming
   */
  async sendAudioMessage(audioBlob: Blob): Promise<void> {
    // Obtener el threadId actual del servicio
    let threadId = this.agentChatListService.getCurrentThreadId();

    // Si no hay thread, crear uno
    if (!threadId) {
      console.warn('⚠️ No hay thread para audio - creando uno nuevo');
      threadId = await this.agentChatListService.createEmptyThread();
      await this.agentChatService.sendTriggerMessage(threadId);
    }

    // Verificar límite de threads (similar a sendMessage)
    const threads = this.agentChatListService.getThreads();
    const maxThreads = this.agentChatListService.getMaxThreads();

    if (threads.length > maxThreads) {
      const confirmed = confirm(
        'Maximum session limit reached. Send anyway? Your oldest conversation will be deleted.'
      );

      if (!confirmed) {
        await this.agentChatListService.deleteThread(threadId);
        this.agentChatService.clearChatHistory(threadId).subscribe();
        return;
      }

      const deletedThread = await this.agentChatListService.deleteOldestThread();
      if (deletedThread) {
        this.agentChatService.clearChatHistory(deletedThread.threadId).subscribe();
      }
    }

    // Mover el thread al principio
    await this.agentChatListService.moveThreadToTop(threadId);

    this.loadingResponse = true;

    // Crear placeholder para el mensaje del usuario (se llenará con la transcripción)
    const userMessageIndex = this.chatMessages.length;
    this.chatMessages.push({ role: "user", message: "🎤 ..." });

    // Crear el mensaje del asistente vacío
    const responseMessage = { role: "assistant", message: "" };
    this.chatMessages.push(responseMessage);
    const responseIndex = this.chatMessages.length - 1;

    console.log('📤 Enviando audio...');
    console.log('🔵 ThreadId usado:', threadId);

    // Si speakIsEnabled está activo, pasar la voz seleccionada para TTS del backend
    const voiceParam = this.speakIsEnabled ? this.selectedVoice : undefined;

    // Usar el servicio para el streaming de audio
    this.agentChatService.streamAudioResponse(
      audioBlob,
      threadId,
      responseIndex,
      this.chatMessages,
      // onTranscription - cuando llega el texto transcrito
      (transcribedText) => {
        console.log('📝 Texto transcrito:', transcribedText);
        this.chatMessages[userMessageIndex].message = transcribedText;

        // Renombrar thread si es necesario
        const currentThread = threads.find(t => t.threadId === threadId);
        if (currentThread && currentThread.name === '. . .') {
          this.agentChatListService.renameThread(threadId, transcribedText.substring(0, 50));
        }

        this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
        this.cdr.detectChanges(); // Forzar detección de cambios
      },
      // onContentReceived
      (_content) => {
        this.cdr.detectChanges(); // Forzar detección de cambios
        this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
      },
      // onLoadingChange
      (loading) => {
        this.loadingResponse = loading;
        if (!loading) {
          this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
        }
        this.cdr.detectChanges();
      },
      // onScroll
      () => this.scrollToBottom(),
      // onSpeakText - No usar browser TTS, el backend maneja audio si está habilitado
      (_text) => {},
      // onError
      (_errorMessage) => {
        this.cdr.detectChanges();
        this.agentChatListService.saveMessagesToCache(threadId, this.chatMessages);
      },
      // onStateChange
      (state) => {
        console.log('🔄 Actualizando estado del agente a:', state);
        this.currentAgentState.set(state as AgentState);
        this.cdr.detectChanges();
      },
      undefined, // language
      voiceParam // 🔊 Pasar voz si TTS está habilitado
    );

    setTimeout(() => {
      this.scrollToBottomFromArrow();
    }, 100);
  }

}
