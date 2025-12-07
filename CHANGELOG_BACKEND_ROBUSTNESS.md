# Changelog - Mejoras de Robustez Backend

## 📅 2025-12-04 - Mejoras para Manejo de Backend Caído

### 🎯 Objetivo
Implementar mejoras en el frontend para manejar correctamente escenarios donde el backend del agente está caído o no responde.

---

## ✅ Cambios Implementados

### 1. Servicio de Health Check (`backend-health.service.ts`)
- ✅ Polling automático cada 30s
- ✅ Signal reactivo con estado del backend
- ✅ Métodos: `isBackendAvailable()`, `checkNow()`

### 2. Flujo Invertido de Creación de Threads
- ✅ Backend PRIMERO → Firestore DESPUÉS
- ✅ No hay threads huérfanos en Firestore
- ✅ Rollback automático si backend falla

### 3. cleanEmptyThreads() Mejorado
- ✅ NO elimina threads en errores de red
- ✅ Solo elimina en 404 o confirmación del backend
- ✅ Protección contra pérdida de datos

### 4. Verificación de Historial en Errores
- ✅ Verifica si mensaje se guardó después de errores
- ✅ Mensajes de error específicos según el problema
- ✅ Mejor feedback al usuario

---

## 📊 Archivos Modificados

**Nuevos:**
- `src/app/services/backend-health.service.ts`

**Modificados:**
- `src/app/services/agent-chat.service.ts`
- `src/app/services/agent-chat-list.service.ts`
- `src/app/components/recruiter/agent-chat/agent-chat.component.ts`
- `src/app/components/recruiter/agent-chats-list/agent-chats-list.component.ts`

---

## 🚀 Próximos Pasos (Requieren Backend)

Cuando el backend implemente:
- `GET /health` completo
- `GET /history` con campos adicionales (exists, isEmpty, etc.)
- Error responses estructurados

---

**Ver:** `CLAUDE.md` para contexto completo del proyecto
