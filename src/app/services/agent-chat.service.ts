import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ChatMessage, ThreadHistoryResponse } from '@models/chatMessage';
import { AuthService } from '@services/auth.service';
import { RecruiterService } from '@services/recruiter.service';
import { AgentChatListService } from '@services/agent-chat-list.service';

@Injectable({
  providedIn: 'root'
})
export class AgentChatService {

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private recruiterService = inject(RecruiterService);
  private agentChatListService = inject(AgentChatListService);

  constructor() {
    const recruiter = this.recruiterService.recruiterSig()
    console.log(recruiter);
  }


  // AbortController del stream activo (texto o audio)
  private currentAbortController: AbortController | null = null;

  // Flag para cancelar callbacks de audio ya programados
  private audioPlaybackActive = false;

  // Cola de audios para reproducción secuencial (ordenada por sequence)
  private audioQueue: { sequence: number; data: string; isBase64: boolean }[] = [];
  readonly isPlayingAudioSig = signal(false);
  private get isPlayingAudio() { return this.isPlayingAudioSig(); }
  private set isPlayingAudio(val: boolean) { this.isPlayingAudioSig.set(val); }
  private expectedSequence = 1;
  private streamEnded = false;

  // Web Audio API para reproducción gapless (sin gap entre chunks MP3)
  private audioContext: AudioContext | null = null;
  private nextAudioStartTime = 0;
  // Cuántos segundos adelantar el inicio del siguiente audio para cubrir el silencio final del MP3.
  
  // Ajustar según el backend: subir si aún se escucha silencio, bajar si se corta el contenido.
  private readonly OVERLAP_SECONDS = environment.OVERLAP_SECONDS_AUDIO_SILENCE;

