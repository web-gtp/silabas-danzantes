// js/game2.js
// ================================================================
// Juego 2: Memoria de Trabajo Secuencial
// Constructo: AMPLITUD DE MEMORIA DE TRABAJO (Working Memory Span)
// Paradigma: Recuerdo secuencial ordenado (Corsi / Digit Span adaptado)
//
// Mecánica:
//   1. Se muestra una secuencia de palabras/imágenes (una a una)
//   2. Las imágenes desaparecen
//   3. El niño debe reproducir la secuencia EN ORDEN
//   4. Si acierta → la secuencia crece en 1 ítem
//   5. 2 intentos por nivel de span; si falla ambos → fin
//   6. Métrica principal: maxSpan (amplitud máxima alcanzada)
// ================================================================

class MemoriaTrabajoGame {
  constructor() {
    this.currentSessionId = null;
    this.studentCode      = null;
    this.studentName      = null;
    this.currentLanguage  = 'es';
    this.currentDifficulty = 2;

    // Estado del juego
    this.currentSpan       = 2;      // Empezar en 2 ítems
    this.maxSpanReached    = 0;
    this.currentTrial      = 1;      // Intento 1 o 2 en el nivel actual
    this.consecutiveErrors = 0;      // Errores en este nivel de span
    this.totalTrials       = 0;
    this.correctTrials     = 0;
    this.totalScore        = 0;
    this.gameOver          = false;

    // Secuencia actual
    this.currentSequence  = [];      // Lo que debe recordar
    this.playerSequence   = [];      // Lo que el jugador seleccionó
    this.availableOptions = [];      // Opciones visibles en fase recall

    // Datos de palabras
    this.allWords = [];

    // Tiempos
    this.gameStartTime  = null;
    this.gameTotalTime  = 0;
    this.timerInterval  = null;
    this.trialStartTime = null;

    // Respuestas para Firestore
    this.allResponses = [];
    this.timeTracker  = new TimeTracker();

    // Fase: idle | showing | recalling | feedback
    this.phase = 'idle';

    this.elements = {};
  }

  // ============================================================
  // INIT
  // ============================================================
  async init() {
    Logger.log('🧠 Inicializando Memoria de Trabajo Secuencial...');
    try {
      this.checkStudentCode();
      this.cacheElements();
      this.loadWordsData();
      this.setupEventListeners();
      Logger.log('✅ Juego 2 inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego 2', error);
      alert('Error inicializando el juego. Por favor recarga la página.');
    }
  }

