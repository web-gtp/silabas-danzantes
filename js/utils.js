// frontend/js/utils.js
// Funciones utilitarias compartidas

/**
 * UTILIDADES DE TIEMPO
 */

class TimeTracker {
  constructor() {
    this.startTime = null;
    this.reactionTimes = [];
  }

  start() {
    this.startTime = Date.now();
  }

  recordReaction() {
    if (this.startTime) {
      const reactionTime = Date.now() - this.startTime;
      this.reactionTimes.push(reactionTime);
      this.startTime = null;
      return reactionTime;
    }
    return 0;
  }

  getAverageReactionTime() {
    if (this.reactionTimes.length === 0) return 0;
    const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.reactionTimes.length);
  }

  reset() {
    this.reactionTimes = [];
    this.startTime = null;
  }
}

/**
 * UTILIDADES DE AUDIO
 */

class AudioManager {
  constructor() {
    this.audioElement = document.getElementById('audioElement');
    this.isPlaying = false;
  }

  async playAudio(audioPath) {
    return new Promise((resolve, reject) => {
      try {
        this.audioElement.src = audioPath;
        this.isPlaying = true;

        this.audioElement.onended = () => {
          this.isPlaying = false;
          resolve();
        };

        this.audioElement.onerror = (error) => {
          this.isPlaying = false;
          Logger.error('Error reproduciendo audio', error);
          reject(error);
        };

        this.audioElement.play().catch((error) => {
          this.isPlaying = false;
          Logger.error('Error en play()', error);
          reject(error);
        });

      } catch (error) {
        Logger.error('Error en playAudio', error);
        reject(error);
      }
    });
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }
}

/**
 * UTILIDADES DE VALIDACIÓN
 */

const ValidationUtils = {
  /**
   * Valida si la respuesta del usuario es correcta
   */
  isValidResponse(selectedSyllables, correctSyllables) {
    if (!selectedSyllables || !correctSyllables) {
      Logger.error('Sílabas inválidas', { selectedSyllables, correctSyllables });
      return false;
    }

    if (selectedSyllables.length !== correctSyllables.length) {
      Logger.log(`Longitud incorrecta: ${selectedSyllables.length} vs ${correctSyllables.length}`);
      return false;
    }

    const isCorrect = selectedSyllables.every(
      (syllable, index) => syllable === correctSyllables[index]
    );

    Logger.log(`Validación: ${isCorrect ? '✅' : '❌'}`);
    Logger.log(`  Seleccionadas: [${selectedSyllables.join(', ')}]`);
    Logger.log(`  Correctas: [${correctSyllables.join(', ')}]`);

    return isCorrect;
  },

  /**
   * Valida si el idioma es válido
   */
  isValidLanguage(language) {
    const valid = ['es', 'en'].includes(language);
    if (!valid) {
      Logger.warn(`Idioma inválido: ${language}`);
    }
    return valid;
  },

  /**
   * Valida si la dificultad es válida
   */
  isValidDifficulty(difficulty) {
    const diff = parseInt(difficulty);
    const valid = [1, 2, 3].includes(diff);
    if (!valid) {
      Logger.warn(`Dificultad inválida: ${difficulty}`);
    }
    return valid;
  }
};

/**
 * UTILIDADES DE DOM
 */

const DOMUtils = {
  show(element) {
    if (element) {
      element.classList.add('screen--active');
      element.style.display = 'block';
    }
  },

  hide(element) {
    if (element) {
      element.classList.remove('screen--active');
      element.style.display = 'none';
    }
  },

  hideAll(container, selector) {
    if (!container) return;
    const elements = container.querySelectorAll(selector);
    elements.forEach(el => this.hide(el));
  },

  clearContent(element) {
    if (element) {
      element.innerHTML = '';
    }
  },

  disable(button) {
    if (button) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    }
  },

  enable(button) {
    if (button) {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  },

  showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.removeAttribute('hidden');
      spinner.style.display = 'flex';
    }
  },

  hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
    }
  }
};

/**
 * UTILIDADES DE CÁLCULOS
 */

