import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '@services/auth.service';
import { RecruiterService } from '@services/recruiter.service';
import { ChatMessage } from '@models/chatMessage';

export interface ChatThread {
  threadId: string;
  name: string;  // Nombre fijo asignado al crear
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AgentChatListService {
  private authService = inject(AuthService);
  private recruiterService = inject(RecruiterService);

  private maxThreads: number = 3; // Default

  // Lista de threads
  chatThreads = signal<ChatThread[]>([]);

  // Thread seleccionado actualmente
  currentThreadId = signal<string | null>(null);

  // 💾 Caché de mensajes en memoria (se pierde al refrescar)
  private messagesCache = new Map<string, ChatMessage[]>();

  constructor() {
    this.initializeThreadsBasedOnSubscription();
  }

  // Inicializa threads según el subscription level
  private async initializeThreadsBasedOnSubscription() {
    // Obtener el subscription level y calcular maxThreads
    await this.calculateMaxThreads();

    // Obtener el recruiter actual
    const recruiter = this.recruiterService.recruiterSig();

    // Intentar cargar threads existentes desde chatsData
    if (recruiter && recruiter.chatsData && recruiter.chatsData.length > 0) {
      console.log('📦 Cargando threads existentes desde Firestore:', recruiter.chatsData);

      // Crear threads desde los datos guardados (con nombres fijos)
      const threads: ChatThread[] = recruiter.chatsData.map((chatData) => ({
        threadId: chatData.threadId,
        name: chatData.name,  // Nombre fijo guardado
        createdAt: new Date()
      }));

      this.chatThreads.set(threads);

      // NO seleccionar ningún thread - el usuario debe elegir
      console.log(`✅ ${threads.length} threads cargados desde Firestore`);
    } else {
      // No hay threads guardados - lista vacía
      console.log('📭 No hay threads existentes. Usuario debe crear uno al enviar su primer mensaje.');
      this.chatThreads.set([]);
      // NO seleccionar ningún thread
    }
  }

  // Guarda los threads con sus nombres en Firestore
  private async saveThreadsToFirestore(threads: ChatThread[]) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.error('❌ No hay userId para guardar threads');
      return;
    }

    // Convertir a formato para guardar
    const chatsData = threads.map(t => ({
      threadId: t.threadId,
      name: t.name
    }));

