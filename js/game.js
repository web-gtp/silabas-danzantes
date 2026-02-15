// frontend/js/game.js
// Lógica principal del juego

class SilabasDanzantesGame {
  constructor() {
    // Variables del estado del juego
    this.currentSessionId = null;
    this.currentQuestion = 0;
    this.totalQuestions = 10;
    this.totalScore = 0;
    this.correctAnswers = 0;
    this.currentLanguage = 'es';
    this.currentDifficulty = 2;
    this.stimuli = [];
    this.currentStimulus = null;
    this.selectedSyllables = [];
    this.allResponses = [];

    // Managers
    this.timeTracker = new TimeTracker();

    // Elementos del DOM (se inicializan en init())
    this.elements = {};

    // Estado
    this.isAnswered = false;
    this.isLoadingStimuli = false;
  }

  /**
   * INICIALIZACIÓN
   */

  async init() {
    Logger.log('🎮 Inicializando Sílabas Danzantes...');

    try {
      // Cachear elementos del DOM
      this.cacheElements();

      // Cargar estímulos iniciales
      await this.loadStimuli();

      // Configurar event listeners
      this.setupEventListeners();

      // Mostrar pantalla de inicio
      DOMUtils.show(this.elements.startScreen);

      Logger.log('✅ Juego inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego', error);
      alert('Error inicializando el juego. Por favor recarga la página.');
    }
  }

  cacheElements() {
    this.elements = {
      // Screens
      startScreen: document.getElementById('startScreen'),
      gameScreen: document.getElementById('gameScreen'),
      feedbackScreen: document.getElementById('feedbackScreen'),
      endScreen: document.getElementById('endScreen'),

      // Header
      scoreValue: document.getElementById('scoreValue'),
      langBtnEs: document.getElementById('langBtnEs'),
      langBtnEn: document.getElementById('langBtnEn'),

      // Game
      progressFill: document.getElementById('progressFill'),
      questionNumber: document.getElementById('questionNumber'),
      totalQuestions: document.getElementById('totalQuestions'),
      stimulusImage: document.getElementById('stimulusImage'),
      stimulusWord: document.getElementById('stimulusWord'),
      playAudioBtn: document.getElementById('playAudioBtn'),
      syllableOptions: document.getElementById('syllableOptions'),
      selectedSyllables: document.getElementById('selectedSyllables'),
      undoBtn: document.getElementById('undoBtn'),
      checkBtn: document.getElementById('checkBtn'),

      // Feedback
      feedbackContent: document.getElementById('feedbackContent'),
      nextBtn: document.getElementById('nextBtn'),

      // End
      finalAccuracy: document.getElementById('finalAccuracy'),
      finalAvgTime: document.getElementById('finalAvgTime'),
      finalScore: document.getElementById('finalScore'),
      endMessage: document.getElementById('endMessage'),
      restartBtn: document.getElementById('restartBtn'),

      // Controls
      startBtn: document.getElementById('startBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };

    Logger.log('✅ Elementos del DOM cacheados');
  }

  setupEventListeners() {
    // Botones de idioma
    this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));

    // Pantalla de inicio
    this.elements.startBtn.addEventListener('click', () => this.startGame());

    // Pantalla de juego
    this.elements.playAudioBtn.addEventListener('click', () => this.playCurrentAudio());
    this.elements.undoBtn.addEventListener('click', () => this.undoLastSyllable());
    this.elements.checkBtn.addEventListener('click', () => this.checkAnswer());

    // Pantalla de retroalimentación
    this.elements.nextBtn.addEventListener('click', () => this.handleNextQuestion());

    // Pantalla final
    this.elements.restartBtn.addEventListener('click', () => this.resetGame());

    Logger.log('✅ Event listeners configurados');
  }

  /**
   * CARGA DE DATOS DESDE FIRESTORE
   */