  cacheElements() {
    this.elements = {
      startScreen:    document.getElementById('startScreen'),
      gameScreen:     document.getElementById('gameScreen'),
      endScreen:      document.getElementById('endScreen'),
      scoreValue:     document.getElementById('scoreValue'),
      langBtnEs:      document.getElementById('langBtnEs'),
      langBtnEn:      document.getElementById('langBtnEn'),
      spanLevel:      document.getElementById('spanLevel'),
      trialNumber:    document.getElementById('trialNumber'),
      sequenceDisplay: document.getElementById('sequenceDisplay'),
      recallArea:     document.getElementById('recallArea'),
      playerSlots:    document.getElementById('playerSlots'),
      optionsGrid:    document.getElementById('optionsGrid'),
      feedbackBanner: document.getElementById('feedbackBanner'),
      finalSpan:      document.getElementById('finalSpan'),
      finalTrials:    document.getElementById('finalTrials'),
      finalAccuracy:  document.getElementById('finalAccuracy'),
      finalScore:     document.getElementById('finalScore'),
      finalTime:      document.getElementById('finalTime'),
      endMessage:     document.getElementById('endMessage'),
      restartBtn:     document.getElementById('restartBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };
  }

  setupEventListeners() {
    const form = document.getElementById('studentCodeForm');
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); this.handleStudentCodeSubmit(); });
    }

    if (this.elements.langBtnEs) this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    if (this.elements.langBtnEn) this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));
    if (this.elements.restartBtn) this.elements.restartBtn.addEventListener('click', () => this.resetGame());

    const goToGame3Btn = document.getElementById('goToGame3Btn');
    if (goToGame3Btn) goToGame3Btn.addEventListener('click', () => this.goToNextGame());
  }

  checkStudentCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const lang = urlParams.get('lang');
    const diff = parseInt(urlParams.get('diff'));

    if (!lang) {
      const saved = SessionManager.load && SessionManager.load();
      if (saved && saved.language) this.currentLanguage = saved.language;
    }
    if (!(diff === 1 || diff === 2 || diff === 3)) {
      const saved = SessionManager.load && SessionManager.load();
      if (saved && saved.difficulty) this.currentDifficulty = saved.difficulty;
    }
    if (code) {
      this.studentCode = code;
      const inp = document.getElementById('studentCodeInput');
      if (inp) inp.value = code;
    }
    if (lang === 'es' || lang === 'en') {
      this.currentLanguage = lang;
      this._updateLangButtons(lang);
    }
    if (diff === 1 || diff === 2 || diff === 3) {
      this.currentDifficulty = diff;
      if (this.elements.difficultySelect) this.elements.difficultySelect.value = String(diff);
    }
  }

  _updateLangButtons(lang) {
    if (!this.elements.langBtnEs || !this.elements.langBtnEn) return;
    this.elements.langBtnEs.classList.toggle('lang-btn--active', lang === 'es');
    this.elements.langBtnEn.classList.toggle('lang-btn--active', lang === 'en');
  }

  // ============================================================
  // STUDENT SUBMIT
  // ============================================================
  async handleStudentCodeSubmit() {
    try {
      const code = document.getElementById('studentCodeInput').value.trim().toUpperCase();
      if (!code || code.length < 3) { alert('Ingresa tu código de estudiante 🎫'); return; }

      this.studentCode = code;
      DOMUtils.showLoading();

      try {
        const doc = await db.collection('students').doc(code).get();
        if (doc.exists) {
          this.studentName = doc.data().name;
          await db.collection('students').doc(code).update({
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalSessions: firebase.firestore.FieldValue.increment(1)
          });
        } else {
          this.studentName = 'Jugador';
          await db.collection('students').doc(code).set({
            code, name: 'Jugador', totalSessions: 1, gamesCompleted: [],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) {
        Logger.error('Error Firebase', e);
        this.studentName = 'Jugador';
      }

      DOMUtils.hideLoading();
      await this.startGame();
    } catch (e) {
      Logger.error('Error en formulario', e);
      alert('Hubo un error. Intenta de nuevo.');
      DOMUtils.hideLoading();
    }
  }

  // ============================================================
  // WORD DATA (reutiliza mismas palabras, solo necesitamos word + emoji)
  // ============================================================
  loadWordsData() {
    const es = [
      { word: 'gato', emoji: '🐱', difficulty: 1 }, { word: 'perro', emoji: '🐶', difficulty: 1 },
      { word: 'casa', emoji: '🏠', difficulty: 1 }, { word: 'sol', emoji: '☀️', difficulty: 1 },
      { word: 'luna', emoji: '🌙', difficulty: 1 }, { word: 'flor', emoji: '🌸', difficulty: 1 },
      { word: 'árbol', emoji: '🌳', difficulty: 1 }, { word: 'manzana', emoji: '🍎', difficulty: 1 },
      { word: 'naranja', emoji: '🍊', difficulty: 1 }, { word: 'coche', emoji: '🚗', difficulty: 1 },
      { word: 'avión', emoji: '✈️', difficulty: 1 }, { word: 'barco', emoji: '🚢', difficulty: 1 },
      { word: 'tren', emoji: '🚂', difficulty: 1 }, { word: 'globo', emoji: '🎈', difficulty: 1 },
      { word: 'regalo', emoji: '🎁', difficulty: 1 }, { word: 'pizza', emoji: '🍕', difficulty: 1 },
      { word: 'helado', emoji: '🍦', difficulty: 1 }, { word: 'galleta', emoji: '🍪', difficulty: 1 },
      { word: 'agua', emoji: '💧', difficulty: 1 }, { word: 'fuego', emoji: '🔥', difficulty: 1 },
      { word: 'rana', emoji: '🐸', difficulty: 1 }, { word: 'oso', emoji: '🐻', difficulty: 1 },
      { word: 'pato', emoji: '🦆', difficulty: 1 }, { word: 'pez', emoji: '🐟', difficulty: 1 },
      { word: 'nube', emoji: '☁️', difficulty: 1 },
      { word: 'león', emoji: '🦁', difficulty: 2 }, { word: 'tigre', emoji: '🐯', difficulty: 2 },
      { word: 'mono', emoji: '🐵', difficulty: 2 }, { word: 'caballo', emoji: '🐎', difficulty: 2 },
      { word: 'elefante', emoji: '🐘', difficulty: 2 }, { word: 'jirafa', emoji: '🦒', difficulty: 2 },
      { word: 'delfín', emoji: '🐬', difficulty: 2 }, { word: 'ballena', emoji: '🐋', difficulty: 2 },
      { word: 'tortuga', emoji: '🐢', difficulty: 2 }, { word: 'conejo', emoji: '🐰', difficulty: 2 },
      { word: 'estrella', emoji: '⭐', difficulty: 2 }, { word: 'montaña', emoji: '⛰️', difficulty: 2 },
      { word: 'playa', emoji: '🏖️', difficulty: 2 }, { word: 'guitarra', emoji: '🎸', difficulty: 2 },
      { word: 'piano', emoji: '🎹', difficulty: 2 }, { word: 'tambor', emoji: '🥁', difficulty: 2 },
      { word: 'mariposa', emoji: '🦋', difficulty: 2 }, { word: 'abeja', emoji: '🐝', difficulty: 2 },
      { word: 'búho', emoji: '🦉', difficulty: 2 }, { word: 'lobo', emoji: '🐺', difficulty: 2 },
      { word: 'zorro', emoji: '🦊', difficulty: 2 }, { word: 'pingüino', emoji: '🐧', difficulty: 2 },
      { word: 'loro', emoji: '🦜', difficulty: 2 }, { word: 'tiburón', emoji: '🦈', difficulty: 2 },
      { word: 'pulpo', emoji: '🐙', difficulty: 2 }, { word: 'cangrejo', emoji: '🦀', difficulty: 2 },
      { word: 'cohete', emoji: '🚀', difficulty: 3 }, { word: 'castillo', emoji: '🏰', difficulty: 3 },
      { word: 'telescopio', emoji: '🔭', difficulty: 3 }, { word: 'microscopio', emoji: '🔬', difficulty: 3 },
      { word: 'cerebro', emoji: '🧠', difficulty: 3 }, { word: 'corazón', emoji: '🫀', difficulty: 3 },
      { word: 'violín', emoji: '🎻', difficulty: 3 }, { word: 'trompeta', emoji: '🎺', difficulty: 3 },
      { word: 'saxofón', emoji: '🎷', difficulty: 3 }, { word: 'arcoíris', emoji: '🌈', difficulty: 3 },
      { word: 'galaxia', emoji: '🌌', difficulty: 3 }, { word: 'tornado', emoji: '🌪️', difficulty: 3 },
      { word: 'serpiente', emoji: '🐍', difficulty: 3 }, { word: 'cocodrilo', emoji: '🐊', difficulty: 3 },
      { word: 'rinoceronte', emoji: '🦏', difficulty: 3 }, { word: 'hipopótamo', emoji: '🦛', difficulty: 3 },
      { word: 'rompecabezas', emoji: '🧩', difficulty: 3 }, { word: 'estetoscopio', emoji: '🩺', difficulty: 3 },
      { word: 'hamburguesa', emoji: '🍔', difficulty: 3 }, { word: 'dinosaurio', emoji: '🦕', difficulty: 3 }
    ];

    const en = [
      { word: 'cat', emoji: '🐱', difficulty: 1 }, { word: 'dog', emoji: '🐶', difficulty: 1 },
      { word: 'house', emoji: '🏠', difficulty: 1 }, { word: 'sun', emoji: '☀️', difficulty: 1 },
      { word: 'moon', emoji: '🌙', difficulty: 1 }, { word: 'flower', emoji: '🌸', difficulty: 1 },
      { word: 'tree', emoji: '🌳', difficulty: 1 }, { word: 'apple', emoji: '🍎', difficulty: 1 },
      { word: 'orange', emoji: '🍊', difficulty: 1 }, { word: 'car', emoji: '🚗', difficulty: 1 },
      { word: 'plane', emoji: '✈️', difficulty: 1 }, { word: 'ship', emoji: '🚢', difficulty: 1 },
      { word: 'train', emoji: '🚂', difficulty: 1 }, { word: 'balloon', emoji: '🎈', difficulty: 1 },
      { word: 'gift', emoji: '🎁', difficulty: 1 }, { word: 'pizza', emoji: '🍕', difficulty: 1 },
      { word: 'ice cream', emoji: '🍦', difficulty: 1 }, { word: 'cookie', emoji: '🍪', difficulty: 1 },
      { word: 'water', emoji: '💧', difficulty: 1 }, { word: 'fire', emoji: '🔥', difficulty: 1 },
      { word: 'frog', emoji: '🐸', difficulty: 1 }, { word: 'bear', emoji: '🐻', difficulty: 1 },
      { word: 'duck', emoji: '🦆', difficulty: 1 }, { word: 'fish', emoji: '🐟', difficulty: 1 },
      { word: 'cloud', emoji: '☁️', difficulty: 1 },
      { word: 'lion', emoji: '🦁', difficulty: 2 }, { word: 'tiger', emoji: '🐯', difficulty: 2 },
      { word: 'monkey', emoji: '🐵', difficulty: 2 }, { word: 'horse', emoji: '🐎', difficulty: 2 },
      { word: 'elephant', emoji: '🐘', difficulty: 2 }, { word: 'giraffe', emoji: '🦒', difficulty: 2 },
      { word: 'dolphin', emoji: '🐬', difficulty: 2 }, { word: 'whale', emoji: '🐋', difficulty: 2 },
      { word: 'turtle', emoji: '🐢', difficulty: 2 }, { word: 'rabbit', emoji: '🐰', difficulty: 2 },
      { word: 'star', emoji: '⭐', difficulty: 2 }, { word: 'mountain', emoji: '⛰️', difficulty: 2 },
      { word: 'beach', emoji: '🏖️', difficulty: 2 }, { word: 'guitar', emoji: '🎸', difficulty: 2 },
      { word: 'piano', emoji: '🎹', difficulty: 2 }, { word: 'drum', emoji: '🥁', difficulty: 2 },
      { word: 'butterfly', emoji: '🦋', difficulty: 2 }, { word: 'bee', emoji: '🐝', difficulty: 2 },
      { word: 'owl', emoji: '🦉', difficulty: 2 }, { word: 'wolf', emoji: '🐺', difficulty: 2 },
      { word: 'fox', emoji: '🦊', difficulty: 2 }, { word: 'penguin', emoji: '🐧', difficulty: 2 },
      { word: 'parrot', emoji: '🦜', difficulty: 2 }, { word: 'shark', emoji: '🦈', difficulty: 2 },
      { word: 'octopus', emoji: '🐙', difficulty: 2 }, { word: 'crab', emoji: '🦀', difficulty: 2 },
      { word: 'rocket', emoji: '🚀', difficulty: 3 }, { word: 'castle', emoji: '🏰', difficulty: 3 },
      { word: 'telescope', emoji: '🔭', difficulty: 3 }, { word: 'microscope', emoji: '🔬', difficulty: 3 },
      { word: 'brain', emoji: '🧠', difficulty: 3 }, { word: 'heart', emoji: '🫀', difficulty: 3 },
      { word: 'violin', emoji: '🎻', difficulty: 3 }, { word: 'trumpet', emoji: '🎺', difficulty: 3 },
      { word: 'saxophone', emoji: '🎷', difficulty: 3 }, { word: 'rainbow', emoji: '🌈', difficulty: 3 },
      { word: 'galaxy', emoji: '🌌', difficulty: 3 }, { word: 'tornado', emoji: '🌪️', difficulty: 3 },
      { word: 'snake', emoji: '🐍', difficulty: 3 }, { word: 'crocodile', emoji: '🐊', difficulty: 3 },
      { word: 'rhino', emoji: '🦏', difficulty: 3 }, { word: 'hippo', emoji: '🦛', difficulty: 3 },
      { word: 'puzzle', emoji: '🧩', difficulty: 3 }, { word: 'stethoscope', emoji: '🩺', difficulty: 3 },
      { word: 'hamburger', emoji: '🍔', difficulty: 3 }, { word: 'dinosaur', emoji: '🦕', difficulty: 3 }
    ];

    this.allWords = this.currentLanguage === 'en' ? en : es;
    Logger.log(`📚 ${this.allWords.length} palabras cargadas (${this.currentLanguage})`);
  }

  // ============================================================
  // CAMBIAR IDIOMA
  // ============================================================
  changeLanguage(lang) {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    SessionManager.update({ language: lang });
    this._updateLangButtons(lang);
    this.loadWordsData();
  }

  // ============================================================
  // START GAME
  // ============================================================
  async startGame() {
    try {
      this.currentSpan       = this.currentDifficulty === 1 ? 2 : this.currentDifficulty === 2 ? 2 : 3;
      this.maxSpanReached    = 0;
      this.currentTrial      = 1;
      this.consecutiveErrors = 0;
      this.totalTrials       = 0;
      this.correctTrials     = 0;
      this.totalScore        = 0;
      this.allResponses      = [];
      this.gameOver          = false;
      this.phase             = 'idle';

      if (this.elements.scoreValue) this.elements.scoreValue.textContent = '0';

      this.gameStartTime = Date.now();
      this.startGameTimer();
      await this.createSession();

      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);

      const info = document.getElementById('activeSessionInfo');
      if (info) info.textContent =
        `${this.studentName} | ${this.currentLanguage.toUpperCase()} | Nivel ${this.currentDifficulty}`;

      await this.runTrial();
    } catch (e) {
      Logger.error('Error iniciando juego', e);
      alert('Error iniciando. Intenta de nuevo.');
    }
  }

  // ============================================================
  // CREATE SESSION (Firestore)
  // ============================================================
  async createSession() {
    try {
      const saved = SessionManager.load();
      const sessionData = {
        studentCode: this.studentCode,
        studentName: this.studentName,
        gameNumber: 2,
        gameName: 'Memoria de Trabajo Secuencial',
        language: this.currentLanguage,
        difficulty: this.currentDifficulty,
        weekNumber: saved?.weekNumber || 1,
        sessionType: saved?.sessionType || 'intervencion',
        status: 'in-progress',
        startedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      const ref = await db.collection('sessions').add(sessionData);
      this.currentSessionId = ref.id;
      Logger.log(`📝 Sesión creada: ${this.currentSessionId}`);
    } catch (e) {
      Logger.error('Error creando sesión', e);
    }
  }

  // ============================================================
  // CORE LOOP: RUN A TRIAL
  // ============================================================
  async runTrial() {
    if (this.gameOver) return;

    // Actualizar UI
    if (this.elements.spanLevel) this.elements.spanLevel.textContent = this.currentSpan;
    if (this.elements.trialNumber) this.elements.trialNumber.textContent = this.currentTrial;

    // Generar secuencia aleatoria de N palabras
    this.generateSequence();

    // FASE 1: Mostrar secuencia
    await this.showSequencePhase();

    // FASE 2: Recuerdo (espera input del usuario)
    this.startRecallPhase();
  }

  generateSequence() {
    // Filtrar por dificultad y seleccionar N palabras aleatorias sin repetir
    const pool = this.allWords.filter(w => w.difficulty <= this.currentDifficulty);
    const shuffled = this.shuffleArray([...pool]);
    this.currentSequence = shuffled.slice(0, this.currentSpan);
    this.playerSequence = [];
  }

  // ============================================================
  // FASE 1: MOSTRAR SECUENCIA (una por una)
  // ============================================================
  async showSequencePhase() {
    this.phase = 'showing';
    const display = this.elements.sequenceDisplay;
    const recallArea = this.elements.recallArea;

    if (recallArea) recallArea.style.display = 'none';
    if (display) display.style.display = 'flex';

    // Velocidad según dificultad
    const showTime = this.currentDifficulty === 1 ? 2000 : this.currentDifficulty === 2 ? 1500 : 1200;
    const pauseTime = 400;

    // Mostrar instrucción
    display.innerHTML = `<div class="sequence-instruction">
      <div class="instruction-icon">👀</div>
      <div class="instruction-text">${this.currentLanguage === 'es' ? '¡Observa y recuerda el orden!' : 'Watch and remember the order!'}</div>
      <div class="span-badge">Span: ${this.currentSpan}</div>
    </div>`;

    await this.wait(1500);

    // Mostrar cada ítem de la secuencia
    for (let i = 0; i < this.currentSequence.length; i++) {
      const item = this.currentSequence[i];

      display.innerHTML = `
        <div class="sequence-item-show" style="animation: popIn 0.4s ease">
          <div class="sequence-counter">${i + 1} / ${this.currentSequence.length}</div>
          <div class="sequence-emoji">${item.emoji}</div>
          <div class="sequence-word">${item.word}</div>
        </div>`;

      // Reproducir audio
      this.speak(item.word);

      await this.wait(showTime);

      // Breve pausa entre ítems
      if (i < this.currentSequence.length - 1) {
        display.innerHTML = '<div class="sequence-pause">...</div>';
        await this.wait(pauseTime);
      }
    }

    // Pantalla de transición
    display.innerHTML = `<div class="sequence-transition">
      <div class="transition-icon">🤔</div>
      <div class="transition-text">${this.currentLanguage === 'es'
        ? '¡Ahora repite el orden!'
        : 'Now repeat the order!'}</div>
    </div>`;
    await this.wait(1200);
  }

  // ============================================================
  // FASE 2: RECUERDO (jugador selecciona en orden)
  // ============================================================
  startRecallPhase() {
    this.phase = 'recalling';
    this.playerSequence = [];
    this.trialStartTime = Date.now();

    const display = this.elements.sequenceDisplay;
    const recallArea = this.elements.recallArea;

    if (display) display.style.display = 'none';
    if (recallArea) recallArea.style.display = 'block';

    // Crear slots vacíos para la respuesta del jugador
    this.renderPlayerSlots();

    // Crear opciones (secuencia mezclada + distractores)
    this.renderOptions();
  }

  renderPlayerSlots() {
    const container = this.elements.playerSlots;
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < this.currentSpan; i++) {
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.id = `slot-${i}`;
      slot.innerHTML = `<span class="slot-number">${i + 1}</span>`;
      container.appendChild(slot);
    }
  }

  renderOptions() {
    const container = this.elements.optionsGrid;
    if (!container) return;
    container.innerHTML = '';

    // Opciones = secuencia + algunos distractores (para que no sea trivial)
    const numDistractors = Math.min(3, this.allWords.length - this.currentSpan);
    const distractorPool = this.allWords.filter(w =>
      !this.currentSequence.some(s => s.word === w.word) && w.difficulty <= this.currentDifficulty
    );
    const distractors = this.shuffleArray([...distractorPool]).slice(0, numDistractors);

    this.availableOptions = this.shuffleArray([...this.currentSequence, ...distractors]);

    for (const item of this.availableOptions) {
      const card = document.createElement('button');
      card.className = 'recall-option';
      card.dataset.word = item.word;
      card.innerHTML = `
        <span class="option-emoji">${item.emoji}</span>
        <span class="option-word">${item.word}</span>
      `;
      card.addEventListener('click', () => this.handleOptionClick(item, card));
      container.appendChild(card);
    }
  }

  handleOptionClick(item, button) {
    if (this.phase !== 'recalling') return;

    // Añadir a la secuencia del jugador
    this.playerSequence.push(item);
    button.classList.add('option-selected');
    button.disabled = true;

    // Actualizar slot visual
    const slotIndex = this.playerSequence.length - 1;
    const slot = document.getElementById(`slot-${slotIndex}`);
    if (slot) {
      slot.innerHTML = `<span class="slot-emoji">${item.emoji}</span>`;
      slot.classList.add('slot-filled');
    }

    // Reproducir audio
    this.speak(item.word);

    // ¿Completó toda la secuencia?
    if (this.playerSequence.length >= this.currentSpan) {
      this.evaluateTrial();
    }
  }

  // ============================================================
  // EVALUAR INTENTO
  // ============================================================
  async evaluateTrial() {
    this.phase = 'feedback';
    this.totalTrials++;

    const reactionTime = Date.now() - this.trialStartTime;

    // Comprobar si la secuencia es correcta (en orden)
    let correct = true;
    let correctItems = 0;
    for (let i = 0; i < this.currentSpan; i++) {
      if (this.playerSequence[i]?.word === this.currentSequence[i]?.word) {
        correctItems++;
      } else {
        correct = false;
      }
    }

    const accuracy = (correctItems / this.currentSpan) * 100;

    // Guardar respuesta
    const response = {
      spanLevel: this.currentSpan,
      trial: this.currentTrial,
      isCorrect: correct,
      correctItems,
      totalItems: this.currentSpan,
      accuracy,
      reactionTime,
      sequence: this.currentSequence.map(s => s.word),
      playerAnswer: this.playerSequence.map(s => s.word),
      timestamp: new Date().toISOString()
    };
    this.allResponses.push(response);
    await this.saveResponse(response);

    // Feedback visual
    await this.showTrialFeedback(correct, correctItems);

    if (correct) {
      this.correctTrials++;
      this.totalScore += this.currentSpan * 10;
      if (this.elements.scoreValue) this.elements.scoreValue.textContent = this.totalScore;

      // Span alcanzado correctamente
      if (this.currentSpan > this.maxSpanReached) {
        this.maxSpanReached = this.currentSpan;
      }

      // Subir span, resetear intentos
      this.currentSpan++;
      this.currentTrial = 1;
      this.consecutiveErrors = 0;

      // Límite máximo de span según dificultad
      const maxSpanLimit = this.currentDifficulty === 1 ? 5 : this.currentDifficulty === 2 ? 7 : 9;
      if (this.currentSpan > maxSpanLimit) {
        this.maxSpanReached = maxSpanLimit;
        await this.endGame();
        return;
      }

      await this.wait(1500);
      await this.runTrial();
    } else {
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= 2) {
        // 2 errores en el mismo nivel → fin del juego
        if (this.maxSpanReached === 0) this.maxSpanReached = Math.max(1, this.currentSpan - 1);
        await this.endGame();
      } else {
        // Segundo intento en el mismo nivel
        this.currentTrial = 2;
        await this.wait(2000);
        await this.runTrial();
      }
    }
  }

  async showTrialFeedback(correct, correctItems) {
    const banner = this.elements.feedbackBanner;
    if (!banner) return;

    if (correct) {
      banner.className = 'feedback-banner feedback-correct';
      banner.innerHTML = `
        <div class="feedback-icon">🎉</div>
        <div class="feedback-text">${this.currentLanguage === 'es' ? '¡Perfecto! ¡Orden correcto!' : 'Perfect! Right order!'}</div>
        <div class="feedback-detail">Span ${this.currentSpan} ✓</div>
      `;

      // Marcar slots como correctos
      for (let i = 0; i < this.currentSpan; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (slot) slot.classList.add('slot-correct');
      }
    } else {
      banner.className = 'feedback-banner feedback-wrong';

      // Mostrar la secuencia correcta
      const correctSeq = this.currentSequence.map((s, i) =>
        `<span class="correct-item">${i + 1}. ${s.emoji}</span>`
      ).join(' ');

      banner.innerHTML = `
        <div class="feedback-icon">😮</div>
        <div class="feedback-text">${this.currentLanguage === 'es'
          ? `${correctItems}/${this.currentSpan} correctos`
          : `${correctItems}/${this.currentSpan} correct`}</div>
        <div class="feedback-detail">${this.currentLanguage === 'es' ? 'El orden correcto era:' : 'The correct order was:'}</div>
        <div class="correct-sequence">${correctSeq}</div>
      `;

      // Marcar slots correctos/incorrectos
      for (let i = 0; i < this.currentSpan; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (!slot) continue;
        if (this.playerSequence[i]?.word === this.currentSequence[i]?.word) {
          slot.classList.add('slot-correct');
        } else {
          slot.classList.add('slot-wrong');
        }
      }
    }

    banner.style.display = 'block';
    await this.wait(correct ? 1200 : 2500);
    banner.style.display = 'none';
  }

  // ============================================================
  // END GAME
  // ============================================================
  async endGame() {
    this.gameOver = true;
    this.phase = 'idle';

    clearInterval(this.timerInterval);
    this.gameTotalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);

    const accuracy = this.totalTrials > 0
      ? ((this.correctTrials / this.totalTrials) * 100).toFixed(1)
      : 0;

    // Mostrar resultados
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);

    if (this.elements.finalSpan) this.elements.finalSpan.textContent = this.maxSpanReached;
    if (this.elements.finalTrials) this.elements.finalTrials.textContent = `${this.correctTrials}/${this.totalTrials}`;
    if (this.elements.finalAccuracy) this.elements.finalAccuracy.textContent = `${accuracy}%`;
    if (this.elements.finalScore) this.elements.finalScore.textContent = this.totalScore;
    if (this.elements.finalTime) {
      const m = Math.floor(this.gameTotalTime / 60);
      const s = this.gameTotalTime % 60;
      this.elements.finalTime.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }

    // Mensaje personalizado según span
    if (this.elements.endMessage) {
      let msg = '';
      if (this.maxSpanReached >= 6) msg = this.currentLanguage === 'es' ? '🏆 ¡Memoria increíble! ¡Eres un campeón!' : '🏆 Amazing memory! You are a champion!';
      else if (this.maxSpanReached >= 4) msg = this.currentLanguage === 'es' ? '⭐ ¡Muy bien! ¡Gran memoria!' : '⭐ Great job! Awesome memory!';
      else msg = this.currentLanguage === 'es' ? '💪 ¡Buen intento! ¡Sigue practicando!' : '💪 Good try! Keep practicing!';
      this.elements.endMessage.textContent = msg;
    }

    // Actualizar sesión en Firestore
    await this.updateSession(accuracy);
  }

  async updateSession(accuracy) {
    if (!this.currentSessionId) return;
    try {
      await db.collection('sessions').doc(this.currentSessionId).update({
        status: 'completed',
        maxSpan: this.maxSpanReached,
        totalTrials: this.totalTrials,
        correctTrials: this.correctTrials,
        accuracy: parseFloat(accuracy),
        totalScore: this.totalScore,
        totalGameTime: this.gameTotalTime,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Actualizar estudiante
      await db.collection('students').doc(this.studentCode).update({
        'gamesCompleted': firebase.firestore.FieldValue.arrayUnion(2),
        lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      Logger.error('Error actualizando sesión', e);
    }
  }

  async saveResponse(response) {
    if (!this.currentSessionId) return;
    try {
      await db.collection('sessions').doc(this.currentSessionId)
        .collection('responses').add(response);
    } catch (e) {
      Logger.error('Error guardando respuesta', e);
    }
  }

  // ============================================================
  // RESET & NAVIGATION
  // ============================================================
  resetGame() {
    clearInterval(this.timerInterval);
    const timer = document.getElementById('gameTimer');
    if (timer) timer.style.display = 'none';

    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.startScreen);
  }

  goToNextGame() {
    const params = new URLSearchParams({
      code: this.studentCode || '',
      lang: this.currentLanguage,
      diff: this.currentDifficulty
    });
    window.location.href = `game3.html?${params.toString()}`;
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  speak(text) {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = this.currentLanguage === 'en' ? 'en-US' : 'es-ES';
        u.rate = 0.85;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) { /* Silenciar errores TTS */ }
  }

  startGameTimer() {
    let el = document.getElementById('gameTimer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gameTimer';
      el.className = 'game-timer';
      document.body.appendChild(el);
    }
    el.style.display = 'block';
    this.timerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - this.gameStartTime) / 1000);
      el.innerHTML = `⏱️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);
  }
}
