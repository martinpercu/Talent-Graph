import { Injectable, inject } from '@angular/core';
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


  /**
   * Envía un mensaje y recibe la respuesta en modo streaming
   * @param message - Mensaje a enviar
   * @param threadId - ID del thread (conversación)
   * @param responseIndex - Índice del mensaje de respuesta en el array
   * @param chatMessages - Referencia al array de mensajes
   * @param onLoadingChange - Callback para cambiar el estado de loading
   * @param onScroll - Callback para hacer scroll
   * @param onSpeakText - Callback para reproducir texto
   * @param onStateChange - Callback para notificar cambio de estado del agente
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
    onStateChange?: (state: string) => void
  ): void {
    console.log('🔵 Usando threadId:', threadId);

    const url = `${environment.BACK_AGENT_BRIDGE}/chat_agent/${threadId}/stream`;


    fetch(url, {
      method: 'POST',
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
            console.log('✅ Stream completado');
            console.log("🎯 ACA YA TENGO TODO EL MENSAJE TERMINADO");
            console.log("📝 Mensaje completo:", chatMessages[responseIndex].message);
            const the_message_finished = chatMessages[responseIndex].message;

            if (typeof the_message_finished === 'string' && the_message_finished.trim() !== '') {
              console.log("🔊 LLAMANDO A onSpeakText con:", the_message_finished.substring(0, 50) + "...");
              onSpeakText(the_message_finished);
            } else {
              console.log("⚠️ NO se llama a onSpeakText - mensaje vacío o no es string");
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

                if (data.type === 'content') {
                  // Detener el loading cuando llega el primer contenido
                  if (!firstContentReceived) {
                    onLoadingChange(false);
                    firstContentReceived = true;
                    console.log('🚀 Primer contenido recibido - loading detenido');
                  }

                  // 🔍 DEBUG: Ver qué contenido llega del backend
                  console.log('📦 Chunk recibido:', data.content);

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
                } else if (data.type === 'state_change') {
                  // 🔄 Evento de cambio de estado
                  console.log('🔄 Cambio de estado detectado:', data.new_state);
                  if (onStateChange) {
                    onStateChange(data.new_state);
                  }
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
          console.error('❌ Error en stream:', error);
          chatMessages[responseIndex].message = "Error getting response. Please try again.";
          onError("Error getting response. Please try again.");
          onLoadingChange(false);
        });
      };

      readStream();
    })
    .catch(async error => {
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
   * Envía un audio y recibe la respuesta en modo streaming SSE
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
    language?: string
  ): void {
    console.log('🎤 Enviando audio al thread:', threadId);

    const url = `${environment.BACK_AGENT_BRIDGE}/audio/chat/${threadId}`;

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('recruiterId', this.authService.getCurrentUserId() || '');
    formData.append('max_threads', this.agentChatListService.getMaxThreads().toString());
    if (language) {
      formData.append('language', language);
    }

    fetch(url, {
      method: 'POST',
      body: formData
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
            console.log('✅ Audio stream completado');
            const the_message_finished = chatMessages[responseIndex].message;

            if (typeof the_message_finished === 'string' && the_message_finished.trim() !== '') {
              onSpeakText(the_message_finished);
            }
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
                  // Transcripción del audio del usuario
                  console.log('📝 Transcripción recibida:', data.text);
                  onTranscription(data.text);
                  onScroll();
                } else if (data.type === 'agent' || data.type === 'content') {
                  // Respuesta del agente
                  if (!firstContentReceived) {
                    onLoadingChange(false);
                    firstContentReceived = true;
                    console.log('🚀 Primer contenido del agente recibido');
                  }

                  const content = data.content || data.text || '';
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
                } else if (data.type === 'state_change') {
                  console.log('🔄 Cambio de estado detectado:', data.new_state);
                  if (onStateChange) {
                    onStateChange(data.new_state);
                  }
                } else if (data.type === 'done') {
                  console.log('✅ Stream done signal recibido');
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
          console.error('❌ Error en audio stream:', error);
          chatMessages[responseIndex].message = "Error getting response. Please try again.";
          onError("Error getting response. Please try again.");
          onLoadingChange(false);
        });
      };

      readStream();
    })
    .catch(error => {
      console.error('❌ Error en fetch de audio:', error);
      chatMessages[responseIndex].message = "❌ Error al enviar el audio. Por favor, intenta de nuevo.";
      onError("Error sending audio");
      onLoadingChange(false);
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

}
