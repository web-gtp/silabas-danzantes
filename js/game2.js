// frontend/js/game2.js
// Lógica del Juego 2: Memoria Mágica - VERSIÓN COMPLETA CON 300 PARES

class MemoriaMagicaGame {
  constructor() {
    this.currentSessionId = null;
    this.studentCode = null;
    this.studentName = null;
    this.currentLanguage = 'es';
    this.currentDifficulty = 2;
    this.totalScore = 0;
    this.pairsFound = 0;
    this.totalPairs = 0;
    this.attempts = 0;
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    this.timerInterval = null;
    this.allPairs = [];
    this.currentPairs = [];
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = [];
    this.isChecking = false;
    this.elements = {};
  }

  async init() {
    Logger.log('🧠 Inicializando Memoria Mágica...');
    try {
      this.cacheElements();
      this.loadPairsData();
      this.setupEventListeners();
      this.checkStudentCode();
      Logger.log('✅ Juego 2 inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego 2', error);
      alert('Error inicializando el juego. Por favor recarga la página.');
    }
  }

  cacheElements() {
    this.elements = {
      startScreen: document.getElementById('startScreen'),
      gameScreen: document.getElementById('gameScreen'),
      endScreen: document.getElementById('endScreen'),
      scoreValue: document.getElementById('scoreValue'),
      langBtnEs: document.getElementById('langBtnEs'),
      langBtnEn: document.getElementById('langBtnEn'),
      pairsFound: document.getElementById('pairsFound'),
      totalPairs: document.getElementById('totalPairs'),
      attempts: document.getElementById('attempts'),
      cardBoard: document.getElementById('cardBoard'),
      finalTime: document.getElementById('finalTime'),
      finalAttempts: document.getElementById('finalAttempts'),
      finalAccuracy: document.getElementById('finalAccuracy'),
      finalScore: document.getElementById('finalScore'),
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
    this.elements.restartBtn.addEventListener('click', () => this.resetGame());

    const goToGame3Btn = document.getElementById('goToGame3Btn');
    if (goToGame3Btn) {
      goToGame3Btn.addEventListener('click', () => this.goToNextGame());
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

  loadPairsData() {
    const spanishPairs = [
      { id: "es_p001", emoji: "🐱", word: "gato", difficulty: 1, language: "es" },
      { id: "es_p002", emoji: "🐶", word: "perro", difficulty: 1, language: "es" },
      { id: "es_p003", emoji: "🏠", word: "casa", difficulty: 1, language: "es" },
      { id: "es_p004", emoji: "☀️", word: "sol", difficulty: 1, language: "es" },
      { id: "es_p005", emoji: "🌙", word: "luna", difficulty: 1, language: "es" },
      { id: "es_p006", emoji: "⭐", word: "estrella", difficulty: 1, language: "es" },
      { id: "es_p007", emoji: "🌸", word: "flor", difficulty: 1, language: "es" },
      { id: "es_p008", emoji: "🌳", word: "árbol", difficulty: 1, language: "es" },
      { id: "es_p009", emoji: "🍎", word: "manzana", difficulty: 1, language: "es" },
      { id: "es_p010", emoji: "🍌", word: "banana", difficulty: 1, language: "es" },
      { id: "es_p011", emoji: "🍊", word: "naranja", difficulty: 1, language: "es" },
      { id: "es_p012", emoji: "🍇", word: "uvas", difficulty: 1, language: "es" },
      { id: "es_p013", emoji: "🚗", word: "coche", difficulty: 1, language: "es" },
      { id: "es_p014", emoji: "✈️", word: "avión", difficulty: 1, language: "es" },
      { id: "es_p015", emoji: "🚢", word: "barco", difficulty: 1, language: "es" },
      { id: "es_p016", emoji: "🚂", word: "tren", difficulty: 1, language: "es" },
      { id: "es_p017", emoji: "🎈", word: "globo", difficulty: 1, language: "es" },
      { id: "es_p018", emoji: "🎁", word: "regalo", difficulty: 1, language: "es" },
      { id: "es_p019", emoji: "🎂", word: "pastel", difficulty: 1, language: "es" },
      { id: "es_p020", emoji: "🍕", word: "pizza", difficulty: 1, language: "es" },
      { id: "es_p021", emoji: "🍔", word: "hamburguesa", difficulty: 1, language: "es" },
      { id: "es_p022", emoji: "🍦", word: "helado", difficulty: 1, language: "es" },
      { id: "es_p023", emoji: "🍪", word: "galleta", difficulty: 1, language: "es" },
      { id: "es_p024", emoji: "🍩", word: "dona", difficulty: 1, language: "es" },
      { id: "es_p025", emoji: "☕", word: "café", difficulty: 1, language: "es" },
      { id: "es_p026", emoji: "🥤", word: "bebida", difficulty: 1, language: "es" },
      { id: "es_p027", emoji: "💧", word: "agua", difficulty: 1, language: "es" },
      { id: "es_p028", emoji: "🔥", word: "fuego", difficulty: 1, language: "es" },
      { id: "es_p029", emoji: "❄️", word: "hielo", difficulty: 1, language: "es" },
      { id: "es_p030", emoji: "🌊", word: "ola", difficulty: 1, language: "es" },
      { id: "es_p031", emoji: "⛰️", word: "montaña", difficulty: 1, language: "es" },
      { id: "es_p032", emoji: "🏖️", word: "playa", difficulty: 1, language: "es" },
      { id: "es_p033", emoji: "🌈", word: "arcoíris", difficulty: 1, language: "es" },
      { id: "es_p034", emoji: "☁️", word: "nube", difficulty: 1, language: "es" },
      { id: "es_p035", emoji: "🌧️", word: "lluvia", difficulty: 1, language: "es" },
      { id: "es_p036", emoji: "⛈️", word: "tormenta", difficulty: 1, language: "es" },
      { id: "es_p037", emoji: "⚡", word: "rayo", difficulty: 1, language: "es" },
      { id: "es_p038", emoji: "🌪️", word: "tornado", difficulty: 1, language: "es" },
      { id: "es_p039", emoji: "🐝", word: "abeja", difficulty: 1, language: "es" },
      { id: "es_p040", emoji: "🦋", word: "mariposa", difficulty: 1, language: "es" },
      { id: "es_p041", emoji: "🐞", word: "mariquita", difficulty: 1, language: "es" },
      { id: "es_p042", emoji: "🐜", word: "hormiga", difficulty: 1, language: "es" },
      { id: "es_p043", emoji: "🐛", word: "oruga", difficulty: 1, language: "es" },
      { id: "es_p044", emoji: "🕷️", word: "araña", difficulty: 1, language: "es" },
      { id: "es_p045", emoji: "🦗", word: "grillo", difficulty: 1, language: "es" },
      { id: "es_p046", emoji: "🐢", word: "tortuga", difficulty: 1, language: "es" },
      { id: "es_p047", emoji: "🐸", word: "rana", difficulty: 1, language: "es" },
      { id: "es_p048", emoji: "🐍", word: "serpiente", difficulty: 1, language: "es" },
      { id: "es_p049", emoji: "🦎", word: "lagarto", difficulty: 1, language: "es" },
      { id: "es_p050", emoji: "🐊", word: "cocodrilo", difficulty: 1, language: "es" },
      { id: "es_p051", emoji: "🦁", word: "león", difficulty: 2, language: "es" },
      { id: "es_p052", emoji: "🐯", word: "tigre", difficulty: 2, language: "es" },
      { id: "es_p053", emoji: "🐻", word: "oso", difficulty: 2, language: "es" },
      { id: "es_p054", emoji: "🐼", word: "panda", difficulty: 2, language: "es" },
      { id: "es_p055", emoji: "🐨", word: "koala", difficulty: 2, language: "es" },
      { id: "es_p056", emoji: "🐵", word: "mono", difficulty: 2, language: "es" },
      { id: "es_p057", emoji: "🦍", word: "gorila", difficulty: 2, language: "es" },
      { id: "es_p058", emoji: "🐘", word: "elefante", difficulty: 2, language: "es" },
      { id: "es_p059", emoji: "🦏", word: "rinoceronte", difficulty: 2, language: "es" },
      { id: "es_p060", emoji: "🦛", word: "hipopótamo", difficulty: 2, language: "es" },
      { id: "es_p061", emoji: "🐪", word: "camello", difficulty: 2, language: "es" },
      { id: "es_p062", emoji: "🦒", word: "jirafa", difficulty: 2, language: "es" },
      { id: "es_p063", emoji: "🦓", word: "cebra", difficulty: 2, language: "es" },
      { id: "es_p064", emoji: "🐎", word: "caballo", difficulty: 2, language: "es" },
      { id: "es_p065", emoji: "🦌", word: "ciervo", difficulty: 2, language: "es" },
      { id: "es_p066", emoji: "🐂", word: "toro", difficulty: 2, language: "es" },
      { id: "es_p067", emoji: "🐄", word: "vaca", difficulty: 2, language: "es" },
      { id: "es_p068", emoji: "🐖", word: "cerdo", difficulty: 2, language: "es" },
      { id: "es_p069", emoji: "🐑", word: "oveja", difficulty: 2, language: "es" },
      { id: "es_p070", emoji: "🐐", word: "cabra", difficulty: 2, language: "es" },
      { id: "es_p071", emoji: "🐓", word: "gallo", difficulty: 2, language: "es" },
      { id: "es_p072", emoji: "🐔", word: "gallina", difficulty: 2, language: "es" },
      { id: "es_p073", emoji: "🐣", word: "pollito", difficulty: 2, language: "es" },
      { id: "es_p074", emoji: "🦆", word: "pato", difficulty: 2, language: "es" },
      { id: "es_p075", emoji: "🦢", word: "cisne", difficulty: 2, language: "es" },
      { id: "es_p076", emoji: "🦉", word: "búho", difficulty: 2, language: "es" },
      { id: "es_p077", emoji: "🦅", word: "águila", difficulty: 2, language: "es" },
      { id: "es_p078", emoji: "🐧", word: "pingüino", difficulty: 2, language: "es" },
      { id: "es_p079", emoji: "🕊️", word: "paloma", difficulty: 2, language: "es" },
      { id: "es_p080", emoji: "🦜", word: "loro", difficulty: 2, language: "es" },
      { id: "es_p081", emoji: "🦩", word: "flamenco", difficulty: 2, language: "es" },
      { id: "es_p082", emoji: "🦚", word: "pavo real", difficulty: 2, language: "es" },
      { id: "es_p083", emoji: "🐟", word: "pez", difficulty: 2, language: "es" },
      { id: "es_p084", emoji: "🐠", word: "pez tropical", difficulty: 2, language: "es" },
      { id: "es_p085", emoji: "🐡", word: "pez globo", difficulty: 2, language: "es" },
      { id: "es_p086", emoji: "🦈", word: "tiburón", difficulty: 2, language: "es" },
      { id: "es_p087", emoji: "🐙", word: "pulpo", difficulty: 2, language: "es" },
      { id: "es_p088", emoji: "🦑", word: "calamar", difficulty: 2, language: "es" },
      { id: "es_p089", emoji: "🦞", word: "langosta", difficulty: 2, language: "es" },
      { id: "es_p090", emoji: "🦀", word: "cangrejo", difficulty: 2, language: "es" },
      { id: "es_p091", emoji: "🐚", word: "concha", difficulty: 2, language: "es" },
      { id: "es_p092", emoji: "🐬", word: "delfín", difficulty: 2, language: "es" },
      { id: "es_p093", emoji: "🐋", word: "ballena", difficulty: 2, language: "es" },
      { id: "es_p094", emoji: "🦭", word: "foca", difficulty: 2, language: "es" },
      { id: "es_p095", emoji: "🐺", word: "lobo", difficulty: 2, language: "es" },
      { id: "es_p096", emoji: "🦊", word: "zorro", difficulty: 2, language: "es" },
      { id: "es_p097", emoji: "🦝", word: "mapache", difficulty: 2, language: "es" },
      { id: "es_p098", emoji: "🐰", word: "conejo", difficulty: 2, language: "es" },
      { id: "es_p099", emoji: "🐭", word: "ratón", difficulty: 2, language: "es" },
      { id: "es_p100", emoji: "🐹", word: "hámster", difficulty: 2, language: "es" },
      { id: "es_p101", emoji: "🏰", word: "castillo", difficulty: 3, language: "es" },
      { id: "es_p102", emoji: "🏛️", word: "templo", difficulty: 3, language: "es" },
      { id: "es_p103", emoji: "🗼", word: "torre", difficulty: 3, language: "es" },
      { id: "es_p104", emoji: "🎪", word: "circo", difficulty: 3, language: "es" },
      { id: "es_p105", emoji: "🎭", word: "teatro", difficulty: 3, language: "es" },
      { id: "es_p106", emoji: "🎨", word: "arte", difficulty: 3, language: "es" },
      { id: "es_p107", emoji: "🎬", word: "película", difficulty: 3, language: "es" },
      { id: "es_p108", emoji: "🎤", word: "micrófono", difficulty: 3, language: "es" },
      { id: "es_p109", emoji: "🎧", word: "audífonos", difficulty: 3, language: "es" },
      { id: "es_p110", emoji: "🎼", word: "música", difficulty: 3, language: "es" },
      { id: "es_p111", emoji: "🎹", word: "piano", difficulty: 3, language: "es" },
      { id: "es_p112", emoji: "🎸", word: "guitarra", difficulty: 3, language: "es" },
      { id: "es_p113", emoji: "🎺", word: "trompeta", difficulty: 3, language: "es" },
      { id: "es_p114", emoji: "🎷", word: "saxofón", difficulty: 3, language: "es" },
      { id: "es_p115", emoji: "🥁", word: "tambor", difficulty: 3, language: "es" },
      { id: "es_p116", emoji: "🎻", word: "violín", difficulty: 3, language: "es" },
      { id: "es_p117", emoji: "🪕", word: "banjo", difficulty: 3, language: "es" },
      { id: "es_p118", emoji: "🎲", word: "dado", difficulty: 3, language: "es" },
      { id: "es_p119", emoji: "🧩", word: "rompecabezas", difficulty: 3, language: "es" },
      { id: "es_p120", emoji: "🎯", word: "diana", difficulty: 3, language: "es" },
      { id: "es_p121", emoji: "🎰", word: "casino", difficulty: 3, language: "es" },
      { id: "es_p122", emoji: "🧸", word: "oso de peluche", difficulty: 3, language: "es" },
      { id: "es_p123", emoji: "🪆", word: "muñeca rusa", difficulty: 3, language: "es" },
      { id: "es_p124", emoji: "🎮", word: "videojuego", difficulty: 3, language: "es" },
      { id: "es_p125", emoji: "🕹️", word: "joystick", difficulty: 3, language: "es" },
      { id: "es_p126", emoji: "🧩", word: "puzzle", difficulty: 3, language: "es" },
      { id: "es_p127", emoji: "🚀", word: "cohete", difficulty: 3, language: "es" },
      { id: "es_p128", emoji: "🛸", word: "platillo volador", difficulty: 3, language: "es" },
      { id: "es_p129", emoji: "🛰️", word: "satélite", difficulty: 3, language: "es" },
      { id: "es_p130", emoji: "🌌", word: "galaxia", difficulty: 3, language: "es" },
      { id: "es_p131", emoji: "🪐", word: "saturno", difficulty: 3, language: "es" },
      { id: "es_p132", emoji: "🌍", word: "tierra", difficulty: 3, language: "es" },
      { id: "es_p133", emoji: "🌎", word: "américa", difficulty: 3, language: "es" },
      { id: "es_p134", emoji: "🌏", word: "asia", difficulty: 3, language: "es" },
      { id: "es_p135", emoji: "🔭", word: "telescopio", difficulty: 3, language: "es" },
      { id: "es_p136", emoji: "🔬", word: "microscopio", difficulty: 3, language: "es" },
      { id: "es_p137", emoji: "🧪", word: "probeta", difficulty: 3, language: "es" },
      { id: "es_p138", emoji: "🧬", word: "ADN", difficulty: 3, language: "es" },
      { id: "es_p139", emoji: "🩺", word: "estetoscopio", difficulty: 3, language: "es" },
      { id: "es_p140", emoji: "💉", word: "jeringa", difficulty: 3, language: "es" },
      { id: "es_p141", emoji: "💊", word: "pastilla", difficulty: 3, language: "es" },
      { id: "es_p142", emoji: "🩹", word: "curita", difficulty: 3, language: "es" },
      { id: "es_p143", emoji: "🩼", word: "muleta", difficulty: 3, language: "es" },
      { id: "es_p144", emoji: "🦴", word: "hueso", difficulty: 3, language: "es" },
      { id: "es_p145", emoji: "🧠", word: "cerebro", difficulty: 3, language: "es" },
      { id: "es_p146", emoji: "🫀", word: "corazón", difficulty: 3, language: "es" },
      { id: "es_p147", emoji: "🫁", word: "pulmones", difficulty: 3, language: "es" },
      { id: "es_p148", emoji: "🦷", word: "diente", difficulty: 3, language: "es" },
      { id: "es_p149", emoji: "👁️", word: "ojo", difficulty: 3, language: "es" },
      { id: "es_p150", emoji: "👂", word: "oreja", difficulty: 3, language: "es" }
    ];

    const englishPairs = [
      { id: "en_p001", emoji: "🐱", word: "cat", difficulty: 1, language: "en" },
      { id: "en_p002", emoji: "🐶", word: "dog", difficulty: 1, language: "en" },
      { id: "en_p003", emoji: "🏠", word: "house", difficulty: 1, language: "en" },
      { id: "en_p004", emoji: "☀️", word: "sun", difficulty: 1, language: "en" },
      { id: "en_p005", emoji: "🌙", word: "moon", difficulty: 1, language: "en" },
      { id: "en_p006", emoji: "⭐", word: "star", difficulty: 1, language: "en" },
      { id: "en_p007", emoji: "🌸", word: "flower", difficulty: 1, language: "en" },
      { id: "en_p008", emoji: "🌳", word: "tree", difficulty: 1, language: "en" },
      { id: "en_p009", emoji: "🍎", word: "apple", difficulty: 1, language: "en" },
      { id: "en_p010", emoji: "🍌", word: "banana", difficulty: 1, language: "en" },
      { id: "en_p011", emoji: "🍊", word: "orange", difficulty: 1, language: "en" },
      { id: "en_p012", emoji: "🍇", word: "grapes", difficulty: 1, language: "en" },
      { id: "en_p013", emoji: "🚗", word: "car", difficulty: 1, language: "en" },
      { id: "en_p014", emoji: "✈️", word: "plane", difficulty: 1, language: "en" },
      { id: "en_p015", emoji: "🚢", word: "ship", difficulty: 1, language: "en" },
      { id: "en_p016", emoji: "🚂", word: "train", difficulty: 1, language: "en" },
      { id: "en_p017", emoji: "🎈", word: "balloon", difficulty: 1, language: "en" },
      { id: "en_p018", emoji: "🎁", word: "gift", difficulty: 1, language: "en" },
      { id: "en_p019", emoji: "🎂", word: "cake", difficulty: 1, language: "en" },
      { id: "en_p020", emoji: "🍕", word: "pizza", difficulty: 1, language: "en" },
      { id: "en_p021", emoji: "🍔", word: "burger", difficulty: 1, language: "en" },
      { id: "en_p022", emoji: "🍦", word: "ice cream", difficulty: 1, language: "en" },
      { id: "en_p023", emoji: "🍪", word: "cookie", difficulty: 1, language: "en" },
      { id: "en_p024", emoji: "🍩", word: "donut", difficulty: 1, language: "en" },
      { id: "en_p025", emoji: "☕", word: "coffee", difficulty: 1, language: "en" },
      { id: "en_p026", emoji: "🥤", word: "drink", difficulty: 1, language: "en" },
      { id: "en_p027", emoji: "💧", word: "water", difficulty: 1, language: "en" },
      { id: "en_p028", emoji: "🔥", word: "fire", difficulty: 1, language: "en" },
      { id: "en_p029", emoji: "❄️", word: "ice", difficulty: 1, language: "en" },
      { id: "en_p030", emoji: "🌊", word: "wave", difficulty: 1, language: "en" },
      { id: "en_p031", emoji: "⛰️", word: "mountain", difficulty: 1, language: "en" },
      { id: "en_p032", emoji: "🏖️", word: "beach", difficulty: 1, language: "en" },
      { id: "en_p033", emoji: "🌈", word: "rainbow", difficulty: 1, language: "en" },
      { id: "en_p034", emoji: "☁️", word: "cloud", difficulty: 1, language: "en" },
      { id: "en_p035", emoji: "🌧️", word: "rain", difficulty: 1, language: "en" },
      { id: "en_p036", emoji: "⛈️", word: "storm", difficulty: 1, language: "en" },
      { id: "en_p037", emoji: "⚡", word: "lightning", difficulty: 1, language: "en" },
      { id: "en_p038", emoji: "🌪️", word: "tornado", difficulty: 1, language: "en" },
      { id: "en_p039", emoji: "🐝", word: "bee", difficulty: 1, language: "en" },
      { id: "en_p040", emoji: "🦋", word: "butterfly", difficulty: 1, language: "en" },
      { id: "en_p041", emoji: "🐞", word: "ladybug", difficulty: 1, language: "en" },
      { id: "en_p042", emoji: "🐜", word: "ant", difficulty: 1, language: "en" },
      { id: "en_p043", emoji: "🐛", word: "caterpillar", difficulty: 1, language: "en" },
      { id: "en_p044", emoji: "🕷️", word: "spider", difficulty: 1, language: "en" },
      { id: "en_p045", emoji: "🦗", word: "cricket", difficulty: 1, language: "en" },
      { id: "en_p046", emoji: "🐢", word: "turtle", difficulty: 1, language: "en" },
      { id: "en_p047", emoji: "🐸", word: "frog", difficulty: 1, language: "en" },
      { id: "en_p048", emoji: "🐍", word: "snake", difficulty: 1, language: "en" },
      { id: "en_p049", emoji: "🦎", word: "lizard", difficulty: 1, language: "en" },
      { id: "en_p050", emoji: "🐊", word: "crocodile", difficulty: 1, language: "en" },
      { id: "en_p051", emoji: "🦁", word: "lion", difficulty: 2, language: "en" },
      { id: "en_p052", emoji: "🐯", word: "tiger", difficulty: 2, language: "en" },
      { id: "en_p053", emoji: "🐻", word: "bear", difficulty: 2, language: "en" },
      { id: "en_p054", emoji: "🐼", word: "panda", difficulty: 2, language: "en" },
      { id: "en_p055", emoji: "🐨", word: "koala", difficulty: 2, language: "en" },
      { id: "en_p056", emoji: "🐵", word: "monkey", difficulty: 2, language: "en" },
      { id: "en_p057", emoji: "🦍", word: "gorilla", difficulty: 2, language: "en" },
      { id: "en_p058", emoji: "🐘", word: "elephant", difficulty: 2, language: "en" },
      { id: "en_p059", emoji: "🦏", word: "rhino", difficulty: 2, language: "en" },
      { id: "en_p060", emoji: "🦛", word: "hippo", difficulty: 2, language: "en" },
      { id: "en_p061", emoji: "🐪", word: "camel", difficulty: 2, language: "en" },
      { id: "en_p062", emoji: "🦒", word: "giraffe", difficulty: 2, language: "en" },
      { id: "en_p063", emoji: "🦓", word: "zebra", difficulty: 2, language: "en" },
      { id: "en_p064", emoji: "🐎", word: "horse", difficulty: 2, language: "en" },
      { id: "en_p065", emoji: "🦌", word: "deer", difficulty: 2, language: "en" },
      { id: "en_p066", emoji: "🐂", word: "bull", difficulty: 2, language: "en" },
      { id: "en_p067", emoji: "🐄", word: "cow", difficulty: 2, language: "en" },
      { id: "en_p068", emoji: "🐖", word: "pig", difficulty: 2, language: "en" },
      { id: "en_p069", emoji: "🐑", word: "sheep", difficulty: 2, language: "en" },
      { id: "en_p070", emoji: "🐐", word: "goat", difficulty: 2, language: "en" },
      { id: "en_p071", emoji: "🐓", word: "rooster", difficulty: 2, language: "en" },
      { id: "en_p072", emoji: "🐔", word: "chicken", difficulty: 2, language: "en" },
      { id: "en_p073", emoji: "🐣", word: "chick", difficulty: 2, language: "en" },
      { id: "en_p074", emoji: "🦆", word: "duck", difficulty: 2, language: "en" },
      { id: "en_p075", emoji: "🦢", word: "swan", difficulty: 2, language: "en" },
      { id: "en_p076", emoji: "🦉", word: "owl", difficulty: 2, language: "en" },
      { id: "en_p077", emoji: "🦅", word: "eagle", difficulty: 2, language: "en" },
      { id: "en_p078", emoji: "🐧", word: "penguin", difficulty: 2, language: "en" },
      { id: "en_p079", emoji: "🕊️", word: "dove", difficulty: 2, language: "en" },
      { id: "en_p080", emoji: "🦜", word: "parrot", difficulty: 2, language: "en" },
      { id: "en_p081", emoji: "🦩", word: "flamingo", difficulty: 2, language: "en" },
      { id: "en_p082", emoji: "🦚", word: "peacock", difficulty: 2, language: "en" },
      { id: "en_p083", emoji: "🐟", word: "fish", difficulty: 2, language: "en" },
      { id: "en_p084", emoji: "🐠", word: "tropical fish", difficulty: 2, language: "en" },
      { id: "en_p085", emoji: "🐡", word: "blowfish", difficulty: 2, language: "en" },
      { id: "en_p086", emoji: "🦈", word: "shark", difficulty: 2, language: "en" },
      { id: "en_p087", emoji: "🐙", word: "octopus", difficulty: 2, language: "en" },
      { id: "en_p088", emoji: "🦑", word: "squid", difficulty: 2, language: "en" },
      { id: "en_p089", emoji: "🦞", word: "lobster", difficulty: 2, language: "en" },
      { id: "en_p090", emoji: "🦀", word: "crab", difficulty: 2, language: "en" },
      { id: "en_p091", emoji: "🐚", word: "shell", difficulty: 2, language: "en" },
      { id: "en_p092", emoji: "🐬", word: "dolphin", difficulty: 2, language: "en" },
      { id: "en_p093", emoji: "🐋", word: "whale", difficulty: 2, language: "en" },
      { id: "en_p094", emoji: "🦭", word: "seal", difficulty: 2, language: "en" },
      { id: "en_p095", emoji: "🐺", word: "wolf", difficulty: 2, language: "en" },
      { id: "en_p096", emoji: "🦊", word: "fox", difficulty: 2, language: "en" },
      { id: "en_p097", emoji: "🦝", word: "raccoon", difficulty: 2, language: "en" },
      { id: "en_p098", emoji: "🐰", word: "rabbit", difficulty: 2, language: "en" },
      { id: "en_p099", emoji: "🐭", word: "mouse", difficulty: 2, language: "en" },
      { id: "en_p100", emoji: "🐹", word: "hamster", difficulty: 2, language: "en" },
      { id: "en_p101", emoji: "🏰", word: "castle", difficulty: 3, language: "en" },
      { id: "en_p102", emoji: "🏛️", word: "temple", difficulty: 3, language: "en" },
      { id: "en_p103", emoji: "🗼", word: "tower", difficulty: 3, language: "en" },
      { id: "en_p104", emoji: "🎪", word: "circus", difficulty: 3, language: "en" },
      { id: "en_p105", emoji: "🎭", word: "theater", difficulty: 3, language: "en" },
      { id: "en_p106", emoji: "🎨", word: "art", difficulty: 3, language: "en" },
      { id: "en_p107", emoji: "🎬", word: "movie", difficulty: 3, language: "en" },
      { id: "en_p108", emoji: "🎤", word: "microphone", difficulty: 3, language: "en" },
      { id: "en_p109", emoji: "🎧", word: "headphones", difficulty: 3, language: "en" },
      { id: "en_p110", emoji: "🎼", word: "music", difficulty: 3, language: "en" },
      { id: "en_p111", emoji: "🎹", word: "piano", difficulty: 3, language: "en" },
      { id: "en_p112", emoji: "🎸", word: "guitar", difficulty: 3, language: "en" },
      { id: "en_p113", emoji: "🎺", word: "trumpet", difficulty: 3, language: "en" },
      { id: "en_p114", emoji: "🎷", word: "saxophone", difficulty: 3, language: "en" },
      { id: "en_p115", emoji: "🥁", word: "drum", difficulty: 3, language: "en" },
      { id: "en_p116", emoji: "🎻", word: "violin", difficulty: 3, language: "en" },
      { id: "en_p117", emoji: "🪕", word: "banjo", difficulty: 3, language: "en" },
      { id: "en_p118", emoji: "🎲", word: "dice", difficulty: 3, language: "en" },
      { id: "en_p119", emoji: "🧩", word: "puzzle", difficulty: 3, language: "en" },
      { id: "en_p120", emoji: "🎯", word: "target", difficulty: 3, language: "en" },
      { id: "en_p121", emoji: "🎰", word: "slot machine", difficulty: 3, language: "en" },
      { id: "en_p122", emoji: "🧸", word: "teddy bear", difficulty: 3, language: "en" },
      { id: "en_p123", emoji: "🪆", word: "nesting doll", difficulty: 3, language: "en" },
      { id: "en_p124", emoji: "🎮", word: "video game", difficulty: 3, language: "en" },
      { id: "en_p125", emoji: "🕹️", word: "joystick", difficulty: 3, language: "en" },
      { id: "en_p126", emoji: "🧩", word: "jigsaw", difficulty: 3, language: "en" },
      { id: "en_p127", emoji: "🚀", word: "rocket", difficulty: 3, language: "en" },
      { id: "en_p128", emoji: "🛸", word: "UFO", difficulty: 3, language: "en" },
      { id: "en_p129", emoji: "🛰️", word: "satellite", difficulty: 3, language: "en" },
      { id: "en_p130", emoji: "🌌", word: "galaxy", difficulty: 3, language: "en" },
      { id: "en_p131", emoji: "🪐", word: "saturn", difficulty: 3, language: "en" },
      { id: "en_p132", emoji: "🌍", word: "earth", difficulty: 3, language: "en" },
      { id: "en_p133", emoji: "🌎", word: "americas", difficulty: 3, language: "en" },
      { id: "en_p134", emoji: "🌏", word: "asia", difficulty: 3, language: "en" },
      { id: "en_p135", emoji: "🔭", word: "telescope", difficulty: 3, language: "en" },
      { id: "en_p136", emoji: "🔬", word: "microscope", difficulty: 3, language: "en" },
      { id: "en_p137", emoji: "🧪", word: "test tube", difficulty: 3, language: "en" },
      { id: "en_p138", emoji: "🧬", word: "DNA", difficulty: 3, language: "en" },
      { id: "en_p139", emoji: "🩺", word: "stethoscope", difficulty: 3, language: "en" },
      { id: "en_p140", emoji: "💉", word: "syringe", difficulty: 3, language: "en" },
      { id: "en_p141", emoji: "💊", word: "pill", difficulty: 3, language: "en" },
      { id: "en_p142", emoji: "🩹", word: "bandage", difficulty: 3, language: "en" },
      { id: "en_p143", emoji: "🩼", word: "crutch", difficulty: 3, language: "en" },
      { id: "en_p144", emoji: "🦴", word: "bone", difficulty: 3, language: "en" },
      { id: "en_p145", emoji: "🧠", word: "brain", difficulty: 3, language: "en" },
      { id: "en_p146", emoji: "🫀", word: "heart", difficulty: 3, language: "en" },
      { id: "en_p147", emoji: "🫁", word: "lungs", difficulty: 3, language: "en" },
      { id: "en_p148", emoji: "🦷", word: "tooth", difficulty: 3, language: "en" },
      { id: "en_p149", emoji: "👁️", word: "eye", difficulty: 3, language: "en" },
      { id: "en_p150", emoji: "👂", word: "ear", difficulty: 3, language: "en" }
    ];

    this.allPairs = this.currentLanguage === 'es' ? spanishPairs : englishPairs;
    Logger.log(`✅ ${this.allPairs.length} pares cargados para ${this.currentLanguage}`);
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
    
    this.loadPairsData();
    Logger.log(`✅ Idioma cambiado a: ${language}`);
  }

  async startGame() {
    try {
      const difficulty = parseInt(this.elements.difficultySelect.value);
      this.currentDifficulty = difficulty;
      
      let numPairs;
      switch(difficulty) {
        case 1: numPairs = 3; break;
        case 2: numPairs = 6; break;
        case 3: numPairs = 8; break;
        default: numPairs = 6;
      }
      
      this.totalPairs = numPairs;
      this.pairsFound = 0;
      this.attempts = 0;
      this.totalScore = 0;
      this.matchedPairs = [];
      this.flippedCards = [];
      
      this.elements.pairsFound.textContent = '0';
      this.elements.totalPairs.textContent = numPairs;
      this.elements.attempts.textContent = '0';
      this.elements.scoreValue.textContent = '0';
      
      await this.createSession();
      this.selectRandomPairs(numPairs);
      this.createBoard();
      
      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);
      
      this.gameStartTime = Date.now();
      this.startGameTimer();
      
      Logger.log(`✅ Juego iniciado: ${numPairs} pares, dificultad ${difficulty}`);
      
    } catch (error) {
      Logger.error('Error iniciando juego', error);
      alert('Error iniciando el juego');
    }
  }

  selectRandomPairs(numPairs) {
    const filtered = this.allPairs.filter(p => p.difficulty === this.currentDifficulty);
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    this.currentPairs = shuffled.slice(0, numPairs);
    Logger.log(`✅ ${numPairs} pares seleccionados`);
  }

  createBoard() {
    this.cards = [];
    this.currentPairs.forEach((pair, index) => {
      this.cards.push({ ...pair, cardId: `card-${index}-a`, pairId: pair.id });
      this.cards.push({ ...pair, cardId: `card-${index}-b`, pairId: pair.id });
    });
    
    this.cards = this.cards.sort(() => Math.random() - 0.5);
    
    const boardElement = this.elements.cardBoard;
    DOMUtils.clearContent(boardElement);
    
    boardElement.className = `card-board card-board--${this.currentDifficulty === 1 ? 'easy' : this.currentDifficulty === 2 ? 'normal' : 'hard'}`;
    
    this.cards.forEach(card => {
      const cardElement = this.createCardElement(card);
      boardElement.appendChild(cardElement);
    });
    
    Logger.log(`✅ Tablero creado con ${this.cards.length} cartas`);
  }

  createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'memory-card';
    cardDiv.dataset.cardId = card.cardId;
    cardDiv.dataset.pairId = card.pairId;
    
    cardDiv.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">
          <div class="card-front-icon">❓</div>
          <div class="card-front-text">Toca aquí</div>
        </div>
        <div class="card-face card-back">
          <div class="card-back-emoji">${card.emoji}</div>
          <div class="card-back-text">${card.word}</div>
        </div>
      </div>
    `;
    
    cardDiv.addEventListener('click', () => this.handleCardClick(cardDiv, card));
    return cardDiv;
  }

  handleCardClick(cardElement, card) {
    if (this.isChecking) return;
    if (cardElement.classList.contains('flipped')) return;
    if (cardElement.classList.contains('matched')) return;
    if (this.flippedCards.length >= 2) return;
    
    cardElement.classList.add('flipped');
    this.flippedCards.push({ element: cardElement, card: card });
    this.playFlipSound();
    
    if (this.flippedCards.length === 2) {
      this.isChecking = true;
      this.attempts++;
      this.elements.attempts.textContent = this.attempts;
      setTimeout(() => this.checkMatch(), 800);
    }
  }

  checkMatch() {
    const [first, second] = this.flippedCards;
    
    if (first.card.pairId === second.card.pairId) {
      first.element.classList.add('matched');
      second.element.classList.add('matched');
      this.matchedPairs.push(first.card.pairId);
      this.pairsFound++;
      
      const points = this.calculatePoints();
      this.totalScore += points;
      
      this.elements.pairsFound.textContent = this.pairsFound;
      this.elements.scoreValue.textContent = this.totalScore;
      
      this.playMatchSound();
      this.createConfetti();
      this.saveMatch(first.card, true, points);
      
      if (this.pairsFound === this.totalPairs) {
        setTimeout(() => this.endGame(), 1500);
      }
    } else {
      first.element.classList.add('wrong');
      second.element.classList.add('wrong');
      this.playWrongSound();
      this.saveMatch(first.card, false, 0);
      
      setTimeout(() => {
        first.element.classList.remove('flipped', 'wrong');
        second.element.classList.remove('flipped', 'wrong');
      }, 1000);
    }
    
    this.flippedCards = [];
    this.isChecking = false;
  }

  calculatePoints() {
    const basePoints = this.currentDifficulty * 100;
    const timeBonus = Math.max(0, 50 - Math.floor((Date.now() - this.gameStartTime) / 1000));
    const accuracyBonus = this.attempts <= this.pairsFound ? 50 : 0;
    return basePoints + timeBonus + accuracyBonus;
  }

  async saveMatch(card, isCorrect, points) {
    try {
      await db.collection('sessions').doc(this.currentSessionId).collection('matches').add({
        pairId: card.pairId,
        emoji: card.emoji,
        word: card.word,
        correct: isCorrect,
        points: points,
        attemptNumber: this.attempts,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      Logger.log(`✅ Match guardado`);
    } catch (error) {
      Logger.error('Error guardando match', error);
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
      this.currentSessionId = `session_g2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentCode: this.studentCode || 'ANONIMO',
        studentName: this.studentName || 'Jugador',
        gameNumber: 2,
        gameName: 'Memoria Mágica',
        language: this.currentLanguage,
        difficulty: this.currentDifficulty,
        totalPairs: this.totalPairs,
        gameVersion: '1.0',
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'in_progress'
      });
      