  async loadStimuli() {
    if (this.isLoadingStimuli) return;

    this.isLoadingStimuli = true;
    DOMUtils.hideLoading();

    try {
      Logger.log(`🔄 Cargando estímulos para idioma: ${this.currentLanguage}`);

      const snapshot = await db.collection('stimuli')
        .where('language', '==', this.currentLanguage)
        .get();

      if (snapshot.empty) {
        throw new Error(`No se encontraron estímulos para el idioma: ${this.currentLanguage}`);
      }

      this.stimuli = [];
      snapshot.forEach(doc => {
        this.stimuli.push({
          id: doc.id,
          ...doc.data()
        });
      });

      Logger.log(`✅ ${this.stimuli.length} estímulos cargados para ${this.currentLanguage}`);

    } catch (error) {
      Logger.error('Error cargando estímulos desde Firestore', error);
      Logger.warn('⚠️ Usando datos de fallback');
      this.loadFallbackData();
      
    } finally {
      DOMUtils.hideLoading();
      this.isLoadingStimuli = false;
    }
  }

 loadFallbackData() {
  Logger.warn(`⚠️ Usando datos de fallback para idioma: ${this.currentLanguage}`);
  
  if (this.currentLanguage === 'es') {
    this.stimuli = [
      {
        id: "es_s001",
        word: "gato",
        syllables: ["ga", "to"],
        image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🐱+Gato",
        difficulty: 1,
        language: "es"
      },
      {
        id: "es_s002",
        word: "casa",
        syllables: ["ca", "sa"],
        image: "https://via.placeholder.com/300x200/E24A4A/FFFFFF?text=🏠+Casa",
        difficulty: 1,
        language: "es"
      },
      {
        id: "es_s003",
        word: "sol",
        syllables: ["sol"],
        image: "https://via.placeholder.com/300x200/F5A623/FFFFFF?text=☀️+Sol",
        difficulty: 1,
        language: "es"
      },
      {
        id: "es_s004",
        word: "perro",
        syllables: ["pe", "rro"],
        image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐶+Perro",
        difficulty: 1,
        language: "es"
      },
      {
        id: "es_s005",
        word: "luna",
        syllables: ["lu", "na"],
        image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🌙+Luna",
        difficulty: 1,
        language: "es"
      },
      {
        id: "es_s006",
        word: "mariposa",
        syllables: ["ma", "ri", "po", "sa"],
        image: "https://via.placeholder.com/300x200/BD10E0/FFFFFF?text=🦋+Mariposa",
        difficulty: 3,
        language: "es"
      }
    ];
  } else if (this.currentLanguage === 'en') {
    this.stimuli = [
      {
        id: "en_s001",
        word: "cat",
        syllables: ["cat"],
        image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🐱+Cat",
        difficulty: 1,
        language: "en"
      },
      {
        id: "en_s002",
        word: "house",
        syllables: ["house"],
        image: "https://via.placeholder.com/300x200/E24A4A/FFFFFF?text=🏠+House",
        difficulty: 1,
        language: "en"
      },
      {
        id: "en_s003",
        word: "sun",
        syllables: ["sun"],
        image: "https://via.placeholder.com/300x200/F5A623/FFFFFF?text=☀️+Sun",
        difficulty: 1,
        language: "en"
      },
      {
        id: "en_s004",
        word: "dog",
        syllables: ["dog"],
        image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐶+Dog",
        difficulty: 1,
        language: "en"
      },
      {
        id: "en_s005",
        word: "moon",
        syllables: ["moon"],
        image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🌙+Moon",
        difficulty: 1,
        language: "en"
      },
      {
        id: "en_s006",
        word: "butterfly",
        syllables: ["but", "ter", "fly"],
        image: "https://via.placeholder.com/300x200/BD10E0/FFFFFF?text=🦋+Butterfly",
        difficulty: 3,
        language: "en"
      }
    ];
  }
  
  Logger.log(`✅ ${this.stimuli.length} estímulos de fallback cargados para ${this.currentLanguage}`);
}