  /**
   * Envía un mensaje y recibe la respuesta en modo streaming
   * @param message - Mensaje a enviar
   * @param threadId - ID del thread (conversación)
   * @param responseIndex - Índice del mensaje de respuesta en el array
   * @param chatMessages - Referencia al array de mensajes
   * @param onLoadingChange - Callback para cambiar el estado de loading
   * @param onScroll - Callback para hacer scroll
   * @param onSpeakText - Callback para reproducir texto (fallback browser TTS)
   * @param onStateChange - Callback para notificar cambio de estado del agente
   * @param voice - Voz del backend TTS (af_heart, em_alex, ef_dora, ff_siwis)
   */
  streamResponse(
    message: string,
    threadId: string,
    responseIndex: number,
    chatMessages: ChatMessage[],
    onContentReceived: (content: string) => void,
    onLoadingChange: (loading: boolean) => void,
    onScroll: () => void,
    onSpeakText: (text: string) => void,
    onError: (errorMessage: string) => void,
    onStateChange?: (state: string) => void,
    voice?: string,
    onStreamComplete?: () => void
  ): void {
    console.log('🔵 Usando threadId:', threadId);

    // ⏱️ Timestamp para medir timing de eventos
    const streamStartTime = Date.now();
    const getElapsed = () => `[${Date.now() - streamStartTime}ms]`;

    // Abortar stream anterior si aún estaba corriendo
    this.currentAbortController?.abort();

    // Limpiar cola de audios anterior y resetear estado
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.expectedSequence = 1;
    this.streamEnded = false;
    this.nextAudioStartTime = 0;
    this.audioPlaybackActive = true;

    // Crear AbortController para este stream
    this.currentAbortController = new AbortController();

    // Construir URL con voice si está definido
    let url = `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/stream`;
    if (voice) {
      url += `?voice=${voice}`;
      console.log('🔊 TTS habilitado con voz:', voice);
    }
    console.log(`⏱️ ${getElapsed()} Stream iniciando...`);

    fetch(url, {
      method: 'POST',
      signal: this.currentAbortController.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        recruiterId: this.authService.getCurrentUserId(),
        max_threads: this.agentChatListService.getMaxThreads()  // 👈 Obtenido del servicio según subscription
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstContentReceived = false;

      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            console.log(`⏱️ ${getElapsed()} ✅ Stream completado`);
            console.log("📝 Mensaje completo:", chatMessages[responseIndex].message);
            const the_message_finished = chatMessages[responseIndex].message;

            if (typeof the_message_finished === 'string' && the_message_finished.trim() !== '') {
              // Solo llamar browser TTS si el backend NO está manejando el audio (voice no definida)
              if (!voice) {
                console.log("🔊 LLAMANDO A browser TTS con:", the_message_finished.substring(0, 50) + "...");
                onSpeakText(the_message_finished);
              }
              onLoadingChange(false);
              onStreamComplete?.();
            } else {
              // Stream cerró sin contenido - asegurarse de quitar el loading para no quedar colgado
              console.warn("⚠️ Stream cerró sin contenido - forzando fin de loading");
              chatMessages[responseIndex].message = "⚠️ No se recibió respuesta. Por favor, intenta de nuevo.";
              onLoadingChange(false);
              onError("Empty response from server");
              onStreamComplete?.();
            }
            return;
          }

          // Decodificar el chunk
          buffer += decoder.decode(value, { stream: true });

          // Procesar líneas completas
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                console.log(`⏱️ ${getElapsed()} 📨 Evento:`, data.type, data);

                if (data.type === 'start') {
                  // Evento de inicio - indica si voice está habilitado
                  console.log(`⏱️ ${getElapsed()} 🎬 Stream iniciado. Voice enabled:`, data.voice_enabled);
                } else if (data.type === 'content') {
                  // Detener el loading cuando llega el primer contenido
                  if (!firstContentReceived) {
                    onLoadingChange(false);
                    firstContentReceived = true;
                    console.log('🚀 Primer contenido recibido - loading detenido');
                  }

                  // 🔍 DEBUG: Ver qué contenido llega del backend
                  console.log(`⏱️ ${getElapsed()} 📦 CONTENT:`, data.content);

                  // ⚠️ IMPORTANTE: El backend envía el mensaje completo al final
                  // Si el chunk es igual al mensaje actual, NO agregarlo (evitar duplicado)
                  const currentMessage = chatMessages[responseIndex].message || '';

                  if (data.content === currentMessage) {
                    console.log('⚠️ Chunk duplicado detectado (mensaje completo) - IGNORADO');
                    continue; // Saltar esta iteración del loop, no terminar toda la función
                  }

                  chatMessages[responseIndex].message += data.content;

                  // 📡 Capturar estado del agente si viene en el chunk
                  if (data.state && onStateChange) {
                    console.log('🎯 Estado del agente recibido:', data.state);
                    onStateChange(data.state);
                  }

                  onContentReceived(data.content);
                  onScroll();
                } else if (data.type === 'audio') {
                  // 🔊 Audio del TTS del backend (soporta URL o base64)
                  if (data.audio) {
                    // Nuevo formato: base64
                    console.log(`⏱️ ${getElapsed()} 🔊 AUDIO #${data.sequence}: base64`);
                    this.enqueueAudio(data.sequence, data.audio, true);
                  } else if (data.url) {
                    // Formato antiguo: URL
                    console.log(`⏱️ ${getElapsed()} 🔊 AUDIO #${data.sequence}:`, data.url);
                    const audioUrl = `${environment.BACK_AGENT_BRIDGE}${data.url}`;
                    this.enqueueAudio(data.sequence, audioUrl, false);
                  }
                } else if (data.type === 'end') {
                  // Fin del stream - marcar y comenzar reproducción ordenada
                  console.log(`⏱️ ${getElapsed()} 🏁 END - Total audios:`, data.audio_count);
                  this.onStreamEnd();
                } else if (data.type === 'state_change') {
                  // 🔄 Evento de cambio de estado
                  console.log('🔄 Cambio de estado detectado:', data.new_state);
                  if (onStateChange) {
                    onStateChange(data.new_state);
                  }
                } else if (data.type === 'cancelled') {
                  console.log('⏹️ Backend confirmó cancelación del stream');
                  onLoadingChange(false);
                  onStreamComplete?.();
                  return; // No procesar más chunks
                } else if (data.type === 'error') {
                  console.error('❌ Error del servidor:', data.message);
                  chatMessages[responseIndex].message = "Error getting response. Please try again.";
                  onError("Error getting response. Please try again.");
                  onLoadingChange(false);
                }
              } catch (e) {
                console.error('Error parsing JSON:', e, line);
              }
            }
          }

          readStream();
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.log('⏹️ readStream abortado por el usuario');
            onLoadingChange(false);
            onStreamComplete?.();
            return;
          }
          console.error('❌ Error en stream:', error);
          chatMessages[responseIndex].message = "Error getting response. Please try again.";
          onError("Error getting response. Please try again.");
          onLoadingChange(false);
        });
      };

      readStream();
    })
    .catch(async error => {
      if (error.name === 'AbortError') {
        console.log('⏹️ Stream cancelado por el usuario');
        onLoadingChange(false);
        onStreamComplete?.();
        return;
      }

      console.error('❌ Error en fetch:', error);

      // Verificar si el mensaje del usuario se guardó consultando el historial
      try {
        console.log('🔍 Verificando si el mensaje se guardó en el backend...');

        const history = await firstValueFrom(
          this.http.get<any>(
            `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/history`,
            { params: { limit: '5' } }  // Solo los últimos 5 mensajes
          )
        );

        const messages = history?.messages || [];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.role === 'user' && lastMessage?.message === message) {
          // ✅ El mensaje SÍ se guardó, solo falló la respuesta del agente
          console.log('✅ Mensaje guardado en backend - solo falló la respuesta del agente');
          chatMessages[responseIndex].message =
            "⚠️ Tu mensaje fue recibido, pero la respuesta se interrumpió. Por favor, pregunta de nuevo.";
        } else {
          // ❌ El mensaje NO se guardó
          console.log('❌ Mensaje NO guardado en backend');
          chatMessages[responseIndex].message =
            "❌ Error al enviar el mensaje. Por favor, intenta de nuevo.";
        }
      } catch (verifyError) {
        // No pudimos verificar (backend completamente caído)
        console.error('❌ No se pudo verificar el estado del mensaje:', verifyError);
        chatMessages[responseIndex].message =
          "❌ Error de conexión. Verifica tu internet e intenta de nuevo.";
      }

      onError("Error in stream");
      onLoadingChange(false);
      onStreamComplete?.();
    });
  }

  /**
   * Envía un mensaje sin streaming (método alternativo)
   * @param message - Mensaje a enviar
   * @param chatMessages - Referencia al array de mensajes
   * @param onLoadingChange - Callback para cambiar el estado de loading
   * @param onScroll - Callback para hacer scroll
   * @param onSpeakText - Callback para reproducir texto
   */
  sendMessageNoStream(
    message: string,
    chatMessages: ChatMessage[],
    onLoadingChange: (loading: boolean) => void,
    onScroll: () => void,
    onSpeakText: (text: string) => void
  ): void {
    const formData = {
      message: message
    };

    this.http.post<string>(`${environment.BACK_AGENT_BRIDGE}/chat_agent/5858`, formData)
      .subscribe({
        next: (response: string) => {
          console.log('✅ Respuesta recibida:', response);
          console.log('📦 Tipo de respuesta:', typeof response);
          console.log('📏 Longitud:', response?.length);

          // Actualizar el último elemento del array
          const index = chatMessages.length - 1;
          chatMessages[index] = {
            role: "assistant",
            message: response.trim()
          };

          console.log('💬 Mensaje actualizado');
          console.log('📊 chatMessages después de actualizar:', chatMessages);

          onLoadingChange(false);

          setTimeout(() => onScroll(), 10);
          onSpeakText(response);
        },
        error: (err) => {
          console.error('❌ Error:', err);
          const index = chatMessages.length - 1;
          chatMessages[index] = {
            role: "assistant",
            message: "Error getting response. Please try again."
          };
          onLoadingChange(false);
        }
      });
  }

  /**
   * Limpia el historial del chat eliminando todos los checkpoints del thread
   * @param threadId - ID del thread a limpiar (por defecto '5858')
   * @returns Observable con la respuesta del servidor
   */
  clearChatHistory(threadId: string = '5858') {
    const url = `${environment.BACK_AGENT_BRIDGE}/threads/${threadId}`;

    console.log('🗑️ Limpiando historial del thread:', threadId);

    return this.http.delete<{
      status: string;
      thread_id: string;
      checkpoints_deleted?: number;
      writes_deleted?: number;
      message?: string;
    }>(url);
  }

  /**
   * Obtiene el historial de mensajes de un thread desde el backend
   * @param threadId - ID del thread
   * @param limit - Límite de mensajes a obtener (por defecto 50)
   * @returns Observable con el historial de mensajes (con campos adicionales desde backend v2.0.0)
   */
  getThreadHistory(threadId: string, limit: number = 50) {
    const url = `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/history`;

    console.log('📜 Obteniendo historial del thread:', threadId, 'Límite:', limit);

    return this.http.get<ThreadHistoryResponse>(url, {
      params: { limit: limit.toString() }
    });
  }

  /**
   * Envía un audio al endpoint UNIFICADO y recibe la respuesta en modo streaming SSE
   * NUEVO: Usa /chat_agent/{chat_id}/stream con FormData (mismo endpoint que texto)
   * El backend primero envía la transcripción, luego la respuesta del agente
   * @param audioBlob - Blob del audio grabado
   * @param threadId - ID del thread (conversación)
   * @param responseIndex - Índice del mensaje de respuesta en el array
   * @param chatMessages - Referencia al array de mensajes
   * @param onTranscription - Callback cuando llega la transcripción del audio
   * @param onContentReceived - Callback cuando llega contenido del agente
   * @param onLoadingChange - Callback para cambiar el estado de loading
   * @param onScroll - Callback para hacer scroll
   * @param onSpeakText - Callback para reproducir texto
   * @param onError - Callback para manejar errores
   * @param onStateChange - Callback para notificar cambio de estado del agente
   * @param language - Idioma opcional para la transcripción ("es", "en", "fr")
   * @param voice - Voz del backend TTS (af_heart, em_alex, ef_dora, ff_siwis)
   */
  streamAudioResponse(
    audioBlob: Blob,
    threadId: string,
    responseIndex: number,
    chatMessages: ChatMessage[],
    onTranscription: (text: string) => void,
    onContentReceived: (content: string) => void,
    onLoadingChange: (loading: boolean) => void,
    onScroll: () => void,
    onSpeakText: (text: string) => void,
    onError: (errorMessage: string) => void,
    onStateChange?: (state: string) => void,
    language?: string,
    voice?: string,
    onStreamComplete?: () => void
  ): void {
    console.log('🎤 Enviando audio al thread (endpoint unificado):', threadId);

    // ⏱️ Timestamp para medir timing de eventos
    const streamStartTime = Date.now();
    const getElapsed = () => `[${Date.now() - streamStartTime}ms]`;

    // Abortar stream anterior si aún estaba corriendo
    this.currentAbortController?.abort();

    // Limpiar cola de audios anterior y resetear estado
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.expectedSequence = 1;
    this.streamEnded = false;
    this.nextAudioStartTime = 0;
    this.audioPlaybackActive = true;

    // 🆕 ENDPOINT UNIFICADO: /chat_agent/{chat_id}/stream con query params
    let url = `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/stream`;
    if (voice) {
      url += `?voice=${voice}`;
      console.log('🔊 Audio TTS habilitado con voz:', voice);
    }

    // 🆕 FormData para audio (NO Content-Type header, FormData lo setea automáticamente)
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('recruiterId', this.authService.getCurrentUserId() || '');
    formData.append('max_threads', this.agentChatListService.getMaxThreads().toString());
    if (language) {
      formData.append('language', language);
    }

    // Crear AbortController para este stream
    this.currentAbortController = new AbortController();

    console.log(`⏱️ ${getElapsed()} Stream de audio iniciando...`);

    fetch(url, {
      method: 'POST',
      signal: this.currentAbortController.signal,
      body: formData  // NO Content-Type header, FormData lo setea automáticamente
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstContentReceived = false;

      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            console.log(`⏱️ ${getElapsed()} ✅ Audio stream completado`);
            const the_message_finished = chatMessages[responseIndex].message;

            if (typeof the_message_finished === 'string' && the_message_finished.trim() !== '') {
              onSpeakText(the_message_finished);
            }
            onLoadingChange(false);
            onStreamComplete?.();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.type === 'transcription') {
                  // 🆕 Transcripción del audio del usuario (llega PRIMERO)
                  console.log(`⏱️ ${getElapsed()} 📝 Transcripción recibida:`, data.text);
                  onTranscription(data.text);
                  onScroll();
                } else if (data.type === 'start') {
                  // Evento de inicio
                  console.log(`⏱️ ${getElapsed()} 🎬 Stream iniciado. Voice enabled:`, data.voice_enabled);
                } else if (data.type === 'content') {
                  // Respuesta del agente
                  if (!firstContentReceived) {
                    onLoadingChange(false);
                    firstContentReceived = true;
                    console.log(`⏱️ ${getElapsed()} 🚀 Primer contenido del agente recibido`);
                  }

                  const content = data.content || '';
                  const currentMessage = chatMessages[responseIndex].message || '';

                  if (content === currentMessage) {
                    console.log('⚠️ Chunk duplicado detectado - IGNORADO');
                    continue;
                  }

                  chatMessages[responseIndex].message += content;

                  if (data.state && onStateChange) {
                    console.log('🎯 Estado del agente recibido:', data.state);
                    onStateChange(data.state);
                  }

                  onContentReceived(content);
                  onScroll();
                } else if (data.type === 'audio') {
                  // 🔊 Audio del TTS del backend (soporta base64 o URL)
                  if (data.audio) {
                    console.log(`⏱️ ${getElapsed()} 🔊 AUDIO #${data.sequence}: base64`);
                    this.enqueueAudio(data.sequence, data.audio, true);
                  } else if (data.url) {
                    console.log(`⏱️ ${getElapsed()} 🔊 AUDIO #${data.sequence}:`, data.url);
                    const audioUrl = `${environment.BACK_AGENT_BRIDGE}${data.url}`;
                    this.enqueueAudio(data.sequence, audioUrl, false);
                  }
                } else if (data.type === 'end') {
                  // Fin del stream
                  console.log(`⏱️ ${getElapsed()} 🏁 END`);
                  this.onStreamEnd();
                } else if (data.type === 'state_change') {
                  console.log('🔄 Cambio de estado detectado:', data.new_state);
                  if (onStateChange) {
                    onStateChange(data.new_state);
                  }
                } else if (data.type === 'cancelled') {
                  console.log('⏹️ Backend confirmó cancelación del stream de audio');
                  onLoadingChange(false);
                  onStreamComplete?.();
                  return;
                } else if (data.type === 'error') {
                  console.error('❌ Error del servidor:', data.message);
                  chatMessages[responseIndex].message = "Error getting response. Please try again.";
                  onError("Error getting response. Please try again.");
                  onLoadingChange(false);
                }
              } catch (e) {
                console.error('Error parsing JSON:', e, line);
              }
            }
          }

          readStream();
        }).catch(error => {
          if (error.name === 'AbortError') {
            console.log('⏹️ readStream de audio abortado por el usuario');
            onLoadingChange(false);
            onStreamComplete?.();
            return;
          }
          console.error('❌ Error en audio stream:', error);
          chatMessages[responseIndex].message = "Error getting response. Please try again.";
          onError("Error getting response. Please try again.");
          onLoadingChange(false);
        });
      };

      readStream();
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('⏹️ Stream de audio cancelado por el usuario');
        onLoadingChange(false);
        onStreamComplete?.();
        return;
      }
      console.error('❌ Error en fetch de audio:', error);
      chatMessages[responseIndex].message = "❌ Error al enviar el audio. Por favor, intenta de nuevo.";
      onError("Error sending audio");
      onLoadingChange(false);
      onStreamComplete?.();
    });
  }

  /**
   * Envía el mensaje trigger "start-loading-state" al backend
   * para que cargue el state inicial del agente con datos de la DB
   * @param threadId - ID del thread que se está iniciando
   * @returns Promise que se resuelve cuando el trigger fue enviado
   */
  async sendTriggerMessage(threadId: string): Promise<void> {
    const url = `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/stream`;

    console.log('🔔 Enviando mensaje trigger para cargar state del thread:', threadId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'start-loading-state',
          recruiterId: this.authService.getCurrentUserId(),
          max_threads: this.agentChatListService.getMaxThreads()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Consumir el stream pero no procesarlo (no nos interesa la respuesta)
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      console.log('✅ Mensaje trigger enviado exitosamente');
    } catch (error) {
      console.error('❌ Error al enviar mensaje trigger:', error);
      // No lanzar error - es mejor que el sistema continúe aunque falle el trigger
    }
  }

  // ==================== Audio Queue Methods ====================

  /**
   * Desbloquea el AudioContext dentro del event handler del gesto del usuario.
   * Debe llamarse sincrónicamente en el click/tap handler, ANTES de cualquier await.
   * Sin esto, Chrome/Android y algunos iOS no permiten reproducir audio programáticamente.
   */
  unlockAudioContext(): void {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      // Reproducir un buffer silencioso de 1 frame — esto es lo que realmente desbloquea
      // en Android Chrome y versiones estrictas de iOS Safari
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      console.log('🔓 AudioContext desbloqueado');
    } catch (e) {
      console.warn('⚠️ No se pudo desbloquear AudioContext:', e);
    }
  }


  /**
   * Agrega un audio a la cola con su número de secuencia
   * Soporta tanto URL como base64
   * @param sequence - Número de secuencia del audio
   * @param data - URL o base64 del audio
   * @param isBase64 - true si es base64, false si es URL
   */
  private enqueueAudio(sequence: number, data: string, isBase64: boolean = false): void {
    console.log(`📥 Encolando audio #${sequence} (${isBase64 ? 'base64' : 'url'})`);
    this.audioQueue.push({ sequence, data, isBase64 });

    // Si es la secuencia esperada y no estamos reproduciendo, empezar!
    if (sequence === this.expectedSequence && !this.isPlayingAudio) {
      console.log(`🎯 Audio #${sequence} es la secuencia esperada - iniciando reproducción`);
      this.tryPlayNext();
    }
  }

  /**
   * Se llama cuando el stream termina
   * Si hay audios pendientes que no se reprodujeron, intentar reproducir
   */
  private onStreamEnd(): void {
    this.streamEnded = true;
    console.log('🏁 Stream terminado - verificando cola de audio');

    // Si no estamos reproduciendo pero hay audios, intentar reproducir
    if (!this.isPlayingAudio && this.audioQueue.length > 0) {
      this.tryPlayNext();
    }
  }

  /**
   * Intenta reproducir el siguiente audio esperado si está disponible
   */
  private tryPlayNext(): void {
    if (!this.audioPlaybackActive) return; // stop fue llamado, no continuar
    // Buscar el audio con la secuencia esperada
    const audioIndex = this.audioQueue.findIndex(a => a.sequence === this.expectedSequence);

    if (audioIndex !== -1) {
      // Encontramos el audio esperado - reproducirlo
      const audioItem = this.audioQueue.splice(audioIndex, 1)[0];
      this.playAudio(audioItem);
    } else if (this.streamEnded && this.audioQueue.length > 0) {
      // Stream terminó pero no encontramos la secuencia esperada
      // Ordenar y reproducir lo que queda (por si se perdió alguno)
      this.audioQueue.sort((a, b) => a.sequence - b.sequence);
      console.log(`⚠️ Secuencia #${this.expectedSequence} no encontrada, reproduciendo #${this.audioQueue[0].sequence}`);
      const audioItem = this.audioQueue.shift()!;
      this.expectedSequence = audioItem.sequence;
      this.playAudio(audioItem);
    } else {
      // Audio esperado aún no llegó - esperar
      console.log(`⏳ Esperando audio #${this.expectedSequence}...`);
      this.isPlayingAudio = false;
    }
  }

  /**
   * Reproduce un audio específico usando Web Audio API para reproducción gapless.
   * Schedula cada chunk en el tiempo exacto usando AudioContext, y avanza la cola
   * OVERLAP_SECONDS antes del final real del audio para cubrir el silencio final del MP3.
   */
  private async playAudio(audioItem: { sequence: number; data: string; isBase64: boolean }): Promise<void> {
    this.isPlayingAudio = true;
    console.log(`▶️ Schedulando audio #${audioItem.sequence}`);

    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const ctx = this.audioContext;

      // Obtener ArrayBuffer del audio (base64 o URL)
      let arrayBuffer: ArrayBuffer;
      if (audioItem.isBase64) {
        const binary = atob(audioItem.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        arrayBuffer = bytes.buffer;
      } else {
        const response = await fetch(audioItem.data);
        arrayBuffer = await response.arrayBuffer();
      }

      // Decodificar → AudioBuffer con duración exacta
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      console.log(`🎵 Audio #${audioItem.sequence} decodificado. Duración: ${audioBuffer.duration.toFixed(3)}s`);

      // Schedular en el tiempo correcto (encadenado al anterior)
      const startTime = Math.max(ctx.currentTime, this.nextAudioStartTime);
      this.nextAudioStartTime = startTime + audioBuffer.duration - this.OVERLAP_SECONDS;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(startTime);

      console.log(`⏰ Audio #${audioItem.sequence} → start: ${startTime.toFixed(3)}s | próximo en: ${this.nextAudioStartTime.toFixed(3)}s`);

      // Avanzar la cola OVERLAP_SECONDS antes del final real para que el siguiente
      // esté listo (y schedulado) antes de que termine el silencio del MP3
      const advanceQueueMs = (startTime - ctx.currentTime + audioBuffer.duration - this.OVERLAP_SECONDS) * 1000;
      setTimeout(() => {
        if (!this.audioPlaybackActive) return; // stop fue llamado, no continuar
        this.expectedSequence = audioItem.sequence + 1;
        this.isPlayingAudio = false;
        this.tryPlayNext();
      }, Math.max(0, advanceQueueMs));

    } catch (error) {
      console.error(`❌ Error reproduciendo audio #${audioItem.sequence}:`, error);
      this.expectedSequence = audioItem.sequence + 1;
      this.isPlayingAudio = false;
      this.tryPlayNext();
    }
  }

  /**
   * Detiene la reproducción y limpia la cola de audio
   */
  stopStream(threadId: string): void {
    // 1. Cortar el fetch activo
    this.currentAbortController?.abort();
    this.currentAbortController = null;

    // 2. Parar el audio
    this.stopAudioPlayback();

    // 3. Notificar al backend
    this.http.post(`${environment.BACK_AGENT_BRIDGE}/threads/${threadId}/cancel`, {}).subscribe({
      next: () => console.log('⏹️ Backend notificado de cancelación'),
      error: (err) => console.warn('⚠️ No se pudo notificar al backend (puede que ya haya terminado):', err)
    });
  }

  stopAudioPlayback(): void {
    this.audioQueue = [];
    this.audioPlaybackActive = false;
    this.isPlayingAudio = false;
    this.expectedSequence = 1;
    this.streamEnded = false;
    this.nextAudioStartTime = 0;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('⏹️ Reproducción de audio detenida');
  }

}