const CalculationUtils = {
  /**
   * Calcula el porcentaje de aciertos
   */
  calculateAccuracy(correct, total) {
    if (total === 0) return 0;
    const accuracy = Math.round((correct / total) * 100);
    Logger.log(`📊 Accuracy: ${correct}/${total} = ${accuracy}%`);
    return accuracy;
  },

  /**
   * Calcula los puntos obtenidos (CORREGIDO)
   */
  calculatePoints(isCorrect, reactionTime, difficulty = 2) {
    Logger.log('💰 === CALCULANDO PUNTOS ===');
    Logger.log(`  Correcto: ${isCorrect}`);
    Logger.log(`  Tiempo: ${reactionTime}ms`);
    Logger.log(`  Dificultad: ${difficulty}`);

    // Si es incorrecto, 0 puntos
    if (!isCorrect) {
      Logger.log(`  ❌ Incorrecto = 0 puntos`);
      return 0;
    }

    // Puntos base según dificultad
    const basePoints = {
      1: 10,  // Fácil
      2: 20,  // Normal
      3: 30   // Difícil
    };

    let points = basePoints[difficulty] || 20;
    Logger.log(`  📌 Puntos base: ${points}`);

    // Bonus por velocidad
    let bonus = 0;
    if (reactionTime < 2000) {
      bonus = 15;
      Logger.log(`  ⚡ Bonus ultra rápido: +${bonus}`);
    } else if (reactionTime < 3000) {
      bonus = 10;
      Logger.log(`  ⚡ Bonus rápido: +${bonus}`);
    } else if (reactionTime < 5000) {
      bonus = 5;
      Logger.log(`  ⚡ Bonus normal: +${bonus}`);
    } else {
      Logger.log(`  ⏱️ Sin bonus (tiempo > 5s)`);
    }

    points += bonus;

    Logger.log(`  ✅ TOTAL: ${points} puntos`);
    Logger.log('💰 ========================');

    return points;
  },

  /**
   * Calcula la dificultad según la cantidad de sílabas
   */
  calculateDifficulty(syllableCount) {
    if (syllableCount <= 1) return 1;
    if (syllableCount <= 2) return 1;
    if (syllableCount === 3) return 2;
    return 3;
  }
};

/**
 * UTILIDADES DE ALMACENAMIENTO LOCAL
 */

const StorageUtils = {
  setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(key, jsonValue);
      Logger.log(`💾 Guardado en localStorage: ${key}`);
      return true;
    } catch (error) {
      Logger.error('Error guardando en localStorage', error);
      return false;
    }
  },

  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      Logger.log(`📂 Leído de localStorage: ${key}`);
      return parsed;
    } catch (error) {
      Logger.error('Error leyendo localStorage', error);
      return null;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      Logger.log(`🗑️ Removido de localStorage: ${key}`);
      return true;
    } catch (error) {
      Logger.error('Error removiendo de localStorage', error);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      Logger.log('🧹 localStorage limpiado');
      return true;
    } catch (error) {
      Logger.error('Error limpiando localStorage', error);
      return false;
    }
  },

  getAllSessions() {
    try {
      const sessions = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('session_')) {
          sessions.push(this.getItem(key));
        }
      }
      return sessions;
    } catch (error) {
      Logger.error('Error obteniendo sesiones', error);
      return [];
    }
  }
};

/**
 * UTILIDADES DE LOGGING
 */

const Logger = {
  enabled: true, // Cambiar a false para desactivar logs

  log(message, data = null) {
    if (!this.enabled) return;
    
    if (data !== null && data !== undefined) {
      console.log(`[INFO] ${message}`, data);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message, data = null) {
    if (!this.enabled) return;
    
    if (data !== null && data !== undefined) {
      console.warn(`⚠️ [WARN] ${message}`, data);
    } else {
      console.warn(`⚠️ [WARN] ${message}`);
    }
  },

  error(message, error = null) {
    // Los errores siempre se muestran
    if (error !== null && error !== undefined) {
      console.error(`❌ [ERROR] ${message}`, error);
    } else {
      console.error(`❌ [ERROR] ${message}`);
    }
  },

  debug(message, data = null) {
    if (!this.enabled) return;
    
    if (data !== null && data !== undefined) {
      console.debug(`🔍 [DEBUG] ${message}`, data);
    } else {
      console.debug(`🔍 [DEBUG] ${message}`);
    }
  },

  table(data) {
    if (!this.enabled) return;
    console.table(data);
  }
};

/**
 * UTILIDADES DE FORMATO
 */

const FormatUtils = {
  /**
   * Formatea milisegundos a formato legible
   */
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  },

  /**
   * Formatea número con separador de miles
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Capitaliza primera letra
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

/**
 * UTILIDADES DE ARRAY
 */

const ArrayUtils = {
  /**
   * Mezcla un array (Fisher-Yates shuffle)
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Obtiene un elemento aleatorio
   */
  random(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Obtiene múltiples elementos aleatorios únicos
   */
  randomMultiple(array, count) {
    if (!array || array.length === 0) return [];
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, Math.min(count, array.length));
  }
};

/**
 * EXPORTAR UTILIDADES
 */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TimeTracker,
    AudioManager,
    ValidationUtils,
    DOMUtils,
    CalculationUtils,
    StorageUtils,
    Logger,
    FormatUtils,
    ArrayUtils
  };
}

// Hacer disponibles globalmente en el navegador
if (typeof window !== 'undefined') {
  window.TimeTracker = TimeTracker;
  window.AudioManager = AudioManager;
  window.ValidationUtils = ValidationUtils;
  window.DOMUtils = DOMUtils;
  window.CalculationUtils = CalculationUtils;
  window.StorageUtils = StorageUtils;
  window.Logger = Logger;
  window.FormatUtils = FormatUtils;
  window.ArrayUtils = ArrayUtils;
}