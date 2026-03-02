// js/game4.js
// ================================================================
// Juego 4: Palabras Saltarinas – Reconocimiento Rápido de Palabras
// Constructo: RECONOCIMIENTO AUTOMÁTICO DE PALABRAS / WPM
// Paradigma: Emparejamiento rápido palabra-imagen
//
// Mecánica:
//   1. Se muestra una PALABRA escrita en pantalla con audio
//   2. Se muestran 4 opciones de imágenes (1 correcta + 3 distractores)
//   3. El niño toca la imagen correcta lo más rápido posible
//   4. Se mide: tiempo de reacción por palabra + precisión total
//   5. Métrica principal: WPM (words per minute) = aciertos / minutos
// ================================================================

class PalabrasSaltarinasGame {
  constructor() {
    this.currentSessionId = null;
    this.studentCode      = null;
    this.studentName      = null;
    this.currentLanguage  = 'es';
    this.currentDifficulty = 2;

    // Estado del juego
    this.totalQuestions    = 20;  // 20 palabras por sesión
    this.currentQuestion   = 0;
    this.correctAnswers    = 0;
    this.totalScore        = 0;
    this.wordsPerMinute    = 0;
    this.gameOver          = false;

    // Datos
    this.allWords          = [];
    this.sessionWords      = []; // 20 palabras seleccionadas para esta sesión
    this.currentWord       = null;
    this.currentOptions    = []; // 4 opciones de imagen

    // Tiempos
    this.gameStartTime     = null;
    this.gameTotalTime     = 0;
    this.timerInterval     = null;
    this.questionStartTime = null;
    this.totalReactionTime = 0;

    // Respuestas para Firestore
    this.allResponses = [];
    this.timeTracker  = new TimeTracker();

    this.elements = {};
  }

