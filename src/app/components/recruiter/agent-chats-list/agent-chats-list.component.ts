import { Component, inject } from '@angular/core';
import { VisualStatesService } from '@services/visual-states.service';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { AgentChatListService, ChatThread } from '@services/agent-chat-list.service';
import { AgentChatService } from '@services/agent-chat.service';

@Component({
  selector: 'app-agent-chats-list',
  imports: [CommonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  templateUrl: './agent-chats-list.component.html'
})
export class AgentChatsListComponent {
  visualStatesService = inject(VisualStatesService);
  agentChatListService = inject(AgentChatListService);
  agentChatService = inject(AgentChatService);

  // Obtener threads desde el servicio
  get chatThreads(): ChatThread[] {
    return this.agentChatListService.getThreads();
  }

  // Obtener el thread actual
  get currentThreadId(): string | null {
    return this.agentChatListService.getCurrentThreadId();
  }

  // Verificar si se puede crear un nuevo thread
  get canCreateNewThread(): boolean {
    const threads = this.agentChatListService.getThreads();
    const maxThreads = this.agentChatListService.getMaxThreads();
    return threads.length < maxThreads;
  }

  // Verificar si se alcanzó el máximo de threads
  get isMaxThreadsReached(): boolean {
    return !this.canCreateNewThread;
  }

  // Seleccionar un thread
  selectThread(threadId: string) {
    this.agentChatListService.selectThread(threadId);
    this.visualStatesService.triggerTextareaFocus()
  }

  // Método para el botón "ADD NEW CHAT"
  async onAddNewChat(): Promise<void> {
    if (this.isMaxThreadsReached) {
      console.log('❌ Máximo de threads alcanzado');
      return;
    }

    console.log('➕ Creando nuevo chat...');

    // 1. Cerrar el sidebar PRIMERO (mejor UX - no se ve el parpadeo)
    this.visualStatesService.handleShowChatList();

    // 2. Generar threadId
    const newThreadId = this.agentChatListService.generateThreadId();
    console.log('🆔 ThreadId generado:', newThreadId);

    try {
      // 3. Enviar trigger al backend PRIMERO (nueva arquitectura)
      await this.agentChatService.sendTriggerMessage(newThreadId);
      console.log('✅ Trigger enviado exitosamente para thread:', newThreadId);

      // 4. SOLO si el backend responde OK, crear thread en frontend/Firestore
      await this.agentChatListService.createEmptyThreadWithId(newThreadId);
      console.log('✨ Thread creado en frontend:', newThreadId);

      // 5. Focus en el textarea para que el usuario pueda escribir
      this.visualStatesService.triggerTextareaFocus();

      console.log('✅ Nuevo chat listo. Usuario puede escribir su primer mensaje.');

    } catch (error) {
      console.error('❌ Error al crear thread - backend no disponible:', error);

      // Mostrar error al usuario
      alert('El servidor no está disponible en este momento. Por favor, intenta más tarde.');

      // NO crear thread en el frontend si el backend falló
    }
  }

  // Renombrar un thread
  onRename(threadId: string): void {
    const thread = this.chatThreads.find(t => t.threadId === threadId);
    if (!thread) {
      console.error('❌ Thread no encontrado:', threadId);
      return;
    }

    const newName = prompt('Nuevo nombre para el chat:', thread.name);

    if (newName && newName.trim() !== '') {
      console.log('✏️ Renombrando thread:', threadId, 'a:', newName);
      this.agentChatListService.renameThread(threadId, newName.trim());
    } else {
      console.log('❌ Rename cancelado o nombre vacío');
    }
  }

  // Eliminar un thread
  async onDelete(threadId: string): Promise<void> {
    const thread = this.chatThreads.find(t => t.threadId === threadId);
    if (!thread) {
      console.error('❌ Thread no encontrado:', threadId);
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${thread.name}"?`);
    // const confirmed = confirm(`Estás seguro de eliminar el chat "${thread.name}"?`);

    if (confirmed) {
      console.log('🗑️ Eliminando thread:', threadId);
      await this.agentChatListService.deleteThread(threadId);

      // TODO: También eliminar del backend si es necesario
      this.agentChatService.clearChatHistory(threadId).subscribe({
        next: () => console.log('✅ Thread eliminado del backend'),
        error: (err) => console.error('❌ Error al eliminar thread del backend:', err)
      });
    } else {
      console.log('❌ Delete cancelado');
    }
  }

}