  /**
   * CONTROL DE LENGUAJE
   */

async changeLanguage(language) {
  if (!ValidationUtils.isValidLanguage(language)) {
    Logger.warn('Lenguaje inválido:', language);
    return;
  }

  // Si es el mismo idioma, no hacer nada
  if (this.currentLanguage === language) {
    Logger.log(`✅ Ya estás en idioma: ${language}`);
    return;
  }

  Logger.log(`🌐 Cambiando idioma de "${this.currentLanguage}" a "${language}"`);

  // Cambiar idioma
  this.currentLanguage = language;

  // Actualizar botones visualmente
  if (language === 'es') {
    this.elements.langBtnEs.classList.add('lang-btn--active');
    this.elements.langBtnEn.classList.remove('lang-btn--active');
  } else {
    this.elements.langBtnEn.classList.add('lang-btn--active');
    this.elements.langBtnEs.classList.remove('lang-btn--active');
  }

  // LIMPIAR estímulos actuales
  this.stimuli = [];

  // Mostrar loading mientras carga
  DOMUtils.showLoading();

  // FORZAR recarga de estímulos
  Logger.log(`🔄 Cargando estímulos para idioma: ${language}`);
  
  try {
    // Consultar Firestore directamente
    const snapshot = await db.collection('stimuli')
      .where('language', '==', language)
      .get();

    if (snapshot.empty) {
      Logger.warn(`⚠️ No se encontraron estímulos en Firestore para idioma: ${language}`);
      Logger.warn('⚠️ Usando datos de fallback');
      this.loadFallbackData();
    } else {
      // Cargar desde Firestore
      this.stimuli = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        this.stimuli.push({
          id: doc.id,
          ...data
        });
      });
      
      Logger.log(`✅ ${this.stimuli.length} estímulos cargados desde Firestore`);
    }