      Logger.log(`✅ Sesión creada: ${this.currentSessionId}`);
    } catch (error) {
      Logger.error('Error creando sesión', error);
      this.currentSessionId = `session_g2_${Date.now()}`;
    }
  }

  async endGame() {
    try {
      this.stopGameTimer();
      const accuracy = Math.round((this.pairsFound / this.attempts) * 100);
      
      await db.collection('sessions').doc(this.currentSessionId).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalScore: this.totalScore,
        pairsFound: this.pairsFound,
        totalAttempts: this.attempts,
        accuracy: accuracy,
        totalGameTime: this.gameTotalTime
      });
      
      if (this.studentCode) {
        try {
          await db.collection('students').doc(this.studentCode).update({
            gamesCompleted: firebase.firestore.FieldValue.arrayUnion('game2'),
            game2LastScore: this.totalScore,
            game2LastAccuracy: accuracy,
            game2LastTime: this.gameTotalTime,
            game2CompletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          Logger.log('✅ Datos del estudiante actualizados');
        } catch (error) {
          Logger.error('Error actualizando estudiante', error);
        }
      }
      
      this.showEndScreen(accuracy);
      
    } catch (error) {
      Logger.error('Error finalizando juego', error);
      const accuracy = Math.round((this.pairsFound / this.attempts) * 100);
      this.showEndScreen(accuracy);
    }
  }

  showEndScreen(accuracy) {
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);
    
    const minutes = Math.floor(this.gameTotalTime / 60);
    const seconds = this.gameTotalTime % 60;
    
    this.elements.finalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.elements.finalAttempts.textContent = this.attempts;
    this.elements.finalAccuracy.textContent = `${accuracy}%`;
    this.elements.finalScore.textContent = this.totalScore;
    
    const message = this.generateMotivationalMessage(accuracy);
    this.elements.endMessage.textContent = message;
    
    Logger.log(`📊 Juego completado: ${this.totalScore} pts, ${accuracy}%, ${this.gameTotalTime}s`);
  }

  generateMotivationalMessage(accuracy) {
    if (accuracy === 100) return '🌟 ¡Perfecto! ¡Tienes una memoria increíble!';
    else if (accuracy >= 90) return '⭐ ¡Excelente! ¡Casi perfecto!';
    else if (accuracy >= 80) return '👏 ¡Muy bien! ¡Gran trabajo!';
    else if (accuracy >= 70) return '💪 ¡Buen esfuerzo! ¡Sigue practicando!';
    else return '🎯 ¡Sigue intentando! ¡Cada vez lo harás mejor!';
  }

  createConfetti() {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = ['#FF6B9D', '#C06C84', '#6C5B7B', '#355C7D'][Math.floor(Math.random() * 4)];
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
      }, i * 50);
    }
  }

  playFlipSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {}
  }

  playMatchSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {}
  }

  playWrongSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {}
  }

goToNextGame() {
  window.location.href = `game3.html?code=${this.studentCode}&lang=${this.currentLanguage}&diff=${this.currentDifficulty}`;
}

  async resetGame() {
    this.stopGameTimer();
    this.pairsFound = 0;
    this.attempts = 0;
    this.totalScore = 0;
    this.matchedPairs = [];
    this.flippedCards = [];
    this.gameStartTime = null;
    this.gameTotalTime = 0;
    
    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.show(this.elements.startScreen);
    
    Logger.log('🔄 Juego reiniciado');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoriaMagicaGame;
}