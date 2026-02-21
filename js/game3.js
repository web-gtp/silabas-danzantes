// frontend/js/game3.js
// Lógica del Juego 3: Palabras Secretas - VERSIÓN COMPLETA CON 300 PALABRAS

class PalabrasSecretasGame {
  constructor() {
    this.currentSessionId = null;
    this.studentCode = null;
    this.studentName = null;
    this.currentLanguage = 'es';
    this.currentDifficulty = 2;
    this.totalScore = 0;
    this.correctAnswers = 0;
    this.currentQuestion = 0;
    this.totalQuestions = 10;
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    this.timerInterval = null;
    this.allWords = [];
    this.currentWord = null;
    this.selectedLetters = [];
    this.allResponses = [];
    this.timeTracker = new TimeTracker();
    this.elements = {};
  }

  async init() {
    Logger.log('🔤 Inicializando Palabras Secretas...');
    try {
      this.cacheElements();
      this.loadWordsData();
      this.setupEventListeners();
      this.checkStudentCode();
      Logger.log('✅ Juego 3 inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego 3', error);
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
      playAudioBtn: document.getElementById('playAudioBtn'),
      wordDisplay: document.getElementById('wordDisplay'),
      letterOptions: document.getElementById('letterOptions'),
      clearBtn: document.getElementById('clearBtn'),
      checkBtn: document.getElementById('checkBtn'),
      feedbackContent: document.getElementById('feedbackContent'),
      nextBtn: document.getElementById('nextBtn'),
      finalAccuracy: document.getElementById('finalAccuracy'),
      finalAvgTime: document.getElementById('finalAvgTime'),
      finalScore: document.getElementById('finalScore'),
      finalTime: document.getElementById('finalTime'),
      endMessage: document.getElementById('endMessage'),
      restartBtn: document.getElementById('restartBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };
    Logger.log('✅ Elementos del DOM cacheados');
  }

  setupEventListeners() {
    const studentCodeForm = document.getElementById('studentCodeForm');
    if (studentCodeForm) {
      studentCodeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStudentCodeSubmit();
      });
    }

    this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));
    this.elements.playAudioBtn.addEventListener('click', () => this.playCurrentAudio());
    this.elements.clearBtn.addEventListener('click', () => this.clearSelection());
    this.elements.checkBtn.addEventListener('click', () => this.checkAnswer());
    this.elements.nextBtn.addEventListener('click', () => this.handleNextQuestion());
    this.elements.restartBtn.addEventListener('click', () => this.resetGame());

    const goToGame4Btn = document.getElementById('goToGame4Btn');
    if (goToGame4Btn) {
      goToGame4Btn.addEventListener('click', () => this.goToNextGame());
    }

    Logger.log('✅ Event listeners configurados');
  }

 checkStudentCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      document.getElementById('studentCodeInput').value = code;
    }
    const lang = urlParams.get('lang');
    if (lang === 'es' || lang === 'en') {
      this.currentLanguage = lang;
      if (lang === 'es') {
        this.elements.langBtnEs.classList.add('lang-btn--active');
        this.elements.langBtnEn.classList.remove('lang-btn--active');
      } else {
        this.elements.langBtnEn.classList.add('lang-btn--active');
        this.elements.langBtnEs.classList.remove('lang-btn--active');
      }
    }
    const diff = parseInt(urlParams.get('diff'));
    if (diff === 1 || diff === 2 || diff === 3) {
      this.currentDifficulty = diff;
      if (this.elements.difficultySelect) {
        this.elements.difficultySelect.value = String(diff);
      }
    }
  }

  async handleStudentCodeSubmit() {
    try {
      const studentCode = document.getElementById('studentCodeInput').value.trim().toUpperCase();

      if (!studentCode || studentCode.length < 3) {
        alert('Por favor ingresa tu código de estudiante 🎫');
        return;
      }

      this.studentCode = studentCode;
      Logger.log(`🔍 Buscando estudiante: ${studentCode}`);
      DOMUtils.showLoading();

      try {
        const studentDoc = await db.collection('students').doc(studentCode).get();

        if (studentDoc.exists) {
          this.studentName = studentDoc.data().name;
          Logger.log(`✅ Estudiante encontrado: ${this.studentName}`);
          
          await db.collection('students').doc(studentCode).update({
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalSessions: firebase.firestore.FieldValue.increment(1)
          });
        } else {
          Logger.warn('⚠️ Estudiante no encontrado, creando nuevo registro');
          this.studentName = 'Jugador';
          
          await db.collection('students').doc(studentCode).set({
            code: studentCode,
            name: 'Jugador',
            totalSessions: 1,
            gamesCompleted: [],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (error) {
        Logger.error('Error consultando Firebase', error);
        this.studentName = 'Jugador';
      }

      DOMUtils.hideLoading();
      await this.startGame();

    } catch (error) {
      Logger.error('Error en formulario', error);
      alert('Hubo un error. Intenta de nuevo.');
      DOMUtils.hideLoading();
    }
  }

  loadWordsData() {
    const spanishWords = [
      // NIVEL 1 (FÁCIL): 50 PALABRAS - 1 LETRA FALTANTE
      { id: "es_w001", word: "GATO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐱+Gato", difficulty: 1, language: "es" },
      { id: "es_w002", word: "PERRO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐶+Perro", difficulty: 1, language: "es" },
      { id: "es_w003", word: "CASA", image: "https://via.placeholder.com/200/E24A4A/FFFFFF?text=🏠+Casa", difficulty: 1, language: "es" },
      { id: "es_w004", word: "SOL", image: "https://via.placeholder.com/200/F5A623/FFFFFF?text=☀️+Sol", difficulty: 1, language: "es" },
      { id: "es_w005", word: "LUNA", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🌙+Luna", difficulty: 1, language: "es" },
      { id: "es_w006", word: "FLOR", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌸+Flor", difficulty: 1, language: "es" },
      { id: "es_w007", word: "ARBOL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🌳+Árbol", difficulty: 1, language: "es" },
      { id: "es_w008", word: "AGUA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=💧+Agua", difficulty: 1, language: "es" },
      { id: "es_w009", word: "FUEGO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🔥+Fuego", difficulty: 1, language: "es" },
      { id: "es_w010", word: "LIBRO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=📖+Libro", difficulty: 1, language: "es" },
      { id: "es_w011", word: "MESA", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🪑+Mesa", difficulty: 1, language: "es" },
      { id: "es_w012", word: "SILLA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🪑+Silla", difficulty: 1, language: "es" },
      { id: "es_w013", word: "CAMA", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🛏️+Cama", difficulty: 1, language: "es" },
      { id: "es_w014", word: "PUERTA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🚪+Puerta", difficulty: 1, language: "es" },
      { id: "es_w015", word: "VENTANA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🪟+Ventana", difficulty: 1, language: "es" },
      { id: "es_w016", word: "COCHE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚗+Coche", difficulty: 1, language: "es" },
      { id: "es_w017", word: "AVION", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=✈️+Avión", difficulty: 1, language: "es" },
      { id: "es_w018", word: "BARCO", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🚢+Barco", difficulty: 1, language: "es" },
      { id: "es_w019", word: "TREN", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚂+Tren", difficulty: 1, language: "es" },
      { id: "es_w020", word: "GLOBO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎈+Globo", difficulty: 1, language: "es" },
      { id: "es_w021", word: "REGALO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎁+Regalo", difficulty: 1, language: "es" },
      { id: "es_w022", word: "PASTEL", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎂+Pastel", difficulty: 1, language: "es" },
      { id: "es_w023", word: "PIZZA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍕+Pizza", difficulty: 1, language: "es" },
      { id: "es_w024", word: "HELADO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍦+Helado", difficulty: 1, language: "es" },
      { id: "es_w025", word: "CAFE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=☕+Café", difficulty: 1, language: "es" },
      { id: "es_w026", word: "MANZANA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🍎+Manzana", difficulty: 1, language: "es" },
      { id: "es_w027", word: "BANANA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍌+Banana", difficulty: 1, language: "es" },
      { id: "es_w028", word: "NARANJA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🍊+Naranja", difficulty: 1, language: "es" },
      { id: "es_w029", word: "UVAS", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🍇+Uvas", difficulty: 1, language: "es" },
      { id: "es_w030", word: "PERA", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🍐+Pera", difficulty: 1, language: "es" },
      { id: "es_w031", word: "OSO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐻+Oso", difficulty: 1, language: "es" },
      { id: "es_w032", word: "LOBO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐺+Lobo", difficulty: 1, language: "es" },
      { id: "es_w033", word: "ZORRO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦊+Zorro", difficulty: 1, language: "es" },
      { id: "es_w034", word: "CONEJO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐰+Conejo", difficulty: 1, language: "es" },
      { id: "es_w035", word: "RATON", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐭+Ratón", difficulty: 1, language: "es" },
      { id: "es_w036", word: "TORTUGA", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐢+Tortuga", difficulty: 1, language: "es" },
      { id: "es_w037", word: "RANA", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐸+Rana", difficulty: 1, language: "es" },
      { id: "es_w038", word: "PEZ", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐟+Pez", difficulty: 1, language: "es" },
      { id: "es_w039", word: "ABEJA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐝+Abeja", difficulty: 1, language: "es" },
      { id: "es_w040", word: "HORMIGA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐜+Hormiga", difficulty: 1, language: "es" },
      { id: "es_w041", word: "NUBE", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=☁️+Nube", difficulty: 1, language: "es" },
      { id: "es_w042", word: "LLUVIA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🌧️+Lluvia", difficulty: 1, language: "es" },
      { id: "es_w043", word: "RAYO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⚡+Rayo", difficulty: 1, language: "es" },
      { id: "es_w044", word: "NIEVE", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=❄️+Nieve", difficulty: 1, language: "es" },
      { id: "es_w045", word: "VIENTO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=💨+Viento", difficulty: 1, language: "es" },
      { id: "es_w046", word: "ESTRELLA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⭐+Estrella", difficulty: 1, language: "es" },
      { id: "es_w047", word: "PLANETA", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🪐+Planeta", difficulty: 1, language: "es" },
      { id: "es_w048", word: "COHETE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚀+Cohete", difficulty: 1, language: "es" },
      { id: "es_w049", word: "ROBOT", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🤖+Robot", difficulty: 1, language: "es" },
      { id: "es_w050", word: "JUGUETE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🧸+Juguete", difficulty: 1, language: "es" },

      // NIVEL 2 (NORMAL): 50 PALABRAS - 2-3 LETRAS FALTANTES
      { id: "es_w051", word: "LEON", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦁+León", difficulty: 2, language: "es" },
      { id: "es_w052", word: "TIGRE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🐯+Tigre", difficulty: 2, language: "es" },
      { id: "es_w053", word: "ELEFANTE", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐘+Elefante", difficulty: 2, language: "es" },
      { id: "es_w054", word: "JIRAFA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦒+Jirafa", difficulty: 2, language: "es" },
      { id: "es_w055", word: "CEBRA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦓+Cebra", difficulty: 2, language: "es" },
      { id: "es_w056", word: "MONO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐵+Mono", difficulty: 2, language: "es" },
      { id: "es_w057", word: "GORILA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦍+Gorila", difficulty: 2, language: "es" },
      { id: "es_w058", word: "PANDA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐼+Panda", difficulty: 2, language: "es" },
      { id: "es_w059", word: "KOALA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐨+Koala", difficulty: 2, language: "es" },
      { id: "es_w060", word: "CABALLO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐴+Caballo", difficulty: 2, language: "es" },
      { id: "es_w061", word: "VACA", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐄+Vaca", difficulty: 2, language: "es" },
      { id: "es_w062", word: "CERDO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐖+Cerdo", difficulty: 2, language: "es" },
      { id: "es_w063", word: "OVEJA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐑+Oveja", difficulty: 2, language: "es" },
      { id: "es_w064", word: "GALLINA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐔+Gallina", difficulty: 2, language: "es" },
      { id: "es_w065", word: "PATO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦆+Pato", difficulty: 2, language: "es" },
      { id: "es_w066", word: "PINGUINO", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐧+Pingüino", difficulty: 2, language: "es" },
      { id: "es_w067", word: "AGUILA", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦅+Águila", difficulty: 2, language: "es" },
      { id: "es_w068", word: "BUHO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦉+Búho", difficulty: 2, language: "es" },
      { id: "es_w069", word: "LORO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🦜+Loro", difficulty: 2, language: "es" },
      { id: "es_w070", word: "PALOMA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🕊️+Paloma", difficulty: 2, language: "es" },
      { id: "es_w071", word: "DELFIN", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐬+Delfín", difficulty: 2, language: "es" },
      { id: "es_w072", word: "BALLENA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐋+Ballena", difficulty: 2, language: "es" },
      { id: "es_w073", word: "TIBURON", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🦈+Tiburón", difficulty: 2, language: "es" },
      { id: "es_w074", word: "PULPO", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🐙+Pulpo", difficulty: 2, language: "es" },
      { id: "es_w075", word: "CANGREJO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦀+Cangrejo", difficulty: 2, language: "es" },
      { id: "es_w076", word: "ESTRELLA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⭐+Estrella", difficulty: 2, language: "es" },
      { id: "es_w077", word: "CARACOL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐌+Caracol", difficulty: 2, language: "es" },
      { id: "es_w078", word: "SERPIENTE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐍+Serpiente", difficulty: 2, language: "es" },
      { id: "es_w079", word: "LAGARTO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🦎+Lagarto", difficulty: 2, language: "es" },
      { id: "es_w080", word: "COCODRILO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐊+Cocodrilo", difficulty: 2, language: "es" },
      { id: "es_w081", word: "CAMELLO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐪+Camello", difficulty: 2, language: "es" },
      { id: "es_w082", word: "TORO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐂+Toro", difficulty: 2, language: "es" },
      { id: "es_w083", word: "CABRA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐐+Cabra", difficulty: 2, language: "es" },
      { id: "es_w084", word: "CIERVO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦌+Ciervo", difficulty: 2, language: "es" },
      { id: "es_w085", word: "FOCA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🦭+Foca", difficulty: 2, language: "es" },
      { id: "es_w086", word: "MAPACHE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦝+Mapache", difficulty: 2, language: "es" },
      { id: "es_w087", word: "HAMSTER", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐹+Hámster", difficulty: 2, language: "es" },
      { id: "es_w088", word: "PELOTA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=⚽+Pelota", difficulty: 2, language: "es" },
      { id: "es_w089", word: "ZAPATO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=👟+Zapato", difficulty: 2, language: "es" },
      { id: "es_w090", word: "CAMISA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👔+Camisa", difficulty: 2, language: "es" },
      { id: "es_w091", word: "PANTALON", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👖+Pantalón", difficulty: 2, language: "es" },
      { id: "es_w092", word: "SOMBRERO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎩+Sombrero", difficulty: 2, language: "es" },
      { id: "es_w093", word: "GAFAS", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👓+Gafas", difficulty: 2, language: "es" },
      { id: "es_w094", word: "RELOJ", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⏰+Reloj", difficulty: 2, language: "es" },
      { id: "es_w095", word: "MALETA", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🧳+Maleta", difficulty: 2, language: "es" },
      { id: "es_w096", word: "PARAGUAS", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=☂️+Paraguas", difficulty: 2, language: "es" },
      { id: "es_w097", word: "MOCHILA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎒+Mochila", difficulty: 2, language: "es" },
      { id: "es_w098", word: "LAPIZ", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=✏️+Lápiz", difficulty: 2, language: "es" },
      { id: "es_w099", word: "TIJERAS", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=✂️+Tijeras", difficulty: 2, language: "es" },
      { id: "es_w100", word: "PINCEL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🖌️+Pincel", difficulty: 2, language: "es" },

      // NIVEL 3 (DIFÍCIL): 50 PALABRAS - 3-4 LETRAS FALTANTES
      { id: "es_w101", word: "RINOCERONTE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦏+Rinoceronte", difficulty: 3, language: "es" },
      { id: "es_w102", word: "HIPOPOTAMO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦛+Hipopótamo", difficulty: 3, language: "es" },
      { id: "es_w103", word: "DINOSAURIO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦕+Dinosaurio", difficulty: 3, language: "es" },
      { id: "es_w104", word: "MARIPOSA", image: "https://via.placeholder.com/200/BD10E0/FFFFFF?text=🦋+Mariposa", difficulty: 3, language: "es" },
      { id: "es_w105", word: "MARIQUITA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🐞+Mariquita", difficulty: 3, language: "es" },
      { id: "es_w106", word: "HELICOPTERO", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🚁+Helicóptero", difficulty: 3, language: "es" },
      { id: "es_w107", word: "COMPUTADORA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=💻+Computadora", difficulty: 3, language: "es" },
      { id: "es_w108", word: "TELEVISION", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=📺+Televisión", difficulty: 3, language: "es" },
      { id: "es_w109", word: "TELEFONO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=📱+Teléfono", difficulty: 3, language: "es" },
      { id: "es_w110", word: "REFRIGERADOR", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🧊+Refrigerador", difficulty: 3, language: "es" },
      { id: "es_w111", word: "AUTOMOVIL", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚗+Automóvil", difficulty: 3, language: "es" },
      { id: "es_w112", word: "BICICLETA", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🚲+Bicicleta", difficulty: 3, language: "es" },
      { id: "es_w113", word: "MOTOCICLETA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🏍️+Motocicleta", difficulty: 3, language: "es" },
      { id: "es_w114", word: "PARACAIDAS", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🪂+Paracaídas", difficulty: 3, language: "es" },
      { id: "es_w115", word: "TELESCOPIO", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🔭+Telescopio", difficulty: 3, language: "es" },
      { id: "es_w116", word: "MICROSCOPIO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🔬+Microscopio", difficulty: 3, language: "es" },
      { id: "es_w117", word: "TERMOMETRO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌡️+Termómetro", difficulty: 3, language: "es" },
      { id: "es_w118", word: "CALENDARIO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=📅+Calendario", difficulty: 3, language: "es" },
      { id: "es_w119", word: "DICCIONARIO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=📖+Diccionario", difficulty: 3, language: "es" },
      { id: "es_w120", word: "BIBLIOTECA", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=📚+Biblioteca", difficulty: 3, language: "es" },
      { id: "es_w121", word: "UNIVERSIDAD", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🎓+Universidad", difficulty: 3, language: "es" },
      { id: "es_w122", word: "LABORATORIO", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🧪+Laboratorio", difficulty: 3, language: "es" },
      { id: "es_w123", word: "EXPERIMENTO", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🔬+Experimento", difficulty: 3, language: "es" },
      { id: "es_w124", word: "ASTRONAUTA", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=👨‍🚀+Astronauta", difficulty: 3, language: "es" },
      { id: "es_w125", word: "VIDEOJUEGO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎮+Videojuego", difficulty: 3, language: "es" },
      { id: "es_w126", word: "FOTOGRAFIA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=📷+Fotografía", difficulty: 3, language: "es" },
      { id: "es_w127", word: "CARRETERA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🛣️+Carretera", difficulty: 3, language: "es" },
      { id: "es_w128", word: "SEMAFORO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🚦+Semáforo", difficulty: 3, language: "es" },
      { id: "es_w129", word: "AMBULANCIA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚑+Ambulancia", difficulty: 3, language: "es" },
      { id: "es_w130", word: "BOMBERO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=👨‍🚒+Bombero", difficulty: 3, language: "es" },
      { id: "es_w131", word: "POLICIA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👮+Policía", difficulty: 3, language: "es" },
      { id: "es_w132", word: "ENFERMERA", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=👩‍⚕️+Enfermera", difficulty: 3, language: "es" },
      { id: "es_w133", word: "SUPERHEROE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦸+Superhéroe", difficulty: 3, language: "es" },
      { id: "es_w134", word: "PRINCESA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=👸+Princesa", difficulty: 3, language: "es" },
      { id: "es_w135", word: "DRAGON", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐉+Dragón", difficulty: 3, language: "es" },
      { id: "es_w136", word: "UNICORNIO", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🦄+Unicornio", difficulty: 3, language: "es" },
      { id: "es_w137", word: "ARCOIRIS", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🌈+Arcoíris", difficulty: 3, language: "es" },
      { id: "es_w138", word: "TRAMPOLIN", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🤸+Trampolín", difficulty: 3, language: "es" },
      { id: "es_w139", word: "TOBOGAN", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🛝+Tobogán", difficulty: 3, language: "es" },
      { id: "es_w140", word: "COLUMPIO", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🎢+Columpio", difficulty: 3, language: "es" },
      { id: "es_w141", word: "CARRUSEL", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎠+Carrusel", difficulty: 3, language: "es" },
      { id: "es_w142", word: "PAYASO", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🤡+Payaso", difficulty: 3, language: "es" },
      { id: "es_w143", word: "MALABARISTA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🤹+Malabarista", difficulty: 3, language: "es" },
      { id: "es_w144", word: "EQUILIBRISTA", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🎪+Equilibrista", difficulty: 3, language: "es" },
      { id: "es_w145", word: "ACROBATA", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🤸+Acróbata", difficulty: 3, language: "es" },
      { id: "es_w146", word: "TRAPECISTA", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🎪+Trapecista", difficulty: 3, language: "es" },
      { id: "es_w147", word: "DOMADOR", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦁+Domador", difficulty: 3, language: "es" },
      { id: "es_w148", word: "CASTILLO", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🏰+Castillo", difficulty: 3, language: "es" },
      { id: "es_w149", word: "MONTAÑA", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=⛰️+Montaña", difficulty: 3, language: "es" },
      { id: "es_w150", word: "VOLCAN", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌋+Volcán", difficulty: 3, language: "es" }
    ];

    const englishWords = [
      // NIVEL 1 (FÁCIL): 50 PALABRAS - 1 LETRA FALTANTE
      { id: "en_w001", word: "CAT", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐱+Cat", difficulty: 1, language: "en" },
      { id: "en_w002", word: "DOG", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐶+Dog", difficulty: 1, language: "en" },
      { id: "en_w003", word: "HOUSE", image: "https://via.placeholder.com/200/E24A4A/FFFFFF?text=🏠+House", difficulty: 1, language: "en" },
      { id: "en_w004", word: "SUN", image: "https://via.placeholder.com/200/F5A623/FFFFFF?text=☀️+Sun", difficulty: 1, language: "en" },
      { id: "en_w005", word: "MOON", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🌙+Moon", difficulty: 1, language: "en" },
      { id: "en_w006", word: "STAR", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⭐+Star", difficulty: 1, language: "en" },
      { id: "en_w007", word: "FLOWER", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌸+Flower", difficulty: 1, language: "en" },
      { id: "en_w008", word: "TREE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🌳+Tree", difficulty: 1, language: "en" },
      { id: "en_w009", word: "WATER", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=💧+Water", difficulty: 1, language: "en" },
      { id: "en_w010", word: "FIRE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🔥+Fire", difficulty: 1, language: "en" },
      { id: "en_w011", word: "BOOK", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=📖+Book", difficulty: 1, language: "en" },
      { id: "en_w012", word: "CANDY", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🍬+Candy", difficulty: 1, language: "en" },
      { id: "en_w013", word: "CHAIR", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🪑+Chair", difficulty: 1, language: "en" },
      { id: "en_w014", word: "BED", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🛏️+Bed", difficulty: 1, language: "en" },
      { id: "en_w015", word: "DOOR", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🚪+Door", difficulty: 1, language: "en" },
      { id: "en_w016", word: "WINDOW", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🪟+Window", difficulty: 1, language: "en" },
      { id: "en_w017", word: "CAR", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚗+Car", difficulty: 1, language: "en" },
      { id: "en_w018", word: "PLANE", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=✈️+Plane", difficulty: 1, language: "en" },
      { id: "en_w019", word: "SHIP", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🚢+Ship", difficulty: 1, language: "en" },
      { id: "en_w020", word: "TRAIN", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚂+Train", difficulty: 1, language: "en" },
      { id: "en_w021", word: "BALLOON", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎈+Balloon", difficulty: 1, language: "en" },
      { id: "en_w022", word: "GIFT", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎁+Gift", difficulty: 1, language: "en" },
      { id: "en_w023", word: "CAKE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎂+Cake", difficulty: 1, language: "en" },
      { id: "en_w024", word: "PIZZA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍕+Pizza", difficulty: 1, language: "en" },
      { id: "en_w025", word: "ICECREAM", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍦+IceCream", difficulty: 1, language: "en" },
      { id: "en_w026", word: "COFFEE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=☕+Coffee", difficulty: 1, language: "en" },
      { id: "en_w027", word: "APPLE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🍎+Apple", difficulty: 1, language: "en" },
      { id: "en_w028", word: "BANANA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🍌+Banana", difficulty: 1, language: "en" },
      { id: "en_w029", word: "ORANGE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🍊+Orange", difficulty: 1, language: "en" },
      { id: "en_w030", word: "GRAPES", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🍇+Grapes", difficulty: 1, language: "en" },
      { id: "en_w031", word: "BEAR", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐻+Bear", difficulty: 1, language: "en" },
      { id: "en_w032", word: "WOLF", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐺+Wolf", difficulty: 1, language: "en" },
      { id: "en_w033", word: "FOX", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦊+Fox", difficulty: 1, language: "en" },
      { id: "en_w034", word: "RABBIT", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐰+Rabbit", difficulty: 1, language: "en" },
      { id: "en_w035", word: "MOUSE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐭+Mouse", difficulty: 1, language: "en" },
      { id: "en_w036", word: "TURTLE", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐢+Turtle", difficulty: 1, language: "en" },
      { id: "en_w037", word: "FROG", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐸+Frog", difficulty: 1, language: "en" },
      { id: "en_w038", word: "FISH", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐟+Fish", difficulty: 1, language: "en" },
      { id: "en_w039", word: "BEE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐝+Bee", difficulty: 1, language: "en" },
      { id: "en_w040", word: "ANT", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐜+Ant", difficulty: 1, language: "en" },
      { id: "en_w041", word: "CLOUD", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=☁️+Cloud", difficulty: 1, language: "en" },
      { id: "en_w042", word: "RAIN", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🌧️+Rain", difficulty: 1, language: "en" },
      { id: "en_w043", word: "SNOW", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=❄️+Snow", difficulty: 1, language: "en" },
      { id: "en_w044", word: "WIND", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=💨+Wind", difficulty: 1, language: "en" },
      { id: "en_w045", word: "STORM", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=⛈️+Storm", difficulty: 1, language: "en" },
      { id: "en_w046", word: "PLANET", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🪐+Planet", difficulty: 1, language: "en" },
      { id: "en_w047", word: "ROCKET", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚀+Rocket", difficulty: 1, language: "en" },
      { id: "en_w048", word: "ROBOT", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🤖+Robot", difficulty: 1, language: "en" },
      { id: "en_w049", word: "TOY", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🧸+Toy", difficulty: 1, language: "en" },
      { id: "en_w050", word: "BALL", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=⚽+Ball", difficulty: 1, language: "en" },

      // NIVEL 2 (NORMAL): 50 PALABRAS - 2-3 LETRAS FALTANTES
      { id: "en_w051", word: "LION", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦁+Lion", difficulty: 2, language: "en" },
      { id: "en_w052", word: "TIGER", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🐯+Tiger", difficulty: 2, language: "en" },
      { id: "en_w053", word: "ELEPHANT", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐘+Elephant", difficulty: 2, language: "en" },
      { id: "en_w054", word: "GIRAFFE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦒+Giraffe", difficulty: 2, language: "en" },
      { id: "en_w055", word: "ZEBRA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦓+Zebra", difficulty: 2, language: "en" },
      { id: "en_w056", word: "MONKEY", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐵+Monkey", difficulty: 2, language: "en" },
      { id: "en_w057", word: "GORILLA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦍+Gorilla", difficulty: 2, language: "en" },
      { id: "en_w058", word: "PANDA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐼+Panda", difficulty: 2, language: "en" },
      { id: "en_w059", word: "KOALA", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐨+Koala", difficulty: 2, language: "en" },
      { id: "en_w060", word: "HORSE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐴+Horse", difficulty: 2, language: "en" },
      { id: "en_w061", word: "COW", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐄+Cow", difficulty: 2, language: "en" },
      { id: "en_w062", word: "PIG", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐖+Pig", difficulty: 2, language: "en" },
      { id: "en_w063", word: "SHEEP", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐑+Sheep", difficulty: 2, language: "en" },
      { id: "en_w064", word: "CHICKEN", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐔+Chicken", difficulty: 2, language: "en" },
      { id: "en_w065", word: "DUCK", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🦆+Duck", difficulty: 2, language: "en" },
      { id: "en_w066", word: "PENGUIN", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐧+Penguin", difficulty: 2, language: "en" },
      { id: "en_w067", word: "EAGLE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦅+Eagle", difficulty: 2, language: "en" },
      { id: "en_w068", word: "OWL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦉+Owl", difficulty: 2, language: "en" },
      { id: "en_w069", word: "PARROT", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🦜+Parrot", difficulty: 2, language: "en" },
      { id: "en_w070", word: "DOVE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🕊️+Dove", difficulty: 2, language: "en" },
      { id: "en_w071", word: "DOLPHIN", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐬+Dolphin", difficulty: 2, language: "en" },
      { id: "en_w072", word: "WHALE", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🐋+Whale", difficulty: 2, language: "en" },
      { id: "en_w073", word: "SHARK", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🦈+Shark", difficulty: 2, language: "en" },
      { id: "en_w074", word: "OCTOPUS", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🐙+Octopus", difficulty: 2, language: "en" },
      { id: "en_w075", word: "CRAB", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦀+Crab", difficulty: 2, language: "en" },
      { id: "en_w076", word: "STARFISH", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⭐+Starfish", difficulty: 2, language: "en" },
      { id: "en_w077", word: "SNAIL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐌+Snail", difficulty: 2, language: "en" },
      { id: "en_w078", word: "SNAKE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐍+Snake", difficulty: 2, language: "en" },
      { id: "en_w079", word: "LIZARD", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦎+Lizard", difficulty: 2, language: "en" },
      { id: "en_w080", word: "CROCODILE", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🐊+Crocodile", difficulty: 2, language: "en" },
      { id: "en_w081", word: "CAMEL", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐪+Camel", difficulty: 2, language: "en" },
      { id: "en_w082", word: "BULL", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐂+Bull", difficulty: 2, language: "en" },
      { id: "en_w083", word: "GOAT", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🐐+Goat", difficulty: 2, language: "en" },
      { id: "en_w084", word: "DEER", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦌+Deer", difficulty: 2, language: "en" },
      { id: "en_w085", word: "SEAL", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🦭+Seal", difficulty: 2, language: "en" },
      { id: "en_w086", word: "RACCOON", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦝+Raccoon", difficulty: 2, language: "en" },
      { id: "en_w087", word: "HAMSTER", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🐹+Hamster", difficulty: 2, language: "en" },
      { id: "en_w088", word: "SOCCER", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=⚽+Soccer", difficulty: 2, language: "en" },
      { id: "en_w089", word: "SHOE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=👟+Shoe", difficulty: 2, language: "en" },
      { id: "en_w090", word: "SHIRT", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👔+Shirt", difficulty: 2, language: "en" },
      { id: "en_w091", word: "PANTS", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👖+Pants", difficulty: 2, language: "en" },
      { id: "en_w092", word: "HAT", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🎩+Hat", difficulty: 2, language: "en" },
      { id: "en_w093", word: "GLASSES", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👓+Glasses", difficulty: 2, language: "en" },
      { id: "en_w094", word: "CLOCK", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=⏰+Clock", difficulty: 2, language: "en" },
      { id: "en_w095", word: "SUITCASE", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🧳+Suitcase", difficulty: 2, language: "en" },
      { id: "en_w096", word: "UMBRELLA", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=☂️+Umbrella", difficulty: 2, language: "en" },
      { id: "en_w097", word: "BACKPACK", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎒+Backpack", difficulty: 2, language: "en" },
      { id: "en_w098", word: "PENCIL", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=✏️+Pencil", difficulty: 2, language: "en" },
      { id: "en_w099", word: "SCISSORS", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=✂️+Scissors", difficulty: 2, language: "en" },
      { id: "en_w100", word: "BRUSH", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🖌️+Brush", difficulty: 2, language: "en" },

      // NIVEL 3 (DIFÍCIL): 50 PALABRAS - 3-4 LETRAS FALTANTES
      { id: "en_w101", word: "RHINOCEROS", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦏+Rhinoceros", difficulty: 3, language: "en" },
      { id: "en_w102", word: "HIPPOPOTAMUS", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🦛+Hippopotamus", difficulty: 3, language: "en" },
      { id: "en_w103", word: "DINOSAUR", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🦕+Dinosaur", difficulty: 3, language: "en" },
      { id: "en_w104", word: "BUTTERFLY", image: "https://via.placeholder.com/200/BD10E0/FFFFFF?text=🦋+Butterfly", difficulty: 3, language: "en" },
      { id: "en_w105", word: "LADYBUG", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🐞+Ladybug", difficulty: 3, language: "en" },
      { id: "en_w106", word: "HELICOPTER", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🚁+Helicopter", difficulty: 3, language: "en" },
      { id: "en_w107", word: "COMPUTER", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=💻+Computer", difficulty: 3, language: "en" },
      { id: "en_w108", word: "TELEVISION", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=📺+Television", difficulty: 3, language: "en" },
      { id: "en_w109", word: "TELEPHONE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=📱+Telephone", difficulty: 3, language: "en" },
      { id: "en_w110", word: "REFRIGERATOR", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=🧊+Refrigerator", difficulty: 3, language: "en" },
      { id: "en_w111", word: "AUTOMOBILE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚗+Automobile", difficulty: 3, language: "en" },
      { id: "en_w112", word: "BICYCLE", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🚲+Bicycle", difficulty: 3, language: "en" },
      { id: "en_w113", word: "MOTORCYCLE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🏍️+Motorcycle", difficulty: 3, language: "en" },
      { id: "en_w114", word: "PARACHUTE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🪂+Parachute", difficulty: 3, language: "en" },
      { id: "en_w115", word: "TELESCOPE", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🔭+Telescope", difficulty: 3, language: "en" },
      { id: "en_w116", word: "MICROSCOPE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🔬+Microscope", difficulty: 3, language: "en" },
      { id: "en_w117", word: "THERMOMETER", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌡️+Thermometer", difficulty: 3, language: "en" },
      { id: "en_w118", word: "CALENDAR", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=📅+Calendar", difficulty: 3, language: "en" },
      { id: "en_w119", word: "DICTIONARY", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=📖+Dictionary", difficulty: 3, language: "en" },
      { id: "en_w120", word: "LIBRARY", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=📚+Library", difficulty: 3, language: "en" },
      { id: "en_w121", word: "UNIVERSITY", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🎓+University", difficulty: 3, language: "en" },
      { id: "en_w122", word: "LABORATORY", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🧪+Laboratory", difficulty: 3, language: "en" },
      { id: "en_w123", word: "EXPERIMENT", image: "https://via.placeholder.com/200/95E1D3/FFFFFF?text=🔬+Experiment", difficulty: 3, language: "en" },
      { id: "en_w124", word: "ASTRONAUT", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=👨‍🚀+Astronaut", difficulty: 3, language: "en" },
      { id: "en_w125", word: "VIDEOGAME", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎮+Videogame", difficulty: 3, language: "en" },
      { id: "en_w126", word: "PHOTOGRAPH", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=📷+Photograph", difficulty: 3, language: "en" },
      { id: "en_w127", word: "HIGHWAY", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🛣️+Highway", difficulty: 3, language: "en" },
      { id: "en_w128", word: "TRAFFIC", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🚦+Traffic", difficulty: 3, language: "en" },
      { id: "en_w129", word: "AMBULANCE", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🚑+Ambulance", difficulty: 3, language: "en" },
      { id: "en_w130", word: "FIREFIGHTER", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=👨‍🚒+Firefighter", difficulty: 3, language: "en" },
      { id: "en_w131", word: "POLICE", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=👮+Police", difficulty: 3, language: "en" },
      { id: "en_w132", word: "NURSE", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=👩‍⚕️+Nurse", difficulty: 3, language: "en" },
      { id: "en_w133", word: "SUPERHERO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🦸+Superhero", difficulty: 3, language: "en" },
      { id: "en_w134", word: "PRINCESS", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=👸+Princess", difficulty: 3, language: "en" },
      { id: "en_w135", word: "DRAGON", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🐉+Dragon", difficulty: 3, language: "en" },
      { id: "en_w136", word: "UNICORN", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🦄+Unicorn", difficulty: 3, language: "en" },
      { id: "en_w137", word: "RAINBOW", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🌈+Rainbow", difficulty: 3, language: "en" },
      { id: "en_w138", word: "TRAMPOLINE", image: "https://via.placeholder.com/200/4ECDC4/FFFFFF?text=🤸+Trampoline", difficulty: 3, language: "en" },
      { id: "en_w139", word: "SLIDE", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🛝+Slide", difficulty: 3, language: "en" },
      { id: "en_w140", word: "SWING", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=🎢+Swing", difficulty: 3, language: "en" },
      { id: "en_w141", word: "CAROUSEL", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🎠+Carousel", difficulty: 3, language: "en" },
      { id: "en_w142", word: "CLOWN", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🤡+Clown", difficulty: 3, language: "en" },
      { id: "en_w143", word: "JUGGLER", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🤹+Juggler", difficulty: 3, language: "en" },
      { id: "en_w144", word: "ACROBAT", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🤸+Acrobat", difficulty: 3, language: "en" },
      { id: "en_w145", word: "MAGICIAN", image: "https://via.placeholder.com/200/9013FE/FFFFFF?text=🎩+Magician", difficulty: 3, language: "en" },
      { id: "en_w146", word: "BALLERINA", image: "https://via.placeholder.com/200/FFE66D/FFFFFF?text=🩰+Ballerina", difficulty: 3, language: "en" },
      { id: "en_w147", word: "CASTLE", image: "https://via.placeholder.com/200/95A5A6/FFFFFF?text=🏰+Castle", difficulty: 3, language: "en" },
      { id: "en_w148", word: "MOUNTAIN", image: "https://via.placeholder.com/200/7ED321/FFFFFF?text=⛰️+Mountain", difficulty: 3, language: "en" },
      { id: "en_w149", word: "VOLCANO", image: "https://via.placeholder.com/200/FF6B6B/FFFFFF?text=🌋+Volcano", difficulty: 3, language: "en" },
      { id: "en_w150", word: "WATERFALL", image: "https://via.placeholder.com/200/4A90E2/FFFFFF?text=💦+Waterfall", difficulty: 3, language: "en" }
    ];

    this.allWords = this.currentLanguage === 'es' ? spanishWords : englishWords;
    Logger.log(`✅ ${this.allWords.length} palabras cargadas para ${this.currentLanguage}`);
  }

  changeLanguage(language) {
    if (this.currentLanguage === language) return;
    this.currentLanguage = language;
    
    if (language === 'es') {
      this.elements.langBtnEs.classList.add('lang-btn--active');
      this.elements.langBtnEn.classList.remove('lang-btn--active');
    } else {
      this.elements.langBtnEn.classList.add('lang-btn--active');
      this.elements.langBtnEs.classList.remove('lang-btn--active');
    }
    
    this.loadWordsData();
    Logger.log(`✅ Idioma cambiado a: ${language}`);
  }

  async startGame() {
    try {
      const difficulty = parseInt(this.elements.difficultySelect.value);
      this.currentDifficulty = difficulty;
      this.currentQuestion = 0;
      this.totalScore = 0;
      this.correctAnswers = 0;
      this.allResponses = [];
      this.selectedLetters = [];
      
      this.elements.scoreValue.textContent = '0';
      
      await this.createSession();
      
      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);
      
      this.gameStartTime = Date.now();
      this.startGameTimer();
      
      await this.loadNextQuestion();
      
      Logger.log(`✅ Juego 3 iniciado: dificultad ${difficulty}`);
      
    } catch (error) {
      Logger.error('Error iniciando juego', error);
      alert('Error iniciando el juego');
    }
  }

  async loadNextQuestion() {
    if (this.currentQuestion >= this.totalQuestions) {
      await this.endGame();
      return;
    }
    
    this.selectedLetters = [];
    this.currentQuestion++;
    this.updateProgress();
    
    this.selectRandomWord();
    this.displayQuestion();
    this.timeTracker.start();
  }

  selectRandomWord() {
    const filtered = this.allWords.filter(w => w.difficulty === this.currentDifficulty);
    this.currentWord = filtered[Math.floor(Math.random() * filtered.length)];
    Logger.log(`✅ Palabra seleccionada: ${this.currentWord.word}`);
  }

 displayQuestion() {
  // 🔹 Ocultar la imagen que no funciona
  this.elements.stimulusImage.style.display = 'none';
  
  // 🔹 Crear contenedor para emoji gigante
  let emojiContainer = document.getElementById('emojiContainer');
  if (!emojiContainer) {
    emojiContainer = document.createElement('div');
    emojiContainer.id = 'emojiContainer';
    emojiContainer.style.fontSize = '150px';
    emojiContainer.style.textAlign = 'center';
    emojiContainer.style.marginBottom = '20px';
    emojiContainer.style.animation = 'zoomIn 0.5s ease';
    this.elements.stimulusImage.parentNode.insertBefore(emojiContainer, this.elements.stimulusImage);
  }
  
  // 🔹 Extraer emoji del texto de la URL
  const emojiMatch = this.currentWord.image.match(/text=([^+]+)/);
  const emoji = emojiMatch ? decodeURIComponent(emojiMatch[1]) : '❓';
  emojiContainer.textContent = emoji;
  
  this.createWordDisplay();
  this.createLetterOptions();
  
  // Resetear botones
  this.elements.checkBtn.disabled = true;
  this.elements.clearBtn.disabled = false;
  
  setTimeout(() => this.playCurrentAudio(), 500);
}

  createWordDisplay() {
    DOMUtils.clearContent(this.elements.wordDisplay);
    
    const word = this.currentWord.word;
    const numBlanks = this.getNumBlanks();
    const blankPositions = this.getRandomPositions(word.length, numBlanks);
    
    this.blankPositions = blankPositions;
    this.correctLetters = blankPositions.map(pos => word[pos]);
    
    for (let i = 0; i < word.length; i++) {
      const box = document.createElement('div');
      box.className = 'letter-box';
      box.dataset.position = i;
      
      if (blankPositions.includes(i)) {
        box.classList.add('letter-box--blank');
        box.textContent = '';
        box.addEventListener('click', () => this.handleBlankClick(i));
      } else {
        box.classList.add('letter-box--filled');
        box.textContent = word[i];
      }
      
      this.elements.wordDisplay.appendChild(box);
    }
  }

  getNumBlanks() {
    switch(this.currentDifficulty) {
      case 1: return 1;
      case 2: return Math.min(2, Math.floor(this.currentWord.word.length / 2));
      case 3: return Math.min(4, Math.floor(this.currentWord.word.length / 2));
      default: return 2;
    }
  }

  getRandomPositions(length, count) {
    const positions = [];
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * length);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    return positions.sort((a, b) => a - b);
  }

  createLetterOptions() {
    DOMUtils.clearContent(this.elements.letterOptions);
    
    const correctLetters = this.correctLetters;
    const distractors = this.generateDistractors(correctLetters.length * 2);
    const allOptions = [...correctLetters, ...distractors].sort(() => Math.random() - 0.5);
    
    allOptions.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'letter-btn';
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.type = 'button';
      btn.addEventListener('click', () => this.handleLetterClick(letter, btn));
      this.elements.letterOptions.appendChild(btn);
    });
  }

  generateDistractors(count) {
    const vowels = 'AEIOU';
    const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
    const all = vowels + consonants;
    const distractors = [];
    
    while (distractors.length < count) {
      const letter = all[Math.floor(Math.random() * all.length)];
      if (!this.correctLetters.includes(letter) && !distractors.includes(letter)) {
        distractors.push(letter);
      }
    }
    
    return distractors;
  }

  handleLetterClick(letter, btn) {
    if (btn.disabled) return;
    
    const nextBlankIndex = this.selectedLetters.length;
    if (nextBlankIndex >= this.blankPositions.length) return;
    
    this.selectedLetters.push(letter);
    btn.disabled = true;
    
    const position = this.blankPositions[nextBlankIndex];
    const box = this.elements.wordDisplay.querySelector(`[data-position="${position}"]`);
    box.textContent = letter;
    box.classList.remove('letter-box--blank');
    box.classList.add('letter-box--filled');
    
    this.playClickSound();
    
    if (this.selectedLetters.length === this.blankPositions.length) {
      this.elements.checkBtn.disabled = false;
    }
  }

  handleBlankClick(position) {
    // Opcional: permitir hacer clic en un espacio en blanco para rellenarlo
  }

  clearSelection() {
    this.selectedLetters = [];
    
    this.blankPositions.forEach(pos => {
      const box = this.elements.wordDisplay.querySelector(`[data-position="${pos}"]`);
      box.textContent = '';
      box.classList.remove('letter-box--filled');
      box.classList.add('letter-box--blank');
    });
    
    const buttons = this.elements.letterOptions.querySelectorAll('.letter-btn');
    buttons.forEach(btn => btn.disabled = false);
    
    this.elements.checkBtn.disabled = true;
  }

  async checkAnswer() {
    const reactionTime = this.timeTracker.recordReaction();
    const isCorrect = this.validateAnswer();
    
    const points = CalculationUtils.calculatePoints(isCorrect, reactionTime, this.currentDifficulty);
    this.totalScore += points;
    
    if (isCorrect) this.correctAnswers++;
    
    this.elements.scoreValue.textContent = this.totalScore;
    
    await this.saveResponse({
      wordId: this.currentWord.id,
      word: this.currentWord.word,
      correct: isCorrect,
      selectedLetters: this.selectedLetters,
      correctLetters: this.correctLetters,
      reactionTime: reactionTime,
      points: points
    });
    
    this.showFeedback(isCorrect, points);
  }

  validateAnswer() {
    for (let i = 0; i < this.correctLetters.length; i++) {
      if (this.selectedLetters[i] !== this.correctLetters[i]) {
        return false;
      }
    }
    return true;
  }

  showFeedback(isCorrect, points) {
    this.blankPositions.forEach(pos => {
      const box = this.elements.wordDisplay.querySelector(`[data-position="${pos}"]`);
      if (isCorrect) {
        box.classList.add('letter-box--correct');
      } else {
        box.classList.add('letter-box--wrong');
      }
    });
    
    setTimeout(() => {
      DOMUtils.hide(this.elements.gameScreen);
      DOMUtils.show(this.elements.feedbackScreen);
      
      const content = this.elements.feedbackContent;
      DOMUtils.clearContent(content);
      
      const icon = document.createElement('div');
      icon.className = 'feedback-icon';
      icon.textContent = isCorrect ? '✅' : '❌';
      
      const title = document.createElement('h3');
      title.className = 'feedback-title';
      title.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto';
      
      const message = document.createElement('p');
      message.className = 'feedback-message';
      message.textContent = isCorrect 
        ? `¡Excelente! La palabra es: ${this.currentWord.word}` 
        : `La palabra correcta es: ${this.currentWord.word}`;
      
      const pointsDiv = document.createElement('p');
      pointsDiv.className = 'feedback-points';
      pointsDiv.textContent = `+${points} puntos`;
      
      content.appendChild(icon);
      content.appendChild(title);
      content.appendChild(message);
      content.appendChild(pointsDiv);
    }, 1000);
  }

  handleNextQuestion() {
    // ✅ CORRECCIÓN DEL BUG: Mostrar gameScreen nuevamente
    DOMUtils.hide(this.elements.feedbackScreen);
    DOMUtils.show(this.elements.gameScreen);
    
    this.loadNextQuestion();
  }

  updateProgress() {
    const progress = (this.currentQuestion / this.totalQuestions) * 100;
    this.elements.progressFill.style.width = progress + '%';
    this.elements.questionNumber.textContent = this.currentQuestion;
    this.elements.totalQuestions.textContent = this.totalQuestions;
  }

  async playCurrentAudio() {
    if (!this.currentWord) return;
    DOMUtils.disable(this.elements.playAudioBtn);
    
    try {
      await this.synthesizeSpeech(this.currentWord.word);
    } catch (error) {
      Logger.error('Error reproduciendo audio', error);
    } finally {
      setTimeout(() => DOMUtils.enable(this.elements.playAudioBtn), 1000);
    }
  }

  synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.7;
        utterance.pitch = 1.1;
        utterance.onend = () => resolve();
        utterance.onerror = (error) => reject(error);
        speechSynthesis.speak(utterance);
      } else {
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
      oscillator.frequency.value = 700;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {}
  }

  async saveResponse(responseData) {
    try {
      await db.collection('sessions').doc(this.currentSessionId).collection('responses').add({
        ...responseData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.allResponses.push(responseData);
      Logger.log('✅ Respuesta guardada');
    } catch (error) {
      Logger.error('Error guardando respuesta', error);
      this.allResponses.push(responseData);
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
      this.currentSessionId = `session_g3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentCode: this.studentCode || 'ANONIMO',
        studentName: this.studentName || 'Jugador',
        gameNumber: 3,
        gameName: 'Palabras Secretas',
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
      this.currentSessionId = `session_g3_${Date.now()}`;
    }
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
            gamesCompleted: firebase.firestore.FieldValue.arrayUnion('game3'),
            game3LastScore: this.totalScore,
            game3LastAccuracy: accuracy,
            game3LastTime: this.gameTotalTime,
            game3CompletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          Logger.log('✅ Datos del estudiante actualizados');
        } catch (error) {
          Logger.error('Error actualizando estudiante', error);
        }
      }
      
      this.showEndScreen(accuracy, avgReactionTime);
      
    } catch (error) {
      Logger.error('Error finalizando juego', error);
      const accuracy = CalculationUtils.calculateAccuracy(this.correctAnswers, this.totalQuestions);
      const avgReactionTime = this.timeTracker.getAverageReactionTime();
      this.showEndScreen(accuracy, avgReactionTime);
    }
  }

  showEndScreen(accuracy, avgReactionTime) {
    DOMUtils.hide(this.elements.feedbackScreen);
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);
    
    const minutes = Math.floor(this.gameTotalTime / 60);
    const seconds = this.gameTotalTime % 60;
    
    this.elements.finalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.elements.finalAccuracy.textContent = `${accuracy}%`;
    this.elements.finalAvgTime.textContent = `${avgReactionTime}ms`;
    this.elements.finalScore.textContent = this.totalScore;
    
    const message = this.generateMotivationalMessage(accuracy);
    this.elements.endMessage.textContent = message;
    
    Logger.log(`📊 Juego 3 completado: ${this.totalScore} pts, ${accuracy}%`);
  }

  generateMotivationalMessage(accuracy) {
    if (accuracy === 100) return '🌟 ¡Perfecto! ¡Eres un experto en palabras!';
    else if (accuracy >= 90) return '⭐ ¡Excelente trabajo!';
    else if (accuracy >= 80) return '👏 ¡Muy bien!';
    else if (accuracy >= 70) return '💪 ¡Buen esfuerzo!';
    else return '🎯 ¡Sigue practicando!';
  }

goToNextGame() {
  window.location.href = `game4.html?code=${this.studentCode}&lang=${this.currentLanguage}&diff=${this.currentDifficulty}`;
}

  async resetGame() {
    this.stopGameTimer();
    this.timeTracker.reset();
    this.selectedLetters = [];
    this.currentQuestion = 0;
    this.totalScore = 0;
    this.correctAnswers = 0;
    this.allResponses = [];
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    
    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.show(this.elements.startScreen);
    
    Logger.log('🔄 Juego reiniciado');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PalabrasSecretasGame;
}