    // Verificar que se cargaron correctamente
    if (this.stimuli.length > 0) {
      Logger.log(`📋 Primer estímulo: "${this.stimuli[0].word}" (idioma: ${this.stimuli[0].language})`);
      Logger.log(`📋 Todos los estímulos:`, this.stimuli.map(s => `${s.word} (${s.language})`));
    } else {
      Logger.error('❌ No se cargaron estímulos');
      alert(`No hay palabras disponibles en ${language === 'es' ? 'español' : 'inglés'}`);
    }

  } catch (error) {
    Logger.error('Error cargando estímulos al cambiar idioma', error);
    this.loadFallbackData();
  } finally {
    DOMUtils.hideLoading();
  }

  Logger.log(`✅ Cambio de idioma completado: ${language}`);
}
  /**
   * INICIO DEL JUEGO
   */

  async startGame() {
    try {
      const difficulty = parseInt(this.elements.difficultySelect.value);
      if (!ValidationUtils.isValidDifficulty(difficulty)) {
        alert('Selecciona un nivel válido');
        return;
      }

      this.currentDifficulty = difficulty;
      this.currentQuestion = 0;
      this.totalScore = 0;
      this.correctAnswers = 0;
      this.allResponses = [];
      this.selectedSyllables = [];

      await this.createSession();

      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);

      await this.loadNextQuestion();

      Logger.log('✅ Juego iniciado');

    } catch (error) {
      Logger.error('Error iniciando juego', error);
      alert('Error iniciando el juego');
    }
  }

  async createSession() {
    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentId: `student_${Date.now()}`,
        language: this.currentLanguage,
        difficulty: this.currentDifficulty,
        gameVersion: '1.0',
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });

      Logger.log(`✅ Sesión creada: ${this.currentSessionId}`);

    } catch (error) {
      Logger.error('Error creando sesión', error);
      this.currentSessionId = `session_${Date.now()}`;
    }
  }

  /**
   * FLUJO DE PREGUNTA (ARREGLADO)
   */

  handleNextQuestion() {
    Logger.log('🔘 Botón Siguiente presionado');
    
    // Ocultar feedback
    DOMUtils.hide(this.elements.feedbackScreen);
    
    // Cargar siguiente pregunta
    this.loadNextQuestion();
  }

  async loadNextQuestion() {
    Logger.log(`📝 Cargando pregunta ${this.currentQuestion + 1}/${this.totalQuestions}`);
    
    // Verificar si terminó el juego
    if (this.currentQuestion >= this.totalQuestions) {
      Logger.log('🏁 Juego terminado');
      await this.endGame();
      return;
    }

    // Limpiar estado
    this.selectedSyllables = [];
    this.isAnswered = false;
    DOMUtils.clearContent(this.elements.selectedSyllables);

    // Incrementar contador
    this.currentQuestion++;
    
    // Actualizar progreso
    this.updateProgress();

    // Mostrar pantalla de juego
    DOMUtils.show(this.elements.gameScreen);

    // Cargar estímulo
    this.selectRandomStimulus();
    await this.displayQuestion();
  }

  selectRandomStimulus() {
    const filteredStimuli = this.stimuli.filter(
      s => CalculationUtils.calculateDifficulty(s.syllables.length) === this.currentDifficulty
    );

    if (filteredStimuli.length === 0) {
      this.currentStimulus = this.stimuli[Math.floor(Math.random() * this.stimuli.length)];
    } else {
      this.currentStimulus = filteredStimuli[Math.floor(Math.random() * filteredStimuli.length)];
    }

    Logger.log(`✅ Estímulo seleccionado: ${this.currentStimulus.word}`);
  }

  async displayQuestion() {
    try {
      // Mostrar imagen
      this.elements.stimulusImage.src = this.currentStimulus.image;
      this.elements.stimulusImage.alt = this.currentStimulus.word;

      // Mostrar palabra
      this.elements.stimulusWord.textContent = this.currentStimulus.word;

      // Crear botones de sílabas
      this.createSyllableButtons();

      // Esperar un poco y reproducir audio
      await new Promise(resolve => setTimeout(resolve, 800));
      await this.playCurrentAudio();

    } catch (error) {
      Logger.error('Error mostrando pregunta', error);
    }
  }

  createSyllableButtons() {
    DOMUtils.clearContent(this.elements.syllableOptions);

    // Mezclar sílabas (Fisher-Yates shuffle)
    const shuffledSyllables = [...this.currentStimulus.syllables];
    for (let i = shuffledSyllables.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSyllables[i], shuffledSyllables[j]] = [shuffledSyllables[j], shuffledSyllables[i]];
    }

    shuffledSyllables.forEach((syllable, index) => {
      const button = document.createElement('button');
      button.className = 'syllable-btn';
      button.textContent = syllable;
      button.dataset.syllable = syllable;
      button.dataset.index = index;

      button.addEventListener('click', () => this.selectSyllable(syllable, button));

      this.elements.syllableOptions.appendChild(button);
    });

    Logger.log(`✅ ${shuffledSyllables.length} botones de sílabas creados`);
  }

  /**
   * INTERACCIÓN CON SÍLABAS
   */

  selectSyllable(syllable, buttonElement) {
    if (this.isAnswered) return;

    this.selectedSyllables.push(syllable);

    if (this.selectedSyllables.length === 1) {
      this.timeTracker.start();
    }

    this.displaySelectedSyllables();

    buttonElement.disabled = true;
    DOMUtils.disable(buttonElement);

    this.playClickSound();

    Logger.log(`✅ Sílaba seleccionada: ${syllable}`);
  }

  displaySelectedSyllables() {
    DOMUtils.clearContent(this.elements.selectedSyllables);

    this.selectedSyllables.forEach((syllable) => {
      const span = document.createElement('span');
      span.className = 'selected-syllable';
      span.textContent = syllable;
      this.elements.selectedSyllables.appendChild(span);
    });
  }

  undoLastSyllable() {
    if (this.selectedSyllables.length === 0 || this.isAnswered) return;

    const lastSyllable = this.selectedSyllables.pop();

    const button = this.elements.syllableOptions.querySelector(
      `[data-syllable="${lastSyllable}"]`
    );
    if (button) {
      button.disabled = false;
      DOMUtils.enable(button);
    }

    this.displaySelectedSyllables();

    Logger.log(`↩️ Sílaba deshecha: ${lastSyllable}`);
  }

  /**
   * AUDIO (ARREGLADO - SOLO SÍNTESIS)
   */

  async playCurrentAudio() {
    if (!this.currentStimulus) return;

    DOMUtils.disable(this.elements.playAudioBtn);

    try {
      // Usar síntesis de voz directamente
      await this.synthesizeSpeech(this.currentStimulus.word);
      this.timeTracker.start();

    } catch (error) {
      Logger.error('Error reproduciendo audio', error);

    } finally {
      // Re-habilitar después de 1 segundo
      setTimeout(() => {
        DOMUtils.enable(this.elements.playAudioBtn);
      }, 1000);
    }
  }

  synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        // Cancelar cualquier síntesis previa
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.8; // Más lento para mejor comprensión
        utterance.pitch = 1.1; // Un poco más agudo
        
        utterance.onend = () => {
          Logger.log(`🔊 Audio reproducido: ${text}`);
          resolve();
        };

        utterance.onerror = (error) => {
          Logger.error('Error en síntesis de voz', error);
          reject(error);
        };

        speechSynthesis.speak(utterance);
      } else {
        Logger.warn('Síntesis de voz no disponible');
        reject(new Error('Speech synthesis not supported'));
      }
    });
  }

  playClickSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

    } catch (error) {
      // Ignorar si no está disponible
    }
  }

  /**
   * VALIDACIÓN DE RESPUESTA
   */

 async checkAnswer() {
  if (this.selectedSyllables.length === 0) {
    alert('Por favor selecciona al menos una sílaba');
    return;
  }

  this.isAnswered = true;
  const reactionTime = this.timeTracker.recordReaction();

  // Validar respuesta
  const isCorrect = ValidationUtils.isValidResponse(
    this.selectedSyllables,
    this.currentStimulus.syllables
  );

  // Calcular puntos
  const points = CalculationUtils.calculatePoints(
    isCorrect,
    reactionTime,
    this.currentDifficulty
  );

  // ✅ LOGGING DETALLADO
  Logger.log('=== VERIFICANDO RESPUESTA ===');
  Logger.log(`Correcto: ${isCorrect}`);
  Logger.log(`Puntos calculados: ${points}`);
  Logger.log(`Total Score ANTES: ${this.totalScore}`);

  // ✅ ACTUALIZAR PUNTUACIÓN
  this.totalScore += points;
  
  Logger.log(`Total Score DESPUÉS: ${this.totalScore}`);
  Logger.log(`================================`);

  if (isCorrect) this.correctAnswers++;

  // ✅ ACTUALIZAR HEADER INMEDIATAMENTE
  this.elements.scoreValue.textContent = this.totalScore;
  Logger.log(`✅ Header actualizado a: ${this.totalScore}`);

  // Guardar respuesta
  await this.saveResponse({
    stimulusId: this.currentStimulus.id,
    correct: isCorrect,
    selectedSyllables: this.selectedSyllables,
    correctSyllables: this.currentStimulus.syllables,
    reactionTime: reactionTime,
    points: points
  });

  // Mostrar feedback
  this.showFeedback(isCorrect, points, reactionTime);

  Logger.log(`📊 Respuesta: ${isCorrect ? '✅ Correcta' : '❌ Incorrecta'} (+${points} pts)`);
}
  async saveResponse(responseData) {
    try {
      await db.collection('sessions')
        .doc(this.currentSessionId)
        .collection('responses')
        .add({
          ...responseData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

      this.allResponses.push(responseData);
      Logger.log('✅ Respuesta guardada en Firestore');

    } catch (error) {
      Logger.error('Error guardando respuesta', error);
      this.allResponses.push(responseData);
    }
  }

  showFeedback(isCorrect, points, reactionTime) {
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.feedbackScreen);

    const content = this.elements.feedbackContent;
    DOMUtils.clearContent(content);

    const icon = document.createElement('div');
    icon.className = `feedback-icon ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
    icon.textContent = isCorrect ? '✅' : '❌';
    icon.style.fontSize = '80px';
    icon.style.marginBottom = '20px';

    const title = document.createElement('h3');
    title.className = 'feedback-title';
    title.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto';
    title.style.fontSize = '32px';
    title.style.marginBottom = '15px';

    const message = document.createElement('p');
    message.className = 'feedback-message';
    message.textContent = isCorrect
      ? `¡Excelente! La respuesta fue correcta.`
      : `La respuesta correcta es: ${this.currentStimulus.syllables.join(' - ')}`;
    message.style.fontSize = '20px';
    message.style.marginBottom = '20px';

    const pointsDiv = document.createElement('p');
    pointsDiv.className = 'feedback-points';
    pointsDiv.textContent = `+${points} puntos`;
    pointsDiv.style.fontSize = '24px';
    pointsDiv.style.fontWeight = 'bold';
    pointsDiv.style.color = isCorrect ? '#4CAF50' : '#FF5722';

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(pointsDiv);

   this.elements.scoreValue.textContent = this.totalScore;
this.elements.finalScore.textContent = this.totalScore; // ✅ AGREGAR ESTA
  }

  updateProgress() {
    const progress = (this.currentQuestion / this.totalQuestions) * 100;
    this.elements.progressFill.style.width = progress + '%';

    this.elements.questionNumber.textContent = this.currentQuestion;
    this.elements.totalQuestions.textContent = this.totalQuestions;
  }

  /**
   * FIN DEL JUEGO
   */

async endGame() {
  try {
    const accuracy = CalculationUtils.calculateAccuracy(
      this.correctAnswers,
      this.totalQuestions
    );

    const avgReactionTime = this.timeTracker.getAverageReactionTime();

    await db.collection('sessions').doc(this.currentSessionId).update({
      status: 'completed',
      completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      totalScore: this.totalScore,
      correctAnswers: this.correctAnswers,
      totalQuestions: this.totalQuestions,
      accuracy: accuracy,
      averageReactionTime: avgReactionTime
    });

    // ✅ FORZAR actualización del score final
    this.elements.finalScore.textContent = this.totalScore;
    Logger.log(`FORZANDO Score final: ${this.totalScore}`);

    this.showEndScreen(accuracy, avgReactionTime);

    StorageUtils.setItem(`session_${this.currentSessionId}`, {
      sessionId: this.currentSessionId,
      language: this.currentLanguage,
      difficulty: this.currentDifficulty,
      totalScore: this.totalScore,
      correctAnswers: this.correctAnswers,
      totalQuestions: this.totalQuestions,
      accuracy: accuracy,
      averageReactionTime: avgReactionTime,
      responses: this.allResponses,
      completedAt: new Date().toISOString()
    });

    Logger.log('Sesión finalizada correctamente');

  } catch (error) {
    Logger.error('Error finalizando sesión', error);
    const accuracy = CalculationUtils.calculateAccuracy(this.correctAnswers, this.totalQuestions);
    const avgReactionTime = this.timeTracker.getAverageReactionTime();
    
    // ✅ FORZAR actualización incluso con error
    this.elements.finalScore.textContent = this.totalScore;
    
    this.showEndScreen(accuracy, avgReactionTime);
  }
}

showEndScreen(accuracy, avgReactionTime) {
  DOMUtils.hide(this.elements.feedbackScreen);
  DOMUtils.hide(this.elements.gameScreen);
  DOMUtils.show(this.elements.endScreen);

  // ✅ ACTUALIZAR ESTADÍSTICAS (CORREGIDO)
  this.elements.finalAccuracy.textContent = `${accuracy}%`;
  this.elements.finalAvgTime.textContent = `${avgReactionTime} ms`;
  this.elements.finalScore.textContent = this.totalScore; // ✅ CORREGIDO

  // Verificar en consola
  Logger.log(`📊 Estadísticas finales:`);
  Logger.log(`   - Precisión: ${accuracy}%`);
  Logger.log(`   - Tiempo promedio: ${avgReactionTime} ms`);
  Logger.log(`   - Puntos totales: ${this.totalScore}`);
  Logger.log(`   - Correctas: ${this.correctAnswers}/${this.totalQuestions}`);

  const message = this.generateMotivationalMessage(accuracy);
  this.elements.endMessage.textContent = message;

  // AGREGAR SUGERENCIA PARA CAMBIAR IDIOMA
  this.addLanguageSuggestion();
}

/**
 * SUGERENCIA PARA PROBAR EL OTRO IDIOMA
 */
addLanguageSuggestion() {
  // Verificar si ya existe la sugerencia
  let suggestionDiv = document.getElementById('languageSuggestion');
  
  if (!suggestionDiv) {
    suggestionDiv = document.createElement('div');
    suggestionDiv.id = 'languageSuggestion';
    suggestionDiv.style.cssText = `
      margin-top: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      color: white;
      text-align: center;
    `;

    const otherLanguage = this.currentLanguage === 'es' ? 'inglés' : 'español';
    const otherLangCode = this.currentLanguage === 'es' ? 'en' : 'es';
    const flag = this.currentLanguage === 'es' ? '🇬🇧' : '🇪🇸';

    suggestionDiv.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 24px;">
        ${flag} ¿Quieres probar en ${otherLanguage}?
      </h3>
      <p style="margin: 0 0 20px 0; font-size: 18px;">
        ${this.currentLanguage === 'es' 
          ? 'Try the game in English!' 
          : '¡Prueba el juego en español!'}
      </p>
      <button id="switchLanguageBtn" style="
        padding: 15px 40px;
        font-size: 20px;
        font-weight: bold;
        background: white;
        color: #667eea;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        ${flag} ${this.currentLanguage === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      </button>
    `;

    // Insertar antes del botón "Jugar de nuevo"
    this.elements.endScreen.insertBefore(
      suggestionDiv, 
      this.elements.restartBtn.parentElement
    );

    // Agregar evento al botón
    const switchBtn = document.getElementById('switchLanguageBtn');
    switchBtn.addEventListener('click', () => {
      this.switchToOtherLanguage();
    });

    // Efecto hover
    switchBtn.addEventListener('mouseenter', () => {
      switchBtn.style.transform = 'scale(1.05)';
    });
    switchBtn.addEventListener('mouseleave', () => {
      switchBtn.style.transform = 'scale(1)';
    });
  }
}

