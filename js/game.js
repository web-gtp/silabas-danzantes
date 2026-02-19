// frontend/js/game.js
// Lógica principal del juego - VERSIÓN COMPLETA CON 300 PALABRAS

class SilabasDanzantesGame {
  constructor() {
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
    this.studentCode = null;
    this.studentName = null;
    this.studentAge = null;
    this.studentGender = null;
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    this.timerInterval = null;
    this.timeTracker = new TimeTracker();
    this.elements = {};
    this.isAnswered = false;
    this.isLoadingStimuli = false;
  }

  async init() {
    Logger.log('🎮 Inicializando Sílabas Danzantes...');
    try {
      this.cacheElements();
      await this.loadStimuli();
      this.setupEventListeners();
      DOMUtils.show(this.elements.startScreen);
      Logger.log('✅ Juego inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego', error);
      alert('Error inicializando el juego. Por favor recarga la página.');
    }
  }

  cacheElements() {
    this.elements = {
      startScreen: document.getElementById('startScreen'),
      gameScreen: document.getElementById('gameScreen'),
      feedbackScreen: document.getElementById('feedbackScreen'),
      endScreen: document.getElementById('endScreen'),
      scoreValue: document.getElementById('scoreValue'),
      langBtnEs: document.getElementById('langBtnEs'),
      langBtnEn: document.getElementById('langBtnEn'),
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
      feedbackContent: document.getElementById('feedbackContent'),
      nextBtn: document.getElementById('nextBtn'),
      finalAccuracy: document.getElementById('finalAccuracy'),
      finalAvgTime: document.getElementById('finalAvgTime'),
      finalScore: document.getElementById('finalScore'),
      endMessage: document.getElementById('endMessage'),
      restartBtn: document.getElementById('restartBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };
    Logger.log('✅ Elementos del DOM cacheados');
  }

  setupEventListeners() {
    const participantForm = document.getElementById('participantForm');
    if (participantForm) {
      participantForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleParticipantSubmit();
      });
    }
    this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));
    this.elements.playAudioBtn.addEventListener('click', () => this.playCurrentAudio());
    this.elements.undoBtn.addEventListener('click', () => this.undoLastSyllable());
    this.elements.checkBtn.addEventListener('click', () => this.checkAnswer());
    this.elements.nextBtn.addEventListener('click', () => this.handleNextQuestion());
    this.elements.restartBtn.addEventListener('click', () => this.resetGame());
    Logger.log('✅ Event listeners configurados');
  }

  async handleParticipantSubmit() {
    try {
      const studentCode = document.getElementById('studentCode').value.trim().toUpperCase();
      const name = document.getElementById('participantName').value.trim();
      const age = document.getElementById('participantAge').value;
      const gender = document.getElementById('participantGender').value || 'No especificado';

      if (!studentCode || studentCode.length < 3) {
        alert('Por favor ingresa tu código de estudiante 🎫');
        return;
      }
      if (!name || name.length < 2) {
        alert('Por favor escribe tu nombre 😊');
        return;
      }
      if (!age) {
        alert('Por favor selecciona tu edad 🎂');
        return;
      }

      this.studentCode = studentCode;
      this.studentName = name;
      this.studentAge = parseInt(age);
      this.studentGender = gender;

      Logger.log(`✅ Estudiante: ${name} (${studentCode})`);
      DOMUtils.showLoading();

      try {
        const studentRef = db.collection('students').doc(studentCode);
        const studentDoc = await studentRef.get();

        if (studentDoc.exists) {
          await studentRef.update({
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalSessions: firebase.firestore.FieldValue.increment(1)
          });
          Logger.log('👤 Estudiante encontrado y actualizado');
        } else {
          await studentRef.set({
            code: studentCode,
            name: name,
            age: parseInt(age),
            gender: gender,
            totalSessions: 1,
            gamesCompleted: [],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          Logger.log('✨ Nuevo estudiante creado');
        }
      } catch (error) {
        Logger.error('Error guardando estudiante en Firebase', error);
      }

      DOMUtils.hideLoading();
      await this.startGame();

    } catch (error) {
      Logger.error('Error en formulario', error);
      alert('Hubo un error. Intenta de nuevo.');
      DOMUtils.hideLoading();
    }
  }

  async loadStimuli() {
    if (this.isLoadingStimuli) return;
    this.isLoadingStimuli = true;
    DOMUtils.showLoading();

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
        this.stimuli.push({ id: doc.id, ...doc.data() });
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
        // ========== NIVEL 1 (FÁCIL): 50 PALABRAS - 1-2 SÍLABAS ==========
        { id: "es_f001", word: "sol", syllables: ["sol"], image: "https://via.placeholder.com/300x200/F5A623/FFFFFF?text=☀️+Sol", difficulty: 1, language: "es" },
        { id: "es_f002", word: "mar", syllables: ["mar"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🌊+Mar", difficulty: 1, language: "es" },
        { id: "es_f003", word: "pan", syllables: ["pan"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍞+Pan", difficulty: 1, language: "es" },
        { id: "es_f004", word: "pez", syllables: ["pez"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🐟+Pez", difficulty: 1, language: "es" },
        { id: "es_f005", word: "luz", syllables: ["luz"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=💡+Luz", difficulty: 1, language: "es" },
        { id: "es_f006", word: "flor", syllables: ["flor"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌸+Flor", difficulty: 1, language: "es" },
        { id: "es_f007", word: "gato", syllables: ["ga", "to"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐱+Gato", difficulty: 1, language: "es" },
        { id: "es_f008", word: "casa", syllables: ["ca", "sa"], image: "https://via.placeholder.com/300x200/E24A4A/FFFFFF?text=🏠+Casa", difficulty: 1, language: "es" },
        { id: "es_f009", word: "perro", syllables: ["pe", "rro"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐶+Perro", difficulty: 1, language: "es" },
        { id: "es_f010", word: "luna", syllables: ["lu", "na"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🌙+Luna", difficulty: 1, language: "es" },
        { id: "es_f011", word: "mesa", syllables: ["me", "sa"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=⬜+Mesa", difficulty: 1, language: "es" },
        { id: "es_f012", word: "silla", syllables: ["si", "lla"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🪑+Silla", difficulty: 1, language: "es" },
        { id: "es_f013", word: "libro", syllables: ["li", "bro"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=📖+Libro", difficulty: 1, language: "es" },
        { id: "es_f014", word: "niño", syllables: ["ni", "ño"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👦+Niño", difficulty: 1, language: "es" },
        { id: "es_f015", word: "boca", syllables: ["bo", "ca"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=👄+Boca", difficulty: 1, language: "es" },
        { id: "es_f016", word: "mano", syllables: ["ma", "no"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=✋+Mano", difficulty: 1, language: "es" },
        { id: "es_f017", word: "pelo", syllables: ["pe", "lo"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=💇+Pelo", difficulty: 1, language: "es" },
        { id: "es_f018", word: "agua", syllables: ["a", "gua"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=💧+Agua", difficulty: 1, language: "es" },
        { id: "es_f019", word: "cama", syllables: ["ca", "ma"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🛏️+Cama", difficulty: 1, language: "es" },
        { id: "es_f020", word: "vaca", syllables: ["va", "ca"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐄+Vaca", difficulty: 1, language: "es" },
        { id: "es_f021", word: "pato", syllables: ["paF", "to"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦆+Pato", difficulty: 1, language: "es" },
        { id: "es_f022", word: "sapo", syllables: ["sa", "po"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐸+Sapo", difficulty: 1, language: "es" },
        { id: "es_f023", word: "oso", syllables: ["o", "so"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐻+Oso", difficulty: 1, language: "es" },
        { id: "es_f024", word: "lobo", syllables: ["lo", "bo"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐺+Lobo", difficulty: 1, language: "es" },
        { id: "es_f025", word: "rata", syllables: ["ra", "ta"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐀+Rata", difficulty: 1, language: "es" },
        { id: "es_f026", word: "loro", syllables: ["lo", "ro"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🦜+Loro", difficulty: 1, language: "es" },
        { id: "es_f027", word: "puma", syllables: ["pu", "ma"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐆+Puma", difficulty: 1, language: "es" },
        { id: "es_f028", word: "coco", syllables: ["co", "co"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🥥+Coco", difficulty: 1, language: "es" },
        { id: "es_f029", word: "uva", syllables: ["u", "va"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🍇+Uva", difficulty: 1, language: "es" },
        { id: "es_f030", word: "pera", syllables: ["pe", "ra"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🍐+Pera", difficulty: 1, language: "es" },
        { id: "es_f031", word: "piña", syllables: ["pi", "ña"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍍+Piña", difficulty: 1, language: "es" },
        { id: "es_f032", word: "toro", syllables: ["to", "ro"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐂+Toro", difficulty: 1, language: "es" },
        { id: "es_f033", word: "rosa", syllables: ["ro", "sa"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌹+Rosa", difficulty: 1, language: "es" },
        { id: "es_f034", word: "nube", syllables: ["nu", "be"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=☁️+Nube", difficulty: 1, language: "es" },
        { id: "es_f035", word: "dedo", syllables: ["de", "do"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=☝️+Dedo", difficulty: 1, language: "es" },
        { id: "es_f036", word: "codo", syllables: ["co", "do"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=💪+Codo", difficulty: 1, language: "es" },
        { id: "es_f037", word: "pie", syllables: ["pie"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦶+Pie", difficulty: 1, language: "es" },
        { id: "es_f038", word: "ojo", syllables: ["o", "jo"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👁️+Ojo", difficulty: 1, language: "es" },
        { id: "es_f039", word: "cara", syllables: ["ca", "ra"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=😊+Cara", difficulty: 1, language: "es" },
        { id: "es_f040", word: "ropa", syllables: ["ro", "pa"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=👕+Ropa", difficulty: 1, language: "es" },
        { id: "es_f041", word: "mono", syllables: ["mo", "no"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐵+Mono", difficulty: 1, language: "es" },
        { id: "es_f042", word: "foca", syllables: ["fo", "ca"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🦭+Foca", difficulty: 1, language: "es" },
        { id: "es_f043", word: "tubo", syllables: ["tu", "bo"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔧+Tubo", difficulty: 1, language: "es" },
        { id: "es_f044", word: "lana", syllables: ["la", "na"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🧶+Lana", difficulty: 1, language: "es" },
        { id: "es_f045", word: "palo", syllables: ["pa", "lo"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🪵+Palo", difficulty: 1, language: "es" },
        { id: "es_f046", word: "sopa", syllables: ["so", "pa"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍲+Sopa", difficulty: 1, language: "es" },
        { id: "es_f047", word: "bote", syllables: ["bo", "te"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=⛵+Bote", difficulty: 1, language: "es" },
        { id: "es_f048", word: "taza", syllables: ["ta", "za"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=☕+Taza", difficulty: 1, language: "es" },
        { id: "es_f049", word: "cuna", syllables: ["cu", "na"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍼+Cuna", difficulty: 1, language: "es" },
        { id: "es_f050", word: "lupa", syllables: ["lu", "pa"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🔍+Lupa", difficulty: 1, language: "es" },
        { id: "es_f051", word: "tren", syllables: ["tren"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🚂+Tren", difficulty: 1, language: "es" },

        // ========== NIVEL 2 (NORMAL): 50 PALABRAS - 3 SÍLABAS ==========
        { id: "es_n001", word: "pelota", syllables: ["pe", "lo", "ta"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=⚽+Pelota", difficulty: 2, language: "es" },
        { id: "es_n002", word: "zapato", syllables: ["za", "pa", "to"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=👟+Zapato", difficulty: 2, language: "es" },
        { id: "es_n003", word: "camisa", syllables: ["ca", "mi", "sa"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👔+Camisa", difficulty: 2, language: "es" },
        { id: "es_n004", word: "ventana", syllables: ["ven", "ta", "na"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🪟+Ventana", difficulty: 2, language: "es" },
        { id: "es_n005", word: "tomate", syllables: ["to", "ma", "te"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍅+Tomate", difficulty: 2, language: "es" },
        { id: "es_n006", word: "patata", syllables: ["pa", "ta", "ta"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🥔+Patata", difficulty: 2, language: "es" },
        { id: "es_n007", word: "banana", syllables: ["ba", "na", "na"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍌+Banana", difficulty: 2, language: "es" },
        { id: "es_n008", word: "manzana", syllables: ["man", "za", "na"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍎+Manzana", difficulty: 2, language: "es" },
        { id: "es_n009", word: "naranja", syllables: ["na", "ran", "ja"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍊+Naranja", difficulty: 2, language: "es" },
        { id: "es_n010", word: "paloma", syllables: ["pa", "lo", "ma"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🕊️+Paloma", difficulty: 2, language: "es" },
        { id: "es_n011", word: "tortuga", syllables: ["tor", "tu", "ga"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐢+Tortuga", difficulty: 2, language: "es" },
        { id: "es_n012", word: "gallina", syllables: ["ga", "lli", "na"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐔+Gallina", difficulty: 2, language: "es" },
        { id: "es_n013", word: "conejo", syllables: ["co", "ne", "jo"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐰+Conejo", difficulty: 2, language: "es" },
        { id: "es_n014", word: "caballo", syllables: ["ca", "ba", "llo"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐴+Caballo", difficulty: 2, language: "es" },
        { id: "es_n015", word: "oveja", syllables: ["o", "ve", "ja"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐑+Oveja", difficulty: 2, language: "es" },
        { id: "es_n016", word: "jirafa", syllables: ["ji", "ra", "fa"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦒+Jirafa", difficulty: 2, language: "es" },
        { id: "es_n017", word: "camello", syllables: ["ca", "me", "llo"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐪+Camello", difficulty: 2, language: "es" },
        { id: "es_n018", word: "cebra", syllables: ["ce", "bra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🦓+Cebra", difficulty: 2, language: "es" },
        { id: "es_n019", word: "tijera", syllables: ["ti", "je", "ra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=✂️+Tijera", difficulty: 2, language: "es" },
        { id: "es_n020", word: "cuchara", syllables: ["cu", "cha", "ra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🥄+Cuchara", difficulty: 2, language: "es" },
        { id: "es_n021", word: "tenedor", syllables: ["te", "ne", "dor"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🍴+Tenedor", difficulty: 2, language: "es" },
        { id: "es_n022", word: "cuchillo", syllables: ["cu", "chi", "llo"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔪+Cuchillo", difficulty: 2, language: "es" },
        { id: "es_n023", word: "cocina", syllables: ["co", "ci", "na"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🍳+Cocina", difficulty: 2, language: "es" },
        { id: "es_n024", word: "sartén", syllables: ["sar", "tén"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🍳+Sartén", difficulty: 2, language: "es" },
        { id: "es_n025", word: "melón", syllables: ["me", "lón"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🍈+Melón", difficulty: 2, language: "es" },
        { id: "es_n026", word: "sandía", syllables: ["san", "dí", "a"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍉+Sandía", difficulty: 2, language: "es" },
        { id: "es_n027", word: "pepino", syllables: ["pe", "pi", "no"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🥒+Pepino", difficulty: 2, language: "es" },
        { id: "es_n028", word: "limón", syllables: ["li", "món"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍋+Limón", difficulty: 2, language: "es" },
        { id: "es_n029", word: "cereza", syllables: ["ce", "re", "za"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍒+Cereza", difficulty: 2, language: "es" },
        { id: "es_n030", word: "fresa", syllables: ["fre", "sa"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍓+Fresa", difficulty: 2, language: "es" },
        { id: "es_n031", word: "botella", syllables: ["bo", "te", "lla"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🍼+Botella", difficulty: 2, language: "es" },
        { id: "es_n032", word: "espejo", syllables: ["es", "pe", "jo"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🪞+Espejo", difficulty: 2, language: "es" },
        { id: "es_n033", word: "reloj", syllables: ["re", "loj"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=⏰+Reloj", difficulty: 2, language: "es" },
        { id: "es_n034", word: "maleta", syllables: ["ma", "le", "ta"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🧳+Maleta", difficulty: 2, language: "es" },
        { id: "es_n035", word: "corona", syllables: ["co", "ro", "na"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=👑+Corona", difficulty: 2, language: "es" },
        { id: "es_n036", word: "barco", syllables: ["bar", "co"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=⛵+Barco", difficulty: 2, language: "es" },
        { id: "es_n037", word: "avión", syllables: ["a", "vión"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=✈️+Avión", difficulty: 2, language: "es" },
        { id: "es_n038", word: "cohete", syllables: ["co", "he", "te"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚀+Cohete", difficulty: 2, language: "es" },
        { id: "es_n039", word: "planeta", syllables: ["pla", "ne", "ta"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🪐+Planeta", difficulty: 2, language: "es" },
        { id: "es_n040", word: "estrella", syllables: ["es", "tre", "lla"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=⭐+Estrella", difficulty: 2, language: "es" },
        { id: "es_n041", word: "cometa", syllables: ["co", "me", "ta"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=☄️+Cometa", difficulty: 2, language: "es" },
        { id: "es_n042", word: "montaña", syllables: ["mon", "ta", "ña"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=⛰️+Montaña", difficulty: 2, language: "es" },
        { id: "es_n043", word: "volcán", syllables: ["vol", "cán"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌋+Volcán", difficulty: 2, language: "es" },
        { id: "es_n044", word: "río", syllables: ["rí", "o"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🏞️+Río", difficulty: 2, language: "es" },
        { id: "es_n045", word: "bosque", syllables: ["bos", "que"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🌲+Bosque", difficulty: 2, language: "es" },
        { id: "es_n046", word: "árbol", syllables: ["ár", "bol"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🌳+Árbol", difficulty: 2, language: "es" },
        { id: "es_n047", word: "hoja", syllables: ["ho", "ja"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🍃+Hoja", difficulty: 2, language: "es" },
        { id: "es_n048", word: "semilla", syllables: ["se", "mi", "lla"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🌱+Semilla", difficulty: 2, language: "es" },
        { id: "es_n049", word: "jardín", syllables: ["jar", "dín"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🏡+Jardín", difficulty: 2, language: "es" },
        { id: "es_n050", word: "piedra", syllables: ["pie", "dra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🪨+Piedra", difficulty: 2, language: "es" },
        { id: "es_n051", word: "galleta", syllables: ["ga", "lle", "ta"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍪+Galleta", difficulty: 2, language: "es" },

        // ========== NIVEL 3 (DIFÍCIL): 50 PALABRAS - 4+ SÍLABAS ==========
        { id: "es_d001", word: "mariposa", syllables: ["ma", "ri", "po", "sa"], image: "https://via.placeholder.com/300x200/BD10E0/FFFFFF?text=🦋+Mariposa", difficulty: 3, language: "es" },
        { id: "es_d002", word: "elefante", syllables: ["e", "le", "fan", "te"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐘+Elefante", difficulty: 3, language: "es" },
        { id: "es_d003", word: "hipopótamo", syllables: ["hi", "po", "pó", "ta", "mo"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🦛+Hipopótamo", difficulty: 3, language: "es" },
        { id: "es_d004", word: "rinoceronte", syllables: ["ri", "no", "ce", "ron", "te"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🦏+Rinoceronte", difficulty: 3, language: "es" },
        { id: "es_d005", word: "cocodrilo", syllables: ["co", "co", "dri", "lo"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐊+Cocodrilo", difficulty: 3, language: "es" },
        { id: "es_d006", word: "dinosaurio", syllables: ["di", "no", "sau", "rio"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🦕+Dinosaurio", difficulty: 3, language: "es" },
        { id: "es_d007", word: "helicoptero", syllables: ["he", "li", "cóp", "te", "ro"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🚁+Helicoptero", difficulty: 3, language: "es" },
        { id: "es_d008", word: "computadora", syllables: ["com", "pu", "ta", "do", "ra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=💻+Computadora", difficulty: 3, language: "es" },
        { id: "es_d009", word: "television", syllables: ["te", "le", "vi", "sión"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=📺+Television", difficulty: 3, language: "es" },
        { id: "es_d010", word: "refrigerador", syllables: ["re", "fri", "ge", "ra", "dor"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🧊+Refrigerador", difficulty: 3, language: "es" },
        { id: "es_d011", word: "automóvil", syllables: ["au", "to", "mó", "vil"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚗+Automóvil", difficulty: 3, language: "es" },
        { id: "es_d012", word: "bicicleta", syllables: ["bi", "ci", "cle", "ta"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🚲+Bicicleta", difficulty: 3, language: "es" },
        { id: "es_d013", word: "motocicleta", syllables: ["mo", "to", "ci", "cle", "ta"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🏍️+Motocicleta", difficulty: 3, language: "es" },
        { id: "es_d014", word: "helicóptero", syllables: ["he", "li", "cóp", "te", "ro"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🚁+Helicóptero", difficulty: 3, language: "es" },
        { id: "es_d015", word: "paracaídas", syllables: ["pa", "ra", "caí", "das"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🪂+Paracaídas", difficulty: 3, language: "es" },
        { id: "es_d016", word: "telescopio", syllables: ["te", "les", "co", "pio"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🔭+Telescopio", difficulty: 3, language: "es" },
        { id: "es_d017", word: "microscopio", syllables: ["mi", "cros", "co", "pio"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔬+Microscopio", difficulty: 3, language: "es" },
        { id: "es_d018", word: "termómetro", syllables: ["ter", "mó", "me", "tro"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌡️+Termómetro", difficulty: 3, language: "es" },
        { id: "es_d019", word: "calendario", syllables: ["ca", "len", "da", "rio"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=📅+Calendario", difficulty: 3, language: "es" },
        { id: "es_d020", word: "diccionario", syllables: ["dic", "cio", "na", "rio"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=📖+Diccionario", difficulty: 3, language: "es" },
        { id: "es_d021", word: "biblioteca", syllables: ["bi", "blio", "te", "ca"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=📚+Biblioteca", difficulty: 3, language: "es" },
        { id: "es_d022", word: "universidad", syllables: ["u", "ni", "ver", "si", "dad"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🎓+Universidad", difficulty: 3, language: "es" },
        { id: "es_d023", word: "laboratorio", syllables: ["la", "bo", "ra", "to", "rio"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🧪+Laboratorio", difficulty: 3, language: "es" },
        { id: "es_d024", word: "experimento", syllables: ["ex", "pe", "ri", "men", "to"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🔬+Experimento", difficulty: 3, language: "es" },
        { id: "es_d025", word: "astronauta", syllables: ["as", "tro", "nau", "ta"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=👨‍🚀+Astronauta", difficulty: 3, language: "es" },
        { id: "es_d026", word: "videojuego", syllables: ["vi", "de", "o", "jue", "go"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🎮+Videojuego", difficulty: 3, language: "es" },
        { id: "es_d027", word: "fotografía", syllables: ["fo", "to", "gra", "fí", "a"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=📷+Fotografía", difficulty: 3, language: "es" },
        { id: "es_d028", word: "carretera", syllables: ["ca", "rre", "te", "ra"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🛣️+Carretera", difficulty: 3, language: "es" },
        { id: "es_d029", word: "semáforo", syllables: ["se", "má", "fo", "ro"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🚦+Semáforo", difficulty: 3, language: "es" },
        { id: "es_d030", word: "ambulancia", syllables: ["am", "bu", "lan", "cia"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚑+Ambulancia", difficulty: 3, language: "es" },
        { id: "es_d031", word: "medicina", syllables: ["me", "di", "ci", "na"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=💊+Medicina", difficulty: 3, language: "es" },
        { id: "es_d032", word: "enfermera", syllables: ["en", "fer", "me", "ra"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=👩‍⚕️+Enfermera", difficulty: 3, language: "es" },
        { id: "es_d033", word: "bombero", syllables: ["bom", "be", "ro"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=👨‍🚒+Bombero", difficulty: 3, language: "es" },
        { id: "es_d034", word: "policía", syllables: ["po", "li", "cí", "a"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👮+Policía", difficulty: 3, language: "es" },
        { id: "es_d035", word: "superhéroe", syllables: ["su", "per", "hé", "ro", "e"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🦸+Superhéroe", difficulty: 3, language: "es" },
        { id: "es_d036", word: "princesa", syllables: ["prin", "ce", "sa"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=👸+Princesa", difficulty: 3, language: "es" },
        { id: "es_d037", word: "dragón", syllables: ["dra", "gón"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐉+Dragón", difficulty: 3, language: "es" },
        { id: "es_d038", word: "unicornio", syllables: ["u", "ni", "cor", "nio"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🦄+Unicornio", difficulty: 3, language: "es" },
        { id: "es_d039", word: "arcoíris", syllables: ["ar", "co", "í", "ris"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🌈+Arcoíris", difficulty: 3, language: "es" },
        { id: "es_d040", word: "trampolín", syllables: ["tram", "po", "lín"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🤸+Trampolín", difficulty: 3, language: "es" },
        { id: "es_d041", word: "tobogán", syllables: ["to", "bo", "gán"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🛝+Tobogán", difficulty: 3, language: "es" },
        { id: "es_d042", word: "columpio", syllables: ["co", "lum", "pio"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🎢+Columpio", difficulty: 3, language: "es" },
        { id: "es_d043", word: "carrusel", syllables: ["ca", "rru", "sel"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🎠+Carrusel", difficulty: 3, language: "es" },
        { id: "es_d044", word: "payaso", syllables: ["pa", "ya", "so"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🤡+Payaso", difficulty: 3, language: "es" },
        { id: "es_d045", word: "circo", syllables: ["cir", "co"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🎪+Circo", difficulty: 3, language: "es" },
        { id: "es_d046", word: "malabarista", syllables: ["ma", "la", "ba", "ris", "ta"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🤹+Malabarista", difficulty: 3, language: "es" },
        { id: "es_d047", word: "equilibrista", syllables: ["e", "qui", "li", "bris", "ta"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🎪+Equilibrista", difficulty: 3, language: "es" },
        { id: "es_d048", word: "acróbata", syllables: ["a", "cró", "ba", "ta"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🤸+Acróbata", difficulty: 3, language: "es" },
        { id: "es_d049", word: "trapecista", syllables: ["tra", "pe", "cis", "ta"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🎪+Trapecista", difficulty: 3, language: "es" },
        { id: "es_d050", word: "domador", syllables: ["do", "ma", "dor"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🦁+Domador", difficulty: 3, language: "es" },  
        { id: "es_d051", word: "zanahoria", syllables: ["za", "na", "ho", "ria"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🥕+Zanahoria", difficulty: 3, language: "es" },  
      ];
    } else {
      // ========== INGLÉS - 150 PALABRAS COMPLETAS ==========
      this.stimuli = [
        // ========== NIVEL 1 (FÁCIL): 50 PALABRAS - 1-2 SÍLABAS ==========
        { id: "en_f001", word: "sun", syllables: ["sun"], image: "https://via.placeholder.com/300x200/F5A623/FFFFFF?text=☀️+Sun", difficulty: 1, language: "en" },
        { id: "en_f002", word: "cat", syllables: ["cat"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🐱+Cat", difficulty: 1, language: "en" },
        { id: "en_f003", word: "dog", syllables: ["dog"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐶+Dog", difficulty: 1, language: "en" },
        { id: "en_f004", word: "moon", syllables: ["moon"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🌙+Moon", difficulty: 1, language: "en" },
        { id: "en_f005", word: "star", syllables: ["star"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=⭐+Star", difficulty: 1, language: "en" },
        { id: "en_f006", word: "car", syllables: ["car"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚗+Car", difficulty: 1, language: "en" },
        { id: "en_f007", word: "house", syllables: ["house"], image: "https://via.placeholder.com/300x200/E24A4A/FFFFFF?text=🏠+House", difficulty: 1, language: "en" },
        { id: "en_f008", word: "tree", syllables: ["tree"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🌳+Tree", difficulty: 1, language: "en" },
        { id: "en_f009", word: "book", syllables: ["book"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=📖+Book", difficulty: 1, language: "en" },
        { id: "en_f010", word: "pen", syllables: ["pen"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=✏️+Pen", difficulty: 1, language: "en" },
        { id: "en_f011", word: "ball", syllables: ["ball"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=⚽+Ball", difficulty: 1, language: "en" },
        { id: "en_f012", word: "bird", syllables: ["bird"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🐦+Bird", difficulty: 1, language: "en" },
        { id: "en_f013", word: "fish", syllables: ["fish"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🐟+Fish", difficulty: 1, language: "en" },
        { id: "en_f014", word: "frog", syllables: ["frog"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐸+Frog", difficulty: 1, language: "en" },
        { id: "en_f015", word: "bear", syllables: ["bear"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐻+Bear", difficulty: 1, language: "en" },
        { id: "en_f016", word: "deer", syllables: ["deer"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦌+Deer", difficulty: 1, language: "en" },
        { id: "en_f017", word: "duck", syllables: ["duck"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦆+Duck", difficulty: 1, language: "en" },
        { id: "en_f018", word: "egg", syllables: ["egg"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🥚+Egg", difficulty: 1, language: "en" },
        { id: "en_f019", word: "foot", syllables: ["foot"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦶+Foot", difficulty: 1, language: "en" },
        { id: "en_f020", word: "hand", syllables: ["hand"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=✋+Hand", difficulty: 1, language: "en" },
        { id: "en_f021", word: "hat", syllables: ["hat"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🎩+Hat", difficulty: 1, language: "en" },
        { id: "en_f022", word: "cup", syllables: ["cup"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=☕+Cup", difficulty: 1, language: "en" },
        { id: "en_f023", word: "key", syllables: ["key"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🔑+Key", difficulty: 1, language: "en" },
        { id: "en_f024", word: "kite", syllables: ["kite"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🪁+Kite", difficulty: 1, language: "en" },
        { id: "en_f025", word: "lamp", syllables: ["lamp"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=💡+Lamp", difficulty: 1, language: "en" },
        { id: "en_f026", word: "leaf", syllables: ["leaf"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🍃+Leaf", difficulty: 1, language: "en" },
        { id: "en_f027", word: "milk", syllables: ["milk"], image: "https://via.placeholder.com/300x200/FFFFFF/4A90E2?text=🥛+Milk", difficulty: 1, language: "en" },
        { id: "en_f028", word: "nest", syllables: ["nest"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🪺+Nest", difficulty: 1, language: "en" },
        { id: "en_f029", word: "pig", syllables: ["pig"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐷+Pig", difficulty: 1, language: "en" },
        { id: "en_f030", word: "ring", syllables: ["ring"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=💍+Ring", difficulty: 1, language: "en" },
        { id: "en_f031", word: "ship", syllables: ["ship"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🚢+Ship", difficulty: 1, language: "en" },
        { id: "en_f032", word: "shoe", syllables: ["shoe"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=👟+Shoe", difficulty: 1, language: "en" },
        { id: "en_f033", word: "sock", syllables: ["sock"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🧦+Sock", difficulty: 1, language: "en" },
        { id: "en_f034", word: "soup", syllables: ["soup"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍲+Soup", difficulty: 1, language: "en" },
        { id: "en_f035", word: "tent", syllables: ["tent"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=⛺+Tent", difficulty: 1, language: "en" },
        { id: "en_f036", word: "toy", syllables: ["toy"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🧸+Toy", difficulty: 1, language: "en" },
        { id: "en_f037", word: "train", syllables: ["train"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚂+Train", difficulty: 1, language: "en" },
        { id: "en_f038", word: "truck", syllables: ["truck"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🚚+Truck", difficulty: 1, language: "en" },
        { id: "en_f039", word: "vest", syllables: ["vest"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🦺+Vest", difficulty: 1, language: "en" },
        { id: "en_f040", word: "wolf", syllables: ["wolf"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐺+Wolf", difficulty: 1, language: "en" },
        { id: "en_f041", word: "fox", syllables: ["fox"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🦊+Fox", difficulty: 1, language: "en" },
        { id: "en_f042", word: "bee", syllables: ["bee"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐝+Bee", difficulty: 1, language: "en" },
        { id: "en_f043", word: "ant", syllables: ["ant"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐜+Ant", difficulty: 1, language: "en" },
        { id: "en_f044", word: "bat", syllables: ["bat"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🦇+Bat", difficulty: 1, language: "en" },
        { id: "en_f045", word: "bed", syllables: ["bed"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🛏️+Bed", difficulty: 1, language: "en" },
        { id: "en_f046", word: "box", syllables: ["box"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=📦+Box", difficulty: 1, language: "en" },
        { id: "en_f047", word: "bus", syllables: ["bus"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🚌+Bus", difficulty: 1, language: "en" },
        { id: "en_f048", word: "cake", syllables: ["cake"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🎂+Cake", difficulty: 1, language: "en" },
        { id: "en_f049", word: "coat", syllables: ["coat"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🧥+Coat", difficulty: 1, language: "en" },
        { id: "en_f050", word: "flag", syllables: ["flag"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚩+Flag", difficulty: 1, language: "en" },

        // ========== NIVEL 2 (NORMAL): 50 PALABRAS - 2-3 SÍLABAS ==========
        { id: "en_n001", word: "apple", syllables: ["ap", "ple"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍎+Apple", difficulty: 2, language: "en" },
        { id: "en_n002", word: "table", syllables: ["ta", "ble"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🪑+Table", difficulty: 2, language: "en" },
        { id: "en_n003", word: "water", syllables: ["wa", "ter"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=💧+Water", difficulty: 2, language: "en" },
        { id: "en_n004", word: "pencil", syllables: ["pen", "cil"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=✏️+Pencil", difficulty: 2, language: "en" },
        { id: "en_n005", word: "rabbit", syllables: ["rab", "bit"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐰+Rabbit", difficulty: 2, language: "en" },
        { id: "en_n006", word: "window", syllables: ["win", "dow"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🪟+Window", difficulty: 2, language: "en" },
        { id: "en_n007", word: "monkey", syllables: ["mon", "key"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐵+Monkey", difficulty: 2, language: "en" },
        { id: "en_n008", word: "basket", syllables: ["bas", "ket"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🧺+Basket", difficulty: 2, language: "en" },
        { id: "en_n009", word: "button", syllables: ["but", "ton"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🔘+Button", difficulty: 2, language: "en" },
        { id: "en_n010", word: "carrot", syllables: ["car", "rot"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🥕+Carrot", difficulty: 2, language: "en" },
        { id: "en_n011", word: "chicken", syllables: ["chic", "ken"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐔+Chicken", difficulty: 2, language: "en" },
        { id: "en_n012", word: "cookie", syllables: ["coo", "kie"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍪+Cookie", difficulty: 2, language: "en" },
        { id: "en_n013", word: "doctor", syllables: ["doc", "tor"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=👨‍⚕️+Doctor", difficulty: 2, language: "en" },
        { id: "en_n014", word: "dragon", syllables: ["dra", "gon"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🐉+Dragon", difficulty: 2, language: "en" },
        { id: "en_n015", word: "finger", syllables: ["fin", "ger"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=☝️+Finger", difficulty: 2, language: "en" },
        { id: "en_n016", word: "flower", syllables: ["flow", "er"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌸+Flower", difficulty: 2, language: "en" },
        { id: "en_n017", word: "garden", syllables: ["gar", "den"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🏡+Garden", difficulty: 2, language: "en" },
        { id: "en_n018", word: "hammer", syllables: ["ham", "mer"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔨+Hammer", difficulty: 2, language: "en" },
        { id: "en_n019", word: "helmet", syllables: ["hel", "met"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=⛑️+Helmet", difficulty: 2, language: "en" },
        { id: "en_n020", word: "jacket", syllables: ["jac", "ket"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🧥+Jacket", difficulty: 2, language: "en" },
        { id: "en_n021", word: "kitten", syllables: ["kit", "ten"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🐱+Kitten", difficulty: 2, language: "en" },
        { id: "en_n022", word: "ladder", syllables: ["lad", "der"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🪜+Ladder", difficulty: 2, language: "en" },
        { id: "en_n023", word: "lemon", syllables: ["lem", "on"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍋+Lemon", difficulty: 2, language: "en" },
        { id: "en_n024", word: "letter", syllables: ["let", "ter"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=✉️+Letter", difficulty: 2, language: "en" },
        { id: "en_n025", word: "muffin", syllables: ["muf", "fin"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🧁+Muffin", difficulty: 2, language: "en" },
        { id: "en_n026", word: "orange", syllables: ["or", "ange"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍊+Orange", difficulty: 2, language: "en" },
        { id: "en_n027", word: "panda", syllables: ["pan", "da"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🐼+Panda", difficulty: 2, language: "en" },
        { id: "en_n028", word: "parrot", syllables: ["par", "rot"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🦜+Parrot", difficulty: 2, language: "en" },
        { id: "en_n029", word: "penguin", syllables: ["pen", "guin"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🐧+Penguin", difficulty: 2, language: "en" },
        { id: "en_n030", word: "pepper", syllables: ["pep", "per"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌶️+Pepper", difficulty: 2, language: "en" },
        { id: "en_n031", word: "pickle", syllables: ["pic", "kle"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🥒+Pickle", difficulty: 2, language: "en" },
        { id: "en_n032", word: "pillow", syllables: ["pil", "low"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🛏️+Pillow", difficulty: 2, language: "en" },
        { id: "en_n033", word: "planet", syllables: ["plan", "et"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🪐+Planet", difficulty: 2, language: "en" },
        { id: "en_n034", word: "pocket", syllables: ["poc", "ket"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👖+Pocket", difficulty: 2, language: "en" },
        { id: "en_n035", word: "pumpkin", syllables: ["pump", "kin"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🎃+Pumpkin", difficulty: 2, language: "en" },
        { id: "en_n036", word: "rocket", syllables: ["roc", "ket"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚀+Rocket", difficulty: 2, language: "en" },
        { id: "en_n037", word: "robot", syllables: ["ro", "bot"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🤖+Robot", difficulty: 2, language: "en" },
        { id: "en_n038", word: "sandwich", syllables: ["sand", "wich"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🥪+Sandwich", difficulty: 2, language: "en" },
        { id: "en_n039", word: "sister", syllables: ["sis", "ter"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=👧+Sister", difficulty: 2, language: "en" },
        { id: "en_n040", word: "spider", syllables: ["spi", "der"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🕷️+Spider", difficulty: 2, language: "en" },
        { id: "en_n041", word: "sweater", syllables: ["sweat", "er"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🧥+Sweater", difficulty: 2, language: "en" },
        { id: "en_n042", word: "tiger", syllables: ["ti", "ger"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🐯+Tiger", difficulty: 2, language: "en" },
        { id: "en_n043", word: "tomato", syllables: ["to", "ma", "to"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍅+Tomato", difficulty: 2, language: "en" },
        { id: "en_n044", word: "turtle", syllables: ["tur", "tle"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐢+Turtle", difficulty: 2, language: "en" },
        { id: "en_n045", word: "wagon", syllables: ["wa", "gon"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🛒+Wagon", difficulty: 2, language: "en" },
        { id: "en_n046", word: "wallet", syllables: ["wal", "let"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=👛+Wallet", difficulty: 2, language: "en" },
        { id: "en_n047", word: "winter", syllables: ["win", "ter"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=❄️+Winter", difficulty: 2, language: "en" },
        { id: "en_n048", word: "yellow", syllables: ["yel", "low"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🟡+Yellow", difficulty: 2, language: "en" },
        { id: "en_n049", word: "zipper", syllables: ["zip", "per"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🤐+Zipper", difficulty: 2, language: "en" },
        { id: "en_n050", word: "brother", syllables: ["bro", "ther"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👦+Brother", difficulty: 2, language: "en" },

        // ========== NIVEL 3 (DIFÍCIL): 50 PALABRAS - 3+ SÍLABAS ==========
        { id: "en_d001", word: "butterfly", syllables: ["but", "ter", "fly"], image: "https://via.placeholder.com/300x200/BD10E0/FFFFFF?text=🦋+Butterfly", difficulty: 3, language: "en" },
        { id: "en_d002", word: "elephant", syllables: ["el", "e", "phant"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐘+Elephant", difficulty: 3, language: "en" },
        { id: "en_d003", word: "dinosaur", syllables: ["di", "no", "saur"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🦕+Dinosaur", difficulty: 3, language: "en" },
        { id: "en_d004", word: "hamburger", syllables: ["ham", "bur", "ger"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍔+Hamburger", difficulty: 3, language: "en" },
        { id: "en_d005", word: "helicopter", syllables: ["hel", "i", "cop", "ter"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🚁+Helicopter", difficulty: 3, language: "en" },
        { id: "en_d006", word: "umbrella", syllables: ["um", "brel", "la"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=☂️+Umbrella", difficulty: 3, language: "en" },
        { id: "en_d007", word: "telephone", syllables: ["tel", "e", "phone"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=📱+Telephone", difficulty: 3, language: "en" },
        { id: "en_d008", word: "computer", syllables: ["com", "pu", "ter"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=💻+Computer", difficulty: 3, language: "en" },
        { id: "en_d009", word: "television", syllables: ["tel", "e", "vi", "sion"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=📺+Television", difficulty: 3, language: "en" },
        { id: "en_d010", word: "kangaroo", syllables: ["kan", "ga", "roo"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🦘+Kangaroo", difficulty: 3, language: "en" },
        { id: "en_d011", word: "watermelon", syllables: ["wa", "ter", "mel", "on"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍉+Watermelon", difficulty: 3, language: "en" },
        { id: "en_d012", word: "strawberry", syllables: ["straw", "ber", "ry"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍓+Strawberry", difficulty: 3, language: "en" },
        { id: "en_d013", word: "chocolate", syllables: ["choc", "o", "late"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🍫+Chocolate", difficulty: 3, language: "en" },
        { id: "en_d014", word: "photograph", syllables: ["pho", "to", "graph"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=📷+Photograph", difficulty: 3, language: "en" },
        { id: "en_d015", word: "basketball", syllables: ["bas", "ket", "ball"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🏀+Basketball", difficulty: 3, language: "en" },
        { id: "en_d016", word: "motorcycle", syllables: ["mo", "tor", "cy", "cle"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🏍️+Motorcycle", difficulty: 3, language: "en" },
        { id: "en_d017", word: "crocodile", syllables: ["croc", "o", "dile"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐊+Crocodile", difficulty: 3, language: "en" },
        { id: "en_d018", word: "alligator", syllables: ["al", "li", "ga", "tor"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐊+Alligator", difficulty: 3, language: "en" },
        { id: "en_d019", word: "octopus", syllables: ["oc", "to", "pus"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🐙+Octopus", difficulty: 3, language: "en" },
        { id: "en_d020", word: "jellyfish", syllables: ["jel", "ly", "fish"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🪼+Jellyfish", difficulty: 3, language: "en" },
        { id: "en_d021", word: "caterpillar", syllables: ["cat", "er", "pil", "lar"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🐛+Caterpillar", difficulty: 3, language: "en" },
        { id: "en_d022", word: "grasshopper", syllables: ["grass", "hop", "per"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🦗+Grasshopper", difficulty: 3, language: "en" },
        { id: "en_d023", word: "ladybug", syllables: ["la", "dy", "bug"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🐞+Ladybug", difficulty: 3, language: "en" },
        { id: "en_d024", word: "dragonfly", syllables: ["dra", "gon", "fly"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🦋+Dragonfly", difficulty: 3, language: "en" },
        { id: "en_d025", word: "blueberry", syllables: ["blue", "ber", "ry"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=🫐+Blueberry", difficulty: 3, language: "en" },
        { id: "en_d026", word: "raspberry", syllables: ["rasp", "ber", "ry"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍇+Raspberry", difficulty: 3, language: "en" },
        { id: "en_d027", word: "pineapple", syllables: ["pine", "ap", "ple"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🍍+Pineapple", difficulty: 3, language: "en" },
        { id: "en_d028", word: "avocado", syllables: ["av", "o", "ca", "do"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🥑+Avocado", difficulty: 3, language: "en" },
        { id: "en_d029", word: "broccoli", syllables: ["broc", "co", "li"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🥦+Broccoli", difficulty: 3, language: "en" },
        { id: "en_d030", word: "cauliflower", syllables: ["cau", "li", "flow", "er"], image: "https://via.placeholder.com/300x200/FFFFFF/95A5A6?text=🥦+Cauliflower", difficulty: 3, language: "en" },
        { id: "en_d031", word: "ambulance", syllables: ["am", "bu", "lance"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚑+Ambulance", difficulty: 3, language: "en" },
        { id: "en_d032", word: "firetruck", syllables: ["fire", "truck"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🚒+Firetruck", difficulty: 3, language: "en" },
        { id: "en_d033", word: "policeman", syllables: ["po", "lice", "man"], image: "https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=👮+Policeman", difficulty: 3, language: "en" },
        { id: "en_d034", word: "astronaut", syllables: ["as", "tro", "naut"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=👨‍🚀+Astronaut", difficulty: 3, language: "en" },
        { id: "en_d035", word: "microscope", syllables: ["mi", "cro", "scope"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔬+Microscope", difficulty: 3, language: "en" },
        { id: "en_d036", word: "telescope", syllables: ["tel", "e", "scope"], image: "https://via.placeholder.com/300x200/9013FE/FFFFFF?text=🔭+Telescope", difficulty: 3, language: "en" },
        { id: "en_d037", word: "thermometer", syllables: ["ther", "mom", "e", "ter"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🌡️+Thermometer", difficulty: 3, language: "en" },
        { id: "en_d038", word: "calculator", syllables: ["cal", "cu", "la", "tor"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🧮+Calculator", difficulty: 3, language: "en" },
        { id: "en_d039", word: "dictionary", syllables: ["dic", "tion", "ar", "y"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=📖+Dictionary", difficulty: 3, language: "en" },
        { id: "en_d040", word: "library", syllables: ["li", "brar", "y"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=📚+Library", difficulty: 3, language: "en" },
        { id: "en_d041", word: "hospital", syllables: ["hos", "pi", "tal"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🏥+Hospital", difficulty: 3, language: "en" },
        { id: "en_d042", word: "supermarket", syllables: ["su", "per", "mar", "ket"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🛒+Supermarket", difficulty: 3, language: "en" },
        { id: "en_d043", word: "restaurant", syllables: ["res", "tau", "rant"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🍽️+Restaurant", difficulty: 3, language: "en" },
        { id: "en_d044", word: "playground", syllables: ["play", "ground"], image: "https://via.placeholder.com/300x200/7ED321/FFFFFF?text=🛝+Playground", difficulty: 3, language: "en" },
        { id: "en_d045", word: "trampoline", syllables: ["tram", "po", "line"], image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=🤸+Trampoline", difficulty: 3, language: "en" },
        { id: "en_d046", word: "xylophone", syllables: ["xy", "lo", "phone"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🎵+Xylophone", difficulty: 3, language: "en" },
        { id: "en_d047", word: "harmonica", syllables: ["har", "mon", "i", "ca"], image: "https://via.placeholder.com/300x200/95E1D3/FFFFFF?text=🎵+Harmonica", difficulty: 3, language: "en" },
        { id: "en_d048", word: "accordion", syllables: ["ac", "cor", "di", "on"], image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=🪗+Accordion", difficulty: 3, language: "en" },
        { id: "en_d049", word: "binoculars", syllables: ["bi", "noc", "u", "lars"], image: "https://via.placeholder.com/300x200/95A5A6/FFFFFF?text=🔭+Binoculars", difficulty: 3, language: "en" },
        { id: "en_d050", word: "parachute", syllables: ["par", "a", "chute"], image: "https://via.placeholder.com/300x200/FFE66D/FFFFFF?text=🪂+Parachute", difficulty: 3, language: "en" }
      ];
    }
    
    Logger.log(`✅ ${this.stimuli.length} estímulos de fallback cargados para ${this.currentLanguage}`);
  }

  async changeLanguage(language) {
    if (!ValidationUtils.isValidLanguage(language)) {
      Logger.warn('Lenguaje inválido:', language);
      return;
    }
    if (this.currentLanguage === language) {
      Logger.log(`✅ Ya estás en idioma: ${language}`);
      return;
    }
    Logger.log(`🌐 Cambiando idioma de "${this.currentLanguage}" a "${language}"`);
    this.currentLanguage = language;
    if (language === 'es') {
      this.elements.langBtnEs.classList.add('lang-btn--active');
      this.elements.langBtnEn.classList.remove('lang-btn--active');
    } else {
      this.elements.langBtnEn.classList.add('lang-btn--active');
      this.elements.langBtnEs.classList.remove('lang-btn--active');
    }
    this.stimuli = [];
    DOMUtils.showLoading();
    Logger.log(`🔄 Cargando estímulos para idioma: ${language}`);
    try {
      const snapshot = await db.collection('stimuli').where('language', '==', language).get();
      if (snapshot.empty) {
        Logger.warn(`⚠️ No se encontraron estímulos en Firestore para idioma: ${language}`);
        this.loadFallbackData();
      } else {
        this.stimuli = [];
        snapshot.forEach(doc => {
          this.stimuli.push({ id: doc.id, ...doc.data() });
        });
        Logger.log(`✅ ${this.stimuli.length} estímulos cargados desde Firestore`);
      }
      if (this.stimuli.length > 0) {
        Logger.log(`📋 Primer estímulo: "${this.stimuli[0].word}" (idioma: ${this.stimuli[0].language})`);
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
      this.elements.scoreValue.textContent = '0';
      this.gameStartTime = Date.now();
      this.startGameTimer();
      await this.createSession();
      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);
      await this.loadNextQuestion();
      Logger.log('✅ Juego iniciado');
    } catch (error) {
      Logger.error('Error iniciando juego', error);
      alert('Error iniciando el juego');
      DOMUtils.hideLoading();
    }
  }

  startGameTimer() {
    let timerElement = document.getElementById('gameTimer');
    if (!timerElement) {
      timerElement = document.createElement('div');
      timerElement.id = 'gameTimer';
      timerElement.className = 'game-timer';
      document.body.appendChild(timerElement);
    }
    timerElement.style.display = 'block';
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timerElement.innerHTML = `<span class="timer-icon">⏱️</span> ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopGameTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.gameStartTime) {
      this.gameTotalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    }
    const timerElement = document.getElementById('gameTimer');
    if (timerElement) {
      timerElement.style.display = 'none';
    }
  }

  async createSession() {
    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentCode: this.studentCode || 'ANONIMO',
        studentName: this.studentName || 'Anónimo',
        studentAge: this.studentAge || 0,
        studentGender: this.studentGender || 'No especificado',
        gameNumber: 1,
        gameName: 'Sílabas Danzantes',
        language: this.currentLanguage,
        difficulty: this.currentDifficulty,
        totalQuestions: this.totalQuestions,
        gameVersion: '1.0',
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'in_progress'
      });
      Logger.log(`✅ Sesión creada: ${this.currentSessionId}`);
    } catch (error) {
      Logger.error('Error creando sesión', error);
      this.currentSessionId = `session_${Date.now()}`;
    }
  }

  handleNextQuestion() {
    Logger.log('🔘 Botón Siguiente presionado');
    DOMUtils.hide(this.elements.feedbackScreen);
    this.loadNextQuestion();
  }

  async loadNextQuestion() {
    Logger.log(`📝 Cargando pregunta ${this.currentQuestion + 1}/${this.totalQuestions}`);
    if (this.currentQuestion >= this.totalQuestions) {
      Logger.log('🏁 Juego terminado');
      await this.endGame();
      return;
    }
    this.selectedSyllables = [];
    this.isAnswered = false;
    DOMUtils.clearContent(this.elements.selectedSyllables);
    this.currentQuestion++;
    this.updateProgress();
    DOMUtils.show(this.elements.gameScreen);
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

  // ✅ FUNCIÓN CORREGIDA PARA MOSTRAR EMOJIS
// ✅ FUNCIÓN CORREGIDA CON MAPEO DIRECTO DE EMOJIS
async displayQuestion() {
  try {
    // Ocultar la imagen original
    this.elements.stimulusImage.style.display = 'none';
    
    // Crear o actualizar contenedor de emoji
    let emojiContainer = document.getElementById('emojiContainerGame1');
    if (!emojiContainer) {
      emojiContainer = document.createElement('div');
      emojiContainer.id = 'emojiContainerGame1';
      emojiContainer.style.fontSize = '150px';
      emojiContainer.style.textAlign = 'center';
      emojiContainer.style.marginBottom = '20px';
      emojiContainer.style.animation = 'bounce 2s infinite';
      this.elements.stimulusImage.parentNode.insertBefore(emojiContainer, this.elements.stimulusImage);
    }
    
    // Obtener emoji desde el mapa
    const emoji = this.getEmojiForWord(this.currentStimulus.word);
    emojiContainer.textContent = emoji;
    
    this.elements.stimulusWord.textContent = this.currentStimulus.word;
    this.createSyllableButtons();
    await new Promise(resolve => setTimeout(resolve, 800));
    await this.playCurrentAudio();
  } catch (error) {
    Logger.error('Error mostrando pregunta', error);
  }
}

getEmojiForWord(word) {
  const emojiMap = {
    // ========== ESPAÑOL - NIVEL 1 (50 palabras) ==========
    'sol': '☀️', 'mar': '🌊', 'pan': '🍞', 'pez': '🐟', 'luz': '💡',
    'flor': '🌸', 'gato': '🐱', 'casa': '🏠', 'perro': '🐶', 'luna': '🌙',
    'mesa': '🪑', 'silla': '🪑', 'libro': '📖', 'niño': '👦', 'boca': '👄',
    'mano': '✋', 'pelo': '💇', 'agua': '💧', 'cama': '🛏️', 'vaca': '🐄',
    'pato': '🦆', 'sapo': '🐸', 'oso': '🐻', 'lobo': '🐺', 'rata': '🐀',
    'loro': '🦜', 'puma': '🐆', 'coco': '🥥', 'uva': '🍇', 'pera': '🍐',
    'piña': '🍍', 'toro': '🐂', 'rosa': '🌹', 'nube': '☁️', 'dedo': '☝️',
    'codo': '💪', 'pie': '🦶', 'ojo': '👁️', 'cara': '😊', 'ropa': '👕',
    'mono': '🐵', 'foca': '🦭', 'tubo': '🔧', 'lana': '🧶', 'palo': '🪵',
    'sopa': '🍲', 'bote': '⛵', 'taza': '☕', 'cuna': '🍼', 'lupa': '🔍','tren': '🚂',
    
    // ========== ESPAÑOL - NIVEL 2 (50 palabras) ==========
    'pelota': '⚽','corazón': '❤️','serpiente': '🐍','helado': '🍦', 'zapato': '👟', 'camisa': '👔', 'ventana': '🪟', 'tomate': '🍅',
    'patata': '🥔', 'banana': '🍌', 'manzana': '🍎', 'naranja': '🍊', 'paloma': '🕊️',
    'tortuga': '🐢', 'gallina': '🐔', 'conejo': '🐰', 'caballo': '🐴', 'oveja': '🐑',
    'jirafa': '🦒', 'camello': '🐪', 'cebra': '🦓', 'tijera': '✂️', 'cuchara': '🥄',
    'tenedor': '🍴', 'cuchillo': '🔪', 'cocina': '🍳', 'sartén': '🍳', 'melón': '🍈',
    'sandía': '🍉', 'pepino': '🥒', 'limón': '🍋', 'cereza': '🍒', 'fresa': '🍓',
    'botella': '🍼', 'espejo': '🪞', 'reloj': '⏰', 'maleta': '🧳', 'corona': '👑',
    'barco': '⛵', 'avión': '✈️', 'cohete': '🚀', 'planeta': '🪐', 'estrella': '⭐',
    'cometa': '☄️', 'montaña': '⛰️', 'volcán': '🌋', 'río': '🏞️', 'bosque': '🌲',
    'árbol': '🌳', 'hoja': '🍃', 'semilla': '🌱', 'jardín': '🏡', 'piedra': '🪨', 'galleta': '🍪',
    
    // ========== ESPAÑOL - NIVEL 3 (50 palabras) ==========
    'mariposa': '🦋', 'elefante': '🐘', 'hipopótamo': '🦛', 'rinoceronte': '🦏', 
    'cocodrilo': '🐊', 'dinosaurio': '🦕', 'helicoptero': '🚁', 'computadora': '💻', 
    'television': '📺', 'refrigerador': '🧊', 'automóvil': '🚗', 'bicicleta': '🚲', 
    'motocicleta': '🏍️', 'helicóptero': '🚁', 'paracaídas': '🪂', 'telescopio': '🔭', 
    'microscopio': '🔬', 'termómetro': '🌡️', 'calendario': '📅', 'diccionario': '📖',
    'biblioteca': '📚', 'universidad': '🎓', 'laboratorio': '🧪', 'experimento': '🔬', 
    'astronauta': '👨‍🚀', 'videojuego': '🎮', 'fotografía': '📷', 'carretera': '🛣️', 
    'semáforo': '🚦', 'ambulancia': '🚑', 'medicina': '💊', 'enfermera': '👩‍⚕️', 
    'bombero': '👨‍🚒', 'policía': '👮', 'superhéroe': '🦸', 'princesa': '👸', 
    'dragón': '🐉', 'unicornio': '🦄', 'arcoíris': '🌈', 'trampolín': '🤸',
    'tobogán': '🛝', 'columpio': '🎢', 'carrusel': '🎠', 'payaso': '🤡', 
    'circo': '🎪', 'malabarista': '🤹', 'equilibrista': '🎪', 'acróbata': '🤸', 
    'trapecista': '🎪', 'domador': '🦁', 'teléfono': '📱', 'zanahoria': '🥕',
    
    // ========== INGLÉS - NIVEL 1 (50 palabras) ==========
    'birthday': '🎂', 'jiraffe': '🦒','sun': '☀️', 'cat': '🐱', 'dog': '🐶', 'moon': '🌙', 'star': '⭐',
    'car': '🚗', 'house': '🏠', 'tree': '🌳', 'book': '📖', 'pen': '✏️',
    'ball': '⚽', 'bird': '🐦', 'fish': '🐟', 'frog': '🐸', 'bear': '🐻',
    'deer': '🦌', 'duck': '🦆', 'egg': '🥚', 'foot': '🦶', 'hand': '✋',
    'hat': '🎩', 'cup': '☕', 'key': '🔑', 'kite': '🪁', 'lamp': '💡',
    'leaf': '🍃', 'milk': '🥛', 'nest': '🪺', 'pig': '🐷', 'ring': '💍',
    'ship': '🚢', 'shoe': '👟', 'sock': '🧦', 'soup': '🍲', 'tent': '⛺',
    'toy': '🧸', 'train': '🚂', 'truck': '🚚', 'vest': '🦺', 'wolf': '🐺',
    'fox': '🦊', 'bee': '🐝', 'ant': '🐜', 'bat': '🦇', 'bed': '🛏️',
    'box': '📦', 'bus': '🚌', 'cake': '🎂', 'coat': '🧥', 'flag': '🚩',
    
    // ========== INGLÉS - NIVEL 2 (50 palabras) ==========
    'apple': '🍎', 'table': '🪑', 'water': '💧', 'pencil': '✏️', 'rabbit': '🐰',
    'window': '🪟', 'monkey': '🐵', 'basket': '🧺', 'button': '🔘', 'carrot': '🥕',
    'chicken': '🐔', 'cookie': '🍪', 'doctor': '👨‍⚕️', 'dragon': '🐉', 'finger': '☝️',
    'flower': '🌸', 'garden': '🏡', 'hammer': '🔨', 'helmet': '⛑️', 'jacket': '🧥',
    'kitten': '🐱', 'ladder': '🪜', 'lemon': '🍋', 'letter': '✉️', 'muffin': '🧁',
    'orange': '🍊', 'panda': '🐼', 'parrot': '🦜', 'penguin': '🐧', 'pepper': '🌶️',
    'pickle': '🥒', 'pillow': '🛏️', 'planet': '🪐', 'pocket': '👖', 'pumpkin': '🎃',
    'rocket': '🚀', 'robot': '🤖', 'sandwich': '🥪', 'sister': '👧', 'spider': '🕷️',
    'sweater': '🧥', 'tiger': '🐯', 'tomato': '🍅', 'turtle': '🐢', 'wagon': '🛒',
    'wallet': '👛', 'winter': '❄️', 'yellow': '🟡', 'zipper': '🤐', 'brother': '👦',
    
    // ========== INGLÉS - NIVEL 3 (50 palabras) ==========
    'butterfly': '���', 'elephant': '🐘', 'dinosaur': '🦕', 'hamburger': '🍔', 
    'helicopter': '🚁', 'umbrella': '☂️', 'telephone': '📱', 'computer': '💻', 
    'television': '📺', 'kangaroo': '🦘', 'watermelon': '🍉', 'strawberry': '🍓', 
    'chocolate': '🍫', 'photograph': '📷', 'basketball': '🏀', 'motorcycle': '🏍️', 
    'crocodile': '🐊', 'alligator': '🐊', 'octopus': '🐙', 'jellyfish': '🪼',
    'caterpillar': '🐛', 'grasshopper': '🦗', 'ladybug': '🐞', 'dragonfly': '🦋', 
    'blueberry': '🫐', 'raspberry': '🍇', 'pineapple': '🍍', 'avocado': '🥑', 
    'broccoli': '🥦', 'cauliflower': '🥦', 'ambulance': '🚑', 'firetruck': '🚒', 
    'policeman': '👮', 'astronaut': '👨‍🚀', 'microscope': '🔬', 'telescope': '🔭', 
    'thermometer': '🌡️', 'calculator': '🧮', 'dictionary': '📖', 'library': '📚',
    'hospital': '🏥', 'supermarket': '🛒', 'restaurant': '🍽️', 'playground': '🛝', 
    'trampoline': '🤸', 'xylophone': '🎵', 'harmonica': '🎵', 'accordion': '🪗', 
    'binoculars': '🔭', 'parachute': '🪂', 'bicycle': '🚲', 'vegetable': '🥬', 'tornado': '⛈️'
  };
  
  // Convertir a minúsculas para comparar
  const emoji = emojiMap[word.toLowerCase()];
  
  // Si no encuentra el emoji, devolver uno genérico
  return emoji || '📝';
}
  createSyllableButtons() {
    DOMUtils.clearContent(this.elements.syllableOptions);
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
    const button = this.elements.syllableOptions.querySelector(`[data-syllable="${lastSyllable}"]`);
    if (button) {
      button.disabled = false;
      DOMUtils.enable(button);
    }
    this.displaySelectedSyllables();
    Logger.log(`↩️ Sílaba deshecha: ${lastSyllable}`);
  }

  async playCurrentAudio() {
    if (!this.currentStimulus) return;
    DOMUtils.disable(this.elements.playAudioBtn);
    try {
      await this.synthesizeSpeech(this.currentStimulus.word);
      this.timeTracker.start();
    } catch (error) {
      Logger.error('Error reproduciendo audio', error);
    } finally {
      setTimeout(() => {
        DOMUtils.enable(this.elements.playAudioBtn);
      }, 1000);
    }
  }

  synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
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
    } catch (error) {}
  }

  async checkAnswer() {
    if (this.selectedSyllables.length === 0) {
      alert('Por favor selecciona al menos una sílaba');
      return;
    }
    this.isAnswered = true;
    const reactionTime = this.timeTracker.recordReaction();
    const isCorrect = ValidationUtils.isValidResponse(this.selectedSyllables, this.currentStimulus.syllables);
    const points = CalculationUtils.calculatePoints(isCorrect, reactionTime, this.currentDifficulty);
    Logger.log(`✅ Correcto: ${isCorrect}, Puntos: ${points}`);
    this.totalScore += points;
    if (isCorrect) this.correctAnswers++;
    this.elements.scoreValue.textContent = this.totalScore;
    await this.saveResponse({
      stimulusId: this.currentStimulus.id,
      correct: isCorrect,
      selectedSyllables: this.selectedSyllables,
      correctSyllables: this.currentStimulus.syllables,
      reactionTime: reactionTime,
      points: points
    });
    this.showFeedback(isCorrect, points, reactionTime);
  }

  async saveResponse(responseData) {
    try {
      await db.collection('sessions').doc(this.currentSessionId).collection('responses').add({
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
    message.textContent = isCorrect ? `¡Excelente! La respuesta fue correcta.` : `La respuesta correcta es: ${this.currentStimulus.syllables.join(' - ')}`;
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
  }

  updateProgress() {
    const progress = (this.currentQuestion / this.totalQuestions) * 100;
    this.elements.progressFill.style.width = progress + '%';
    this.elements.questionNumber.textContent = this.currentQuestion;
    this.elements.totalQuestions.textContent = this.totalQuestions;
  }

  async endGame() {
    try {
      this.stopGameTimer();
      const accuracy = CalculationUtils.calculateAccuracy(this.correctAnswers, this.totalQuestions);
      const avgReactionTime = this.timeTracker.getAverageReactionTime();
      await db.collection('sessions').doc(this.currentSessionId).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalScore: this.totalScore,
        correctAnswers: this.correctAnswers,
        totalQuestions: this.totalQuestions,
        accuracy: accuracy,
        averageReactionTime: avgReactionTime,
        totalGameTime: this.gameTotalTime
      });
      if (this.studentCode) {
        try {
          await db.collection('students').doc(this.studentCode).update({
            gamesCompleted: firebase.firestore.FieldValue.arrayUnion('game1'),
            game1LastScore: this.totalScore,
            game1LastAccuracy: accuracy,
            game1LastTime: this.gameTotalTime,
            game1CompletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          Logger.log('✅ Datos del estudiante actualizados');
        } catch (error) {
          Logger.error('Error actualizando estudiante', error);
        }
      }
      this.elements.finalScore.textContent = this.totalScore;
      this.showEndScreen(accuracy, avgReactionTime);
      StorageUtils.setItem(`session_${this.currentSessionId}`, {
        sessionId: this.currentSessionId,
        studentCode: this.studentCode,
        language: this.currentLanguage,
        difficulty: this.currentDifficulty,
        totalScore: this.totalScore,
        correctAnswers: this.correctAnswers,
        totalQuestions: this.totalQuestions,
        accuracy: accuracy,
        averageReactionTime: avgReactionTime,
        totalGameTime: this.gameTotalTime,
        responses: this.allResponses,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Error finalizando sesión', error);
      this.stopGameTimer();
      const accuracy = CalculationUtils.calculateAccuracy(this.correctAnswers, this.totalQuestions);
      const avgReactionTime = this.timeTracker.getAverageReactionTime();
      this.elements.finalScore.textContent = this.totalScore;
      this.showEndScreen(accuracy, avgReactionTime);
    }
  }

  showEndScreen(accuracy, avgReactionTime) {
    DOMUtils.hide(this.elements.feedbackScreen);
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);
    this.elements.finalAccuracy.textContent = `${accuracy}%`;
    this.elements.finalAvgTime.textContent = `${avgReactionTime} ms`;
    this.elements.finalScore.textContent = this.totalScore;
    const minutes = Math.floor(this.gameTotalTime / 60);
    const seconds = this.gameTotalTime % 60;
    Logger.log(`📊 Final: ${accuracy}%, ${this.totalScore} pts, ${minutes}:${seconds}`);
    const message = this.generateMotivationalMessage(accuracy);
    this.elements.endMessage.textContent = message;
    this.addNextGameButton();
  }

  addNextGameButton() {
    let nextGameDiv = document.getElementById('nextGameContainer');
    
    if (!nextGameDiv) {
      nextGameDiv = document.createElement('div');
      nextGameDiv.id = 'nextGameContainer';
      nextGameDiv.className = 'next-game-section';
      nextGameDiv.innerHTML = `
        <h3 class="next-game-title">🎮 ¿Listo para el siguiente?</h3>
        <p class="next-game-text">Juego 2: Memoria Mágica</p>
        <a href="game2.html?code=${this.studentCode}" class="btn-next-game">
          <span class="btn-icon">▶️</span>
          <span class="btn-text">IR AL JUEGO 2</span>
        </a>
      `;

      const endMessage = this.elements.endMessage;
      endMessage.parentNode.insertBefore(nextGameDiv, endMessage.nextSibling);
    }
  }

  generateMotivationalMessage(accuracy) {
    if (accuracy === 100) return '🌟 ¡Perfecto! ¡Eres un campeón!';
    else if (accuracy >= 90) return '⭐ ¡Excelente trabajo!';
    else if (accuracy >= 80) return '👏 ¡Muy bien!';
    else if (accuracy >= 70) return '💪 ¡Buen esfuerzo!';
    else return '🎯 ¡Sigue intentando!';
  }

  async resetGame() {
    this.stopGameTimer();
    this.timeTracker.reset();
    this.selectedSyllables = [];
    this.currentQuestion = 0;
    this.totalScore = 0;
    this.correctAnswers = 0;
    this.allResponses = [];
    this.studentCode = null;
    this.studentName = null;
    this.studentAge = null;
    this.studentGender = null;
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    const form = document.getElementById('participantForm');
    if (form) form.reset();
    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.show(this.elements.startScreen);
    await this.loadStimuli();
    Logger.log('🔄 Juego reiniciado');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SilabasDanzantesGame;
}