  // ============================================================
  // INIT
  // ============================================================
  async init() {
    Logger.log('⚡ Inicializando Palabras Saltarinas (WPM)...');
    try {
      this.checkStudentCode();
      this.cacheElements();
      this.loadWordsData();
      this.setupEventListeners();
      Logger.log('✅ Juego 4 inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego 4', error);
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
      wordDisplay:    document.getElementById('wordDisplay'),
      audioBtn:       document.getElementById('audioBtn'),
      optionsGrid:    document.getElementById('optionsGrid'),
      progressBar:    document.getElementById('progressBar'),
      progressText:   document.getElementById('progressText'),
      feedbackBanner: document.getElementById('feedbackBanner'),
      liveWpm:        document.getElementById('liveWpm'),
      finalWpm:       document.getElementById('finalWpm'),
      finalCorrect:   document.getElementById('finalCorrect'),
      finalAccuracy:  document.getElementById('finalAccuracy'),
      finalAvgTime:   document.getElementById('finalAvgTime'),
      finalScore:     document.getElementById('finalScore'),
      finalTime:      document.getElementById('finalTime'),
      endMessage:     document.getElementById('endMessage'),
      restartBtn:     document.getElementById('restartBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };
  }

  setupEventListeners() {
    const form = document.getElementById('studentCodeForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.handleStudentCodeSubmit(); });

    if (this.elements.langBtnEs) this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    if (this.elements.langBtnEn) this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));
    if (this.elements.audioBtn)  this.elements.audioBtn.addEventListener('click', () => this.speakCurrentWord());
    if (this.elements.restartBtn) this.elements.restartBtn.addEventListener('click', () => this.resetGame());

    const goHome = document.getElementById('goHomeBtn');
    if (goHome) goHome.addEventListener('click', () => { window.location.href = 'index.html'; });
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
  // WORD DATA
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
      { word: 'nube', emoji: '☁️', difficulty: 1 }, { word: 'pan', emoji: '🍞', difficulty: 1 },
      { word: 'leche', emoji: '🥛', difficulty: 1 }, { word: 'huevo', emoji: '🥚', difficulty: 1 },
      { word: 'mano', emoji: '✋', difficulty: 1 }, { word: 'pie', emoji: '🦶', difficulty: 1 },
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
      { word: 'corona', emoji: '👑', difficulty: 2 }, { word: 'diamante', emoji: '💎', difficulty: 2 },
      { word: 'campana', emoji: '🔔', difficulty: 2 }, { word: 'paraguas', emoji: '☂️', difficulty: 2 },
      { word: 'reloj', emoji: '⏰', difficulty: 2 }, { word: 'cámara', emoji: '📷', difficulty: 2 },
      { word: 'cohete', emoji: '🚀', difficulty: 3 }, { word: 'castillo', emoji: '🏰', difficulty: 3 },
      { word: 'telescopio', emoji: '🔭', difficulty: 3 }, { word: 'microscopio', emoji: '🔬', difficulty: 3 },
      { word: 'cerebro', emoji: '🧠', difficulty: 3 }, { word: 'corazón', emoji: '🫀', difficulty: 3 },
      { word: 'violín', emoji: '🎻', difficulty: 3 }, { word: 'trompeta', emoji: '🎺', difficulty: 3 },
      { word: 'saxofón', emoji: '🎷', difficulty: 3 }, { word: 'arcoíris', emoji: '🌈', difficulty: 3 },
      { word: 'galaxia', emoji: '🌌', difficulty: 3 }, { word: 'tornado', emoji: '🌪️', difficulty: 3 },
      { word: 'serpiente', emoji: '🐍', difficulty: 3 }, { word: 'cocodrilo', emoji: '🐊', difficulty: 3 },
      { word: 'rinoceronte', emoji: '🦏', difficulty: 3 }, { word: 'hipopótamo', emoji: '🦛', difficulty: 3 },
      { word: 'rompecabezas', emoji: '🧩', difficulty: 3 }, { word: 'estetoscopio', emoji: '🩺', difficulty: 3 },
      { word: 'hamburguesa', emoji: '🍔', difficulty: 3 }, { word: 'dinosaurio', emoji: '🦕', difficulty: 3 },
      { word: 'helicóptero', emoji: '🚁', difficulty: 3 }, { word: 'submarino', emoji: '🛥️', difficulty: 3 },
      { word: 'volcán', emoji: '🌋', difficulty: 3 }, { word: 'acuario', emoji: '🐠', difficulty: 3 },
      { word: 'laboratorio', emoji: '🧪', difficulty: 3 }, { word: 'astronauta', emoji: '🧑‍🚀', difficulty: 3 }
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
      { word: 'cloud', emoji: '☁️', difficulty: 1 }, { word: 'bread', emoji: '🍞', difficulty: 1 },
      { word: 'milk', emoji: '🥛', difficulty: 1 }, { word: 'egg', emoji: '🥚', difficulty: 1 },
      { word: 'hand', emoji: '✋', difficulty: 1 }, { word: 'foot', emoji: '🦶', difficulty: 1 },
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
      { word: 'crown', emoji: '👑', difficulty: 2 }, { word: 'diamond', emoji: '💎', difficulty: 2 },
      { word: 'bell', emoji: '🔔', difficulty: 2 }, { word: 'umbrella', emoji: '☂️', difficulty: 2 },
      { word: 'clock', emoji: '⏰', difficulty: 2 }, { word: 'camera', emoji: '📷', difficulty: 2 },
      { word: 'rocket', emoji: '🚀', difficulty: 3 }, { word: 'castle', emoji: '🏰', difficulty: 3 },
      { word: 'telescope', emoji: '🔭', difficulty: 3 }, { word: 'microscope', emoji: '🔬', difficulty: 3 },
      { word: 'brain', emoji: '🧠', difficulty: 3 }, { word: 'heart', emoji: '🫀', difficulty: 3 },
      { word: 'violin', emoji: '🎻', difficulty: 3 }, { word: 'trumpet', emoji: '🎺', difficulty: 3 },
      { word: 'saxophone', emoji: '🎷', difficulty: 3 }, { word: 'rainbow', emoji: '🌈', difficulty: 3 },
      { word: 'galaxy', emoji: '🌌', difficulty: 3 }, { word: 'tornado', emoji: '🌪️', difficulty: 3 },
      { word: 'snake', emoji: '🐍', difficulty: 3 }, { word: 'crocodile', emoji: '🐊', difficulty: 3 },
      { word: 'rhino', emoji: '🦏', difficulty: 3 }, { word: 'hippo', emoji: '🦛', difficulty: 3 },
      { word: 'puzzle', emoji: '🧩', difficulty: 3 }, { word: 'stethoscope', emoji: '🩺', difficulty: 3 },
      { word: 'hamburger', emoji: '🍔', difficulty: 3 }, { word: 'dinosaur', emoji: '🦕', difficulty: 3 },
      { word: 'helicopter', emoji: '🚁', difficulty: 3 }, { word: 'submarine', emoji: '🛥️', difficulty: 3 },
      { word: 'volcano', emoji: '🌋', difficulty: 3 }, { word: 'aquarium', emoji: '🐠', difficulty: 3 },
      { word: 'laboratory', emoji: '🧪', difficulty: 3 }, { word: 'astronaut', emoji: '🧑‍🚀', difficulty: 3 }
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
  // START GAME
  // ============================================================
  async startGame() {
    try {
      this.currentQuestion   = 0;
      this.correctAnswers    = 0;
      this.totalScore        = 0;
      this.wordsPerMinute    = 0;
      this.totalReactionTime = 0;
      this.allResponses      = [];
      this.gameOver           = false;

      if (this.elements.scoreValue) this.elements.scoreValue.textContent = '0';

      // Seleccionar las 20 palabras de la sesión
      this.selectSessionWords();

      this.gameStartTime = Date.now();
      this.startGameTimer();
      await this.createSession();

      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);

      const info = document.getElementById('activeSessionInfo');
      if (info) info.textContent =
        `${this.studentName} | ${this.currentLanguage.toUpperCase()} | Nivel ${this.currentDifficulty}`;

      await this.showNextWord();
    } catch (e) {
      Logger.error('Error iniciando juego', e);
      alert('Error iniciando. Intenta de nuevo.');
    }
  }

  selectSessionWords() {
    const pool = this.allWords.filter(w => w.difficulty <= this.currentDifficulty);
    const shuffled = this.shuffleArray([...pool]);
    this.sessionWords = shuffled.slice(0, this.totalQuestions);
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
        gameNumber: 4,
        gameName: 'Palabras Saltarinas – Reconocimiento Rápido',
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
  // SHOW NEXT WORD
  // ============================================================
  async showNextWord() {
    if (this.currentQuestion >= this.totalQuestions || this.gameOver) {
      await this.endGame();
      return;
    }

    this.currentWord = this.sessionWords[this.currentQuestion];

    // Actualizar progreso
    this.updateProgress();

    // Mostrar la palabra
    if (this.elements.wordDisplay) {
      this.elements.wordDisplay.innerHTML = `
        <div class="word-target" style="animation: wordBounce 0.6s ease">
          <span class="word-text">${this.currentWord.word}</span>
        </div>
      `;
    }

    // Reproducir audio automáticamente
    this.speakCurrentWord();

    // Generar 4 opciones (1 correcta + 3 distractores)
    this.generateOptions();
    this.renderOptions();

    // Registrar tiempo de inicio
    this.questionStartTime = Date.now();
  }

  generateOptions() {
    // Obtener 3 distractores del mismo nivel de dificultad
    const distractorPool = this.allWords.filter(w =>
      w.word !== this.currentWord.word && w.difficulty <= this.currentDifficulty
    );
    const distractors = this.shuffleArray([...distractorPool]).slice(0, 3);

    // Mezclar opciones
    this.currentOptions = this.shuffleArray([this.currentWord, ...distractors]);
  }

  renderOptions() {
    const grid = this.elements.optionsGrid;
    if (!grid) return;
    grid.innerHTML = '';

    for (const option of this.currentOptions) {
      const card = document.createElement('button');
      card.className = 'word-option-card';
      card.dataset.word = option.word;
      card.innerHTML = `
        <span class="option-emoji-large">${option.emoji}</span>
        <span class="option-label">${option.word}</span>
      `;
      card.addEventListener('click', () => this.handleAnswer(option, card));
      grid.appendChild(card);
    }
  }

  // ============================================================
  // HANDLE ANSWER
  // ============================================================
  async handleAnswer(selectedOption, card) {
    if (this.gameOver) return;

    const reactionTime = Date.now() - this.questionStartTime;
    const isCorrect = selectedOption.word === this.currentWord.word;

    this.totalReactionTime += reactionTime;
    this.currentQuestion++;

    if (isCorrect) {
      this.correctAnswers++;
      const points = Math.max(10, 50 - Math.floor(reactionTime / 100));
      this.totalScore += points;
      if (this.elements.scoreValue) this.elements.scoreValue.textContent = this.totalScore;
    }

    // Calcular WPM en tiempo real
    const elapsedMinutes = (Date.now() - this.gameStartTime) / 60000;
    this.wordsPerMinute = elapsedMinutes > 0
      ? Math.round(this.correctAnswers / elapsedMinutes)
      : 0;
    if (this.elements.liveWpm) this.elements.liveWpm.textContent = this.wordsPerMinute;

    // Guardar respuesta
    const response = {
      questionNumber: this.currentQuestion,
      targetWord: this.currentWord.word,
      targetEmoji: this.currentWord.emoji,
      selectedWord: selectedOption.word,
      selectedEmoji: selectedOption.emoji,
      isCorrect,
      reactionTime,
      difficulty: this.currentWord.difficulty,
      timestamp: new Date().toISOString()
    };
    this.allResponses.push(response);
    await this.saveResponse(response);

    // Feedback visual
    await this.showFeedback(isCorrect, card, reactionTime);

    // Siguiente palabra
    await this.showNextWord();
  }

  async showFeedback(isCorrect, card, reactionTime) {
    // Marcar opción seleccionada
    if (isCorrect) {
      card.classList.add('option-correct');
    } else {
      card.classList.add('option-wrong');
      // Resaltar la correcta
      const cards = this.elements.optionsGrid.querySelectorAll('.word-option-card');
      cards.forEach(c => {
        if (c.dataset.word === this.currentWord.word) c.classList.add('option-correct');
      });
    }

    // Banner de feedback
    const banner = this.elements.feedbackBanner;
    if (banner) {
      const timeStr = (reactionTime / 1000).toFixed(1);

      if (isCorrect) {
        banner.className = 'feedback-banner feedback-correct';
        let speedMsg = '';
        if (reactionTime < 1500) speedMsg = this.currentLanguage === 'es' ? '⚡ ¡Rapidísimo!' : '⚡ Super fast!';
        else if (reactionTime < 3000) speedMsg = this.currentLanguage === 'es' ? '🎯 ¡Bien!' : '🎯 Good!';
        else speedMsg = this.currentLanguage === 'es' ? '✅ Correcto' : '✅ Correct';

        banner.innerHTML = `
          <div class="feedback-text">${speedMsg}</div>
          <div class="feedback-detail">${timeStr}s</div>
        `;
      } else {
        banner.className = 'feedback-banner feedback-wrong';
        banner.innerHTML = `
          <div class="feedback-text">${this.currentLanguage === 'es' ? '❌ Era:' : '❌ It was:'} ${this.currentWord.emoji} ${this.currentWord.word}</div>
        `;
      }
      banner.style.display = 'block';
      await this.wait(isCorrect ? 800 : 1500);
      banner.style.display = 'none';
    } else {
      await this.wait(isCorrect ? 500 : 1200);
    }
  }

  updateProgress() {
    if (this.elements.progressBar) {
      const pct = ((this.currentQuestion) / this.totalQuestions) * 100;
      this.elements.progressBar.style.width = `${pct}%`;
    }
    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${this.currentQuestion + 1} / ${this.totalQuestions}`;
    }
  }

  // ============================================================
  // END GAME
  // ============================================================
  async endGame() {
    this.gameOver = true;
    clearInterval(this.timerInterval);
    this.gameTotalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);

    const elapsedMinutes = this.gameTotalTime / 60;
    this.wordsPerMinute = elapsedMinutes > 0
      ? Math.round(this.correctAnswers / elapsedMinutes)
      : 0;

    const accuracy = this.totalQuestions > 0
      ? ((this.correctAnswers / this.totalQuestions) * 100).toFixed(1)
      : 0;

    const avgReaction = this.totalQuestions > 0
      ? Math.round(this.totalReactionTime / this.totalQuestions)
      : 0;

    // Mostrar resultados
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);

    if (this.elements.finalWpm)      this.elements.finalWpm.textContent = this.wordsPerMinute;
    if (this.elements.finalCorrect)  this.elements.finalCorrect.textContent = `${this.correctAnswers}/${this.totalQuestions}`;
    if (this.elements.finalAccuracy) this.elements.finalAccuracy.textContent = `${accuracy}%`;
    if (this.elements.finalAvgTime)  this.elements.finalAvgTime.textContent = `${(avgReaction / 1000).toFixed(1)}s`;
    if (this.elements.finalScore)    this.elements.finalScore.textContent = this.totalScore;
    if (this.elements.finalTime) {
      const m = Math.floor(this.gameTotalTime / 60);
      const s = this.gameTotalTime % 60;
      this.elements.finalTime.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }

    // Mensaje personalizado según WPM
    if (this.elements.endMessage) {
      let msg = '';
      if (this.wordsPerMinute >= 40) msg = this.currentLanguage === 'es' ? '🏆 ¡Lees con fluidez increíble!' : '🏆 You read with amazing fluency!';
      else if (this.wordsPerMinute >= 20) msg = this.currentLanguage === 'es' ? '⭐ ¡Muy bien! ¡Buena velocidad!' : '⭐ Great job! Good speed!';
      else msg = this.currentLanguage === 'es' ? '💪 ¡Sigue practicando! ¡Lo haces genial!' : '💪 Keep practicing! You are doing great!';
      this.elements.endMessage.textContent = msg;
    }

    // Actualizar sesión en Firestore
    await this.updateSession(accuracy, avgReaction);
  }

  async updateSession(accuracy, avgReaction) {
    if (!this.currentSessionId) return;
    try {
      await db.collection('sessions').doc(this.currentSessionId).update({
        status: 'completed',
        wordsPerMinute: this.wordsPerMinute,
        correctAnswers: this.correctAnswers,
        totalQuestions: this.totalQuestions,
        accuracy: parseFloat(accuracy),
        averageReactionTime: avgReaction,
        totalScore: this.totalScore,
        totalGameTime: this.gameTotalTime,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await db.collection('students').doc(this.studentCode).update({
        'gamesCompleted': firebase.firestore.FieldValue.arrayUnion(4),
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

  speakCurrentWord() {
    if (this.currentWord) this.speak(this.currentWord.word);
  }

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