/**
 * CAMBIAR AL OTRO IDIOMA Y REINICIAR
 */
async switchToOtherLanguage() {
  const newLanguage = this.currentLanguage === 'es' ? 'en' : 'es';
  
  Logger.log(`🔄 Cambiando de ${this.currentLanguage} a ${newLanguage}`);
  
  // Cambiar idioma
  await this.changeLanguage(newLanguage);
  
  // Reiniciar juego
  await this.resetGame();
}

  generateMotivationalMessage(accuracy) {
    if (accuracy === 100) {
      return '🌟 ¡Perfecto! ¡Eres un campeón de las sílabas!';
    } else if (accuracy >= 90) {
      return '⭐ ¡Excelente trabajo! ¡Casi perfecto!';
    } else if (accuracy >= 80) {
      return '👏 ¡Muy bien! ¡Vas muy bien!';
    } else if (accuracy >= 70) {
      return '💪 ¡Buen esfuerzo! ¡Sigue practicando!';
    } else {
      return '🎯 ¡Sigue intentando! ¡Cada vez lo harás mejor!';
    }
  }

  /**
   * REINICIO
   */

  async resetGame() {
    this.timeTracker.reset();
    this.selectedSyllables = [];
    this.currentQuestion = 0;
    this.totalScore = 0;
    this.correctAnswers = 0;
    this.allResponses = [];

    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.show(this.elements.startScreen);

    await this.loadStimuli();

    Logger.log('🔄 Juego reiniciado');
  }
}

// Exportar clase
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SilabasDanzantesGame;
}