    try {
      await this.recruiterService.updateOneRecruiter(
        { chatsData: chatsData },
        userId
      );
      console.log('💾 Threads guardados en Firestore:', chatsData);
    } catch (error) {
      console.error('❌ Error al guardar threads en Firestore:', error);
    }
  }

  // Calcula maxThreads según subscription level
  private async calculateMaxThreads() {
    const subscriptionLevel = await this.recruiterService.currentRecruitersubcriptionLevel();
    console.log('📊 Subscription level:', subscriptionLevel);

    if (subscriptionLevel) {
      if (subscriptionLevel >= 9) {
        this.maxThreads = 20;
      } else if (subscriptionLevel >= 7) {
        this.maxThreads = 10;
      } else if (subscriptionLevel >= 5) {
        this.maxThreads = 5;
      } else if (subscriptionLevel >= 3) {
        this.maxThreads = 3;
      } else {
        this.maxThreads = 1;
      }
    } else {
      this.maxThreads = 1; // Default si no hay subscription
    }
  }

  // Genera un threadId único
  private generateThreadId(): string {
    const randomNum = Math.floor(Math.random() * 1000000); // 0 a 999999
    const userId = this.authService.getCurrentUserId();
    const shortUserId = userId!.substring(0, 6);
    return `${randomNum}_${shortUserId}`;
  }

  // Obtiene el threadId actual
  getCurrentThreadId(): string | null {
    return this.currentThreadId();
  }

  // Selecciona un thread (NO lo mueve, solo cambia la selección)
  selectThread(threadId: string | null) {
    this.currentThreadId.set(threadId);
    console.log('🎯 Thread seleccionado:', threadId);

    // NO mover el thread aquí - solo se mueve cuando el user envía un mensaje
  }

  // Deselecciona el thread actual (para modo "nuevo chat")
  deselectThread() {
    this.currentThreadId.set(null);
    console.log('🔓 Thread deseleccionado');
  }

  /**
   * Crea un nuevo thread vacío (sin mensaje) y lo agrega al principio de la lista
   * @param name - Nombre opcional para el thread (por defecto ". . .")
   * @returns El threadId del nuevo thread creado
   */
  async createEmptyThread(name: string = '. . .'): Promise<string> {
    const threadId = this.generateThreadId();

    const newThread: ChatThread = {
      threadId,
      name,
      createdAt: new Date()
    };

    console.log(`✨ Creando nuevo thread vacío: "${name}" (${threadId})`);

    // Agregar al principio de la lista
    const currentThreads = this.chatThreads();
    currentThreads.unshift(newThread);
    this.chatThreads.set([...currentThreads]);

    // Seleccionar el nuevo thread
    this.currentThreadId.set(threadId);

    // ⚠️ NO guardar en Firestore si es ". . ." (thread temporal)
    // Se guardará cuando el usuario envíe su primer mensaje y se renombre
    if (name !== '. . .') {
      await this.saveThreadsToFirestore(currentThreads);
    } else {
      console.log('⏸️ Thread temporal ". . ." NO guardado en Firestore (se guardará al renombrar)');
    }

    console.log(`✅ Thread vacío creado: "${name}"`);

    return threadId;
  }

  /**
   * Crea un nuevo thread y lo agrega al principio de la lista
   * @param firstMessage - Primer mensaje del usuario (usado para generar el nombre)
   * @returns El threadId del nuevo thread creado
   */
  async createNewThread(firstMessage: string): Promise<string> {
    const threadId = this.generateThreadId();

    // Generar nombre desde el primer mensaje (primeros 50 caracteres)
    const name = firstMessage.trim().substring(0, 50);

    const newThread: ChatThread = {
      threadId,
      name,
      createdAt: new Date()
    };

    console.log(`✨ Creando nuevo thread: "${name}" (${threadId})`);

    // Agregar al principio de la lista
    const currentThreads = this.chatThreads();
    currentThreads.unshift(newThread);
    this.chatThreads.set([...currentThreads]);

    // Seleccionar el nuevo thread
    this.currentThreadId.set(threadId);

    // Guardar en Firestore
    await this.saveThreadsToFirestore(currentThreads);

    console.log(`✅ Thread creado: "${name}"`);

    return threadId;
  }

  /**
   * Elimina un thread específico por su ID
   * @param threadId - ID del thread a eliminar
   * @returns El thread eliminado o null si no se encontró
   */
  async deleteThread(threadId: string): Promise<ChatThread | null> {
    const threads = this.chatThreads();

    // Buscar el índice del thread
    const index = threads.findIndex(t => t.threadId === threadId);

    if (index === -1) {
      console.error('❌ Thread no encontrado:', threadId);
      return null;
    }

    const deletedThread = threads[index];
    console.log(`🗑️ Eliminando thread: ${deletedThread.name} (${deletedThread.threadId})`);

    // Remover de la lista
    threads.splice(index, 1);
    this.chatThreads.set([...threads]);

    // Si era el thread seleccionado, deseleccionarlo
    if (this.currentThreadId() === threadId) {
      this.currentThreadId.set(null);
    }

    // Limpiar el caché de mensajes de ese thread
    this.clearThreadCache(threadId);

    // Guardar en Firestore
    await this.saveThreadsToFirestore(threads);

    console.log(`✅ Thread eliminado: ${deletedThread.name}`);

    return deletedThread;
  }

  /**
   * Elimina el thread más antiguo (último de la lista)
   * @returns El thread eliminado
   */
  async deleteOldestThread(): Promise<ChatThread | null> {
    const threads = this.chatThreads();

    if (threads.length === 0) {
      console.error('❌ No hay threads para eliminar');
      return null;
    }

    // El más antiguo es el último de la lista
    const oldestThread = threads[threads.length - 1];

    console.log(`🗑️ Eliminando thread más antiguo: ${oldestThread.name} (${oldestThread.threadId})`);

    // Usar el método deleteThread para mantener consistencia
    return await this.deleteThread(oldestThread.threadId);
  }

  /**
   * Renombra un thread específico
   * @param threadId - ID del thread a renombrar
   * @param newName - Nuevo nombre para el thread
   * @returns true si se renombró exitosamente, false si no se encontró
   */
  async renameThread(threadId: string, newName: string): Promise<boolean> {
    const threads = this.chatThreads();

    // Buscar el thread
    const index = threads.findIndex(t => t.threadId === threadId);

    if (index === -1) {
      console.error('❌ Thread no encontrado:', threadId);
      return false;
    }

    const oldName = threads[index].name;
    console.log(`✏️ Renombrando thread de "${oldName}" a "${newName}"`);

    // Actualizar el nombre
    threads[index].name = newName;

    // Actualizar el signal
    this.chatThreads.set([...threads]);

    // Guardar en Firestore
    await this.saveThreadsToFirestore(threads);

    console.log(`✅ Thread renombrado exitosamente`);

    return true;
  }

  // Obtiene todos los threads
  getThreads(): ChatThread[] {
    return this.chatThreads();
  }

  // Obtiene el maxThreads calculado
  getMaxThreads(): number {
    return this.maxThreads;
  }

  // Mueve un thread al principio de la lista (más reciente)
  async moveThreadToTop(threadId: string) {
    const threads = this.chatThreads();

    // Buscar el índice del thread
    const index = threads.findIndex(t => t.threadId === threadId);

    if (index === -1) {
      console.error('❌ Thread no encontrado:', threadId);
      return;
    }

    // Si ya está en la primera posición, no hacer nada
    if (index === 0) {
      console.log('✅ Thread ya está en la primera posición');
      return;
    }

    console.log(`📌 Moviendo thread "${threads[index].name}" de posición ${index + 1} a posición 1`);

    // Remover el thread de su posición actual
    const [movedThread] = threads.splice(index, 1);

    // Insertar al principio
    threads.unshift(movedThread);

    // NO recalcular nombres - mantener los nombres fijos
    // Simplemente reordenar el array

    // Actualizar el signal
    this.chatThreads.set([...threads]);

    // Guardar el nuevo orden en Firestore
    await this.saveThreadsToFirestore(threads);

    console.log('🔄 Lista de threads reordenada y guardada (nombres fijos mantenidos)');
  }

  // 💾 MÉTODOS DE CACHÉ DE MENSAJES

  /**
   * Obtiene los mensajes del caché para un threadId
   * @param threadId - ID del thread
   * @returns Array de mensajes o array vacío si no existe en caché
   */
  getMessagesFromCache(threadId: string): ChatMessage[] {
    const messages = this.messagesCache.get(threadId);
    if (messages) {
      console.log(`💾 Mensajes cargados desde caché para thread: ${threadId}`, messages.length);
      return messages;
    }
    console.log(`📭 No hay mensajes en caché para thread: ${threadId}`);
    return [];
  }

  /**
   * Guarda mensajes en el caché para un threadId
   * @param threadId - ID del thread
   * @param messages - Array de mensajes a guardar
   */
  saveMessagesToCache(threadId: string, messages: ChatMessage[]): void {
    this.messagesCache.set(threadId, [...messages]);
    console.log(`💾 Mensajes guardados en caché para thread: ${threadId}`, messages.length);
  }

  /**
   * Agrega un mensaje al caché de un thread específico
   * @param threadId - ID del thread
   * @param message - Mensaje a agregar
   */
  addMessageToCache(threadId: string, message: ChatMessage): void {
    const existingMessages = this.messagesCache.get(threadId) || [];
    existingMessages.push(message);
    this.messagesCache.set(threadId, existingMessages);
    console.log(`➕ Mensaje agregado al caché del thread: ${threadId}`);
  }

  /**
   * Limpia el caché de mensajes de un thread específico
   * @param threadId - ID del thread
   */
  clearThreadCache(threadId: string): void {
    this.messagesCache.delete(threadId);
    console.log(`🗑️ Caché limpiado para thread: ${threadId}`);
  }

  /**
   * Limpia todo el caché de mensajes
   */
  clearAllCache(): void {
    this.messagesCache.clear();
    console.log('🗑️ Todo el caché de mensajes ha sido limpiado');
  }

}
