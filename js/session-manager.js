// js/session-manager.js
// ============================================================
// GESTOR DE SESIÓN DE ESTUDIANTE
// Persiste entre game1, game2, game3 y game4 usando localStorage
//
// CÓMO FUNCIONA:
//   1. game1 (index.html) llama SessionManager.save() al enviar el formulario
//   2. game2/game3/game4 llaman SessionManager.load() en checkStudentCode()
//   3. Todos los juegos llaman SessionManager.getLanguage() y getDifficulty()
//
// DATOS GUARDADOS:
//   - studentCode     → código único del estudiante (ej: EST001)
//   - studentName     → nombre del estudiante
//   - language        → 'es' o 'en'
//   - difficulty      → 1, 2 o 3 (número)
//   - weekNumber      → semana de intervención
//   - sessionType     → 'pre-test' | 'intervention' | 'post-test'
//   - savedAt         → timestamp ISO para expirar sesiones viejas (24h)
// ============================================================

const SESSION_KEY = 'silabas_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const SessionManager = {

  // ----------------------------------------------------------
  // GUARDAR toda la sesión del estudiante
  // Llamar desde game1.handleParticipantSubmit()
  // ----------------------------------------------------------
  save(data) {
    try {
      const payload = {
        studentCode: data.studentCode || '',
        studentName: data.studentName || '',
        language:    data.language    || 'es',
        difficulty:  parseInt(data.difficulty) || 2,
        weekNumber:  parseInt(data.weekNumber) || 1,
        sessionType: data.sessionType || 'intervention',
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      console.log('💾 SessionManager: sesión guardada →', payload);
      return true;
    } catch (e) {
      console.warn('⚠️ SessionManager.save() falló:', e);
      return false;
    }
  },

  // ----------------------------------------------------------
  // CARGAR la sesión guardada
  // Retorna el objeto o null si no existe / expiró
  // ----------------------------------------------------------
  load() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);

      // Verificar TTL (24 horas)
      if (data.savedAt) {
        const age = Date.now() - new Date(data.savedAt).getTime();
        if (age > SESSION_TTL_MS) {
          console.warn('⚠️ SessionManager: sesión expirada, eliminando');
          this.clear();
          return null;
        }
      }

      console.log('📂 SessionManager: sesión cargada →', data);
      return data;
    } catch (e) {
      console.warn('⚠️ SessionManager.load() falló:', e);
      return null;
    }
  },

  // ----------------------------------------------------------
  // ACTUALIZAR un campo específico sin borrar el resto
  // Ej: SessionManager.update({ language: 'en' })
  // ----------------------------------------------------------
  update(fields) {
    try {
      const current = this.load() || {};
      const updated = { ...current, ...fields, savedAt: new Date().toISOString() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      console.log('🔄 SessionManager: actualizado →', fields);
    } catch (e) {
      console.warn('⚠️ SessionManager.update() falló:', e);
    }
  },

  // ----------------------------------------------------------
  // GETTERS de conveniencia
  // ----------------------------------------------------------
  getLanguage()   { return (this.load() || {}).language   || 'es'; },
  getDifficulty() { return (this.load() || {}).difficulty || 2;    },
  getStudentCode(){ return (this.load() || {}).studentCode || '';  },
  getStudentName(){ return (this.load() || {}).studentName || '';  },
  getWeekNumber() { return (this.load() || {}).weekNumber  || 1;   },
  getSessionType(){ return (this.load() || {}).sessionType || 'intervention'; },

  // ----------------------------------------------------------
  // LIMPIAR (al cerrar sesión o nueva sesión nueva jornada)
  // ----------------------------------------------------------
  clear() {
    try {
      localStorage.removeItem(SESSION_KEY);
      console.log('🗑️ SessionManager: sesión borrada');
    } catch (e) { /* silencioso */ }
  },

  // ----------------------------------------------------------
  // ¿Hay una sesión activa válida?
  // ----------------------------------------------------------
  hasActiveSession() {
    return this.load() !== null;
  }
};

// Exportar para uso global (se usa como variable global en el navegador)
window.SessionManager = SessionManager;