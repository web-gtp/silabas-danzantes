// frontend/js/game4.js
// Lógica del Juego 4: Rimas Divertidas - VERSIÓN COMPLETA CON 300 RIMAS

class RimasDivertidasGame {
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
    this.allRhymes = [];
    this.currentRhyme = null;
    this.currentOptions = [];
    this.allResponses = [];
    this.timeTracker = new TimeTracker();
    this.elements = {};
  }

  async init() {
    Logger.log('🎵 Inicializando Rimas Divertidas...');
    try {
      this.cacheElements();
      this.loadRhymesData();
      this.setupEventListeners();
      this.checkStudentCode();
      Logger.log('✅ Juego 4 inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando juego 4', error);
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
      targetWord: document.getElementById('targetWord'),
      playTargetBtn: document.getElementById('playTargetBtn'),
      optionsContainer: document.getElementById('optionsContainer'),
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
    this.elements.playTargetBtn.addEventListener('click', () => this.playTargetWord());
    this.elements.nextBtn.addEventListener('click', () => this.handleNextQuestion());
    this.elements.restartBtn.addEventListener('click', () => this.resetGame());

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

  loadRhymesData() {
    const spanishRhymes = [
      // NIVEL 1 (FÁCIL): 50 RIMAS OBVIAS
      { id: "es_r001", word: "GATO", rhyme: "PATO", difficulty: 1, language: "es" },
      { id: "es_r002", word: "CASA", rhyme: "MASA", difficulty: 1, language: "es" },
      { id: "es_r003", word: "SOL", rhyme: "GOL", difficulty: 1, language: "es" },
      { id: "es_r004", word: "FLOR", rhyme: "COLOR", difficulty: 1, language: "es" },
      { id: "es_r005", word: "MAR", rhyme: "COLLAR", difficulty: 1, language: "es" },
      { id: "es_r006", word: "PAN", rhyme: "PLAN", difficulty: 1, language: "es" },
      { id: "es_r007", word: "LUZ", rhyme: "CRUZ", difficulty: 1, language: "es" },
      { id: "es_r008", word: "REY", rhyme: "LEY", difficulty: 1, language: "es" },
      { id: "es_r009", word: "MIEL", rhyme: "PIEL", difficulty: 1, language: "es" },
      { id: "es_r010", word: "SAL", rhyme: "MAL", difficulty: 1, language: "es" },
      { id: "es_r011", word: "TREN", rhyme: "BIEN", difficulty: 1, language: "es" },
      { id: "es_r012", word: "DIA", rhyme: "ALEGRIA", difficulty: 1, language: "es" },
      { id: "es_r013", word: "MES", rhyme: "PEZ", difficulty: 1, language: "es" },
      { id: "es_r014", word: "VEZ", rhyme: "NUEZ", difficulty: 1, language: "es" },
      { id: "es_r015", word: "VOZ", rhyme: "VELOZ", difficulty: 1, language: "es" },
      { id: "es_r016", word: "FIN", rhyme: "JARDIN", difficulty: 1, language: "es" },
      { id: "es_r017", word: "AMOR", rhyme: "DOLOR", difficulty: 1, language: "es" },
      { id: "es_r018", word: "CIELO", rhyme: "VUELO", difficulty: 1, language: "es" },
      { id: "es_r019", word: "LUNA", rhyme: "CUNA", difficulty: 1, language: "es" },
      { id: "es_r020", word: "NOCHE", rhyme: "COCHE", difficulty: 1, language: "es" },
      { id: "es_r021", word: "RATON", rhyme: "MELON", difficulty: 1, language: "es" },
      { id: "es_r023", word: "MESA", rhyme: "FRESA", difficulty: 1, language: "es" },
      { id: "es_r024", word: "PERA", rhyme: "ESPERA", difficulty: 1, language: "es" },
      { id: "es_r025", word: "BOCA", rhyme: "LOCA", difficulty: 1, language: "es" },
      { id: "es_r026", word: "PELO", rhyme: "CARAMELO", difficulty: 1, language: "es" },
      { id: "es_r027", word: "MANO", rhyme: "HERMANO", difficulty: 1, language: "es" },
      { id: "es_r028", word: "DEDO", rhyme: "MIEDO", difficulty: 1, language: "es" },
      { id: "es_r029", word: "CARA", rhyme: "CLARA", difficulty: 1, language: "es" },
      { id: "es_r030", word: "OJO", rhyme: "ROJO", difficulty: 1, language: "es" },
      { id: "es_r031", word: "PIE", rhyme: "CAFE", difficulty: 1, language: "es" },
      { id: "es_r032", word: "CUELLO", rhyme: "BELLO", difficulty: 1, language: "es" },
      { id: "es_r033", word: "NARIZ", rhyme: "FELIZ", difficulty: 1, language: "es" },
      { id: "es_r034", word: "DIENTE", rhyme: "CALIENTE", difficulty: 1, language: "es" },
      { id: "es_r035", word: "PELO", rhyme: "MODELO", difficulty: 1, language: "es" },
      { id: "es_r036", word: "BRAZO", rhyme: "LAZO", difficulty: 1, language: "es" },
      { id: "es_r037", word: "PIERNA", rhyme: "MODERNA", difficulty: 1, language: "es" },
      { id: "es_r038", word: "RODILLA", rhyme: "SILLA", difficulty: 1, language: "es" },
      { id: "es_r039", word: "TOBILLO", rhyme: "BRILLO", difficulty: 1, language: "es" },
      { id: "es_r040", word: "CODO", rhyme: "TODO", difficulty: 1, language: "es" },
      { id: "es_r041", word: "MURO", rhyme: "DURO", difficulty: 1, language: "es" },
      { id: "es_r042", word: "TECHO", rhyme: "PECHO", difficulty: 1, language: "es" },
      { id: "es_r043", word: "PUERTA", rhyme: "ABIERTA", difficulty: 1, language: "es" },
      { id: "es_r044", word: "VENTANA", rhyme: "MAÑANA", difficulty: 1, language: "es" },
      { id: "es_r045", word: "PISO", rhyme: "AVISO", difficulty: 1, language: "es" },
      { id: "es_r046", word: "ESCALERA", rhyme: "PRIMAVERA", difficulty: 1, language: "es" },
      { id: "es_r047", word: "JARDIN", rhyme: "VIOLIN", difficulty: 1, language: "es" },
      { id: "es_r048", word: "BALCON", rhyme: "CANCION", difficulty: 1, language: "es" },
      { id: "es_r049", word: "COCINA", rhyme: "CORTINA", difficulty: 1, language: "es" },
      { id: "es_r050", word: "BAÑO", rhyme: "AÑO", difficulty: 1, language: "es" },

      // NIVEL 2 (NORMAL): 50 RIMAS COMUNES
      { id: "es_r052", word: "ESTRELLA", rhyme: "BELLA", difficulty: 2, language: "es" },
      { id: "es_r053", word: "PASION", rhyme: "EMOCION", difficulty: 2, language: "es" },
      { id: "es_r054", word: "CAMINO", rhyme: "DESTINO", difficulty: 2, language: "es" },
      { id: "es_r055", word: "SUEÑO", rhyme: "DUEÑO", difficulty: 2, language: "es" },
      { id: "es_r056", word: "BATALLA", rhyme: "MEDALLA", difficulty: 2, language: "es" },
      { id: "es_r057", word: "ALEGRIA", rhyme: "MELODIA", difficulty: 2, language: "es" },
      { id: "es_r058", word: "TRISTEZA", rhyme: "BELLEZA", difficulty: 2, language: "es" },
      { id: "es_r059", word: "FORTUNA", rhyme: "LAGUNA", difficulty: 2, language: "es" },
      { id: "es_r060", word: "MONTAÑA", rhyme: "HAZAÑA", difficulty: 2, language: "es" },
      { id: "es_r061", word: "VIAJE", rhyme: "PAISAJE", difficulty: 2, language: "es" },
      { id: "es_r062", word: "CARRERA", rhyme: "BARRERA", difficulty: 2, language: "es" },
      { id: "es_r063", word: "VICTORIA", rhyme: "HISTORIA", difficulty: 2, language: "es" },
      { id: "es_r064", word: "ESPADA", rhyme: "NADA", difficulty: 2, language: "es" },
      { id: "es_r065", word: "CASTILLO", rhyme: "MARTILLO", difficulty: 2, language: "es" },
      { id: "es_r066", word: "CORONA", rhyme: "PERSONA", difficulty: 2, language: "es" },
      { id: "es_r067", word: "TESORO", rhyme: "ORO", difficulty: 2, language: "es" },
      { id: "es_r068", word: "DRAGON", rhyme: "AVION", difficulty: 2, language: "es" },
      { id: "es_r069", word: "MAGO", rhyme: "LAGO", difficulty: 2, language: "es" },
      { id: "es_r070", word: "PRINCESA", rhyme: "SORPRESA", difficulty: 2, language: "es" },
      { id: "es_r071", word: "CABALLERO", rhyme: "VERDADERO", difficulty: 2, language: "es" },
      { id: "es_r072", word: "REINO", rhyme: "PEQUEÑO", difficulty: 2, language: "es" },
      { id: "es_r073", word: "BOSQUE", rhyme: "ROQUE", difficulty: 2, language: "es" },
      { id: "es_r074", word: "CABALLO", rhyme: "GALLO", difficulty: 2, language: "es" },
      { id: "es_r075", word: "ESPEJO", rhyme: "VIEJO", difficulty: 2, language: "es" },
      { id: "es_r076", word: "FUENTE", rhyme: "FRENTE", difficulty: 2, language: "es" },
      { id: "es_r077", word: "PALACIO", rhyme: "ESPACIO", difficulty: 2, language: "es" },
      { id: "es_r078", word: "GUERRERO", rhyme: "ACERO", difficulty: 2, language: "es" },
      { id: "es_r079", word: "ESCUDO", rhyme: "AGUDO", difficulty: 2, language: "es" },
      { id: "es_r080", word: "FLECHA", rhyme: "ECHA", difficulty: 2, language: "es" },
      { id: "es_r081", word: "ESPINA", rhyme: "MARINA", difficulty: 2, language: "es" },
      { id: "es_r082", word: "TORMENTA", rhyme: "CUARENTA", difficulty: 2, language: "es" },
      { id: "es_r083", word: "RAYO", rhyme: "MAYO", difficulty: 2, language: "es" },
      { id: "es_r084", word: "TRUENO", rhyme: "SERENO", difficulty: 2, language: "es" },
      { id: "es_r085", word: "NUBE", rhyme: "SUBE", difficulty: 2, language: "es" },
      { id: "es_r086", word: "VIENTO", rhyme: "CIENTO", difficulty: 2, language: "es" },
      { id: "es_r087", word: "CASCADA", rhyme: "NADA", difficulty: 2, language: "es" },
      { id: "es_r088", word: "OCEANO", rhyme: "VERANO", difficulty: 2, language: "es" },
      { id: "es_r089", word: "VALLE", rhyme: "CALLE", difficulty: 2, language: "es" },
      { id: "es_r090", word: "COLINA", rhyme: "ESQUINA", difficulty: 2, language: "es" },
      { id: "es_r091", word: "PRADERA", rhyme: "BANDERA", difficulty: 2, language: "es" },
      { id: "es_r092", word: "DESIERTO", rhyme: "PUERTO", difficulty: 2, language: "es" },
      { id: "es_r093", word: "SELVA", rhyme: "VUELTA", difficulty: 2, language: "es" },
      { id: "es_r094", word: "JUNGLA", rhyme: "PREGUNTA", difficulty: 2, language: "es" },
      { id: "es_r095", word: "PLANETA", rhyme: "COMETA", difficulty: 2, language: "es" },
      { id: "es_r096", word: "GALAXIA", rhyme: "FANTASIA", difficulty: 2, language: "es" },
      { id: "es_r097", word: "COHETE", rhyme: "JUGUETE", difficulty: 2, language: "es" },
      { id: "es_r098", word: "ASTRONAUTA", rhyme: "FLAUTA", difficulty: 2, language: "es" },
      { id: "es_r099", word: "SATELITE", rhyme: "LIMITE", difficulty: 2, language: "es" },
      { id: "es_r100", word: "UNIVERSO", rhyme: "VERSO", difficulty: 2, language: "es" },

      // NIVEL 3 (DIFÍCIL): 50 RIMAS COMPLEJAS
      { id: "es_r101", word: "AVENTURA", rhyme: "CRIATURA", difficulty: 3, language: "es" },
      { id: "es_r102", word: "MISTERIO", rhyme: "IMPERIO", difficulty: 3, language: "es" },
      { id: "es_r103", word: "LEYENDA", rhyme: "TIENDA", difficulty: 3, language: "es" },
      { id: "es_r104", word: "FANTASIA", rhyme: "POESIA", difficulty: 3, language: "es" },
      { id: "es_r105", word: "IMAGINACION", rhyme: "CREACION", difficulty: 3, language: "es" },
      { id: "es_r106", word: "VALENTIA", rhyme: "COMPAÑIA", difficulty: 3, language: "es" },
      { id: "es_r107", word: "SABIDURIA", rhyme: "ALEGRIA", difficulty: 3, language: "es" },
      { id: "es_r108", word: "LIBERTAD", rhyme: "AMISTAD", difficulty: 3, language: "es" },
      { id: "es_r109", word: "ESPERANZA", rhyme: "BONANZA", difficulty: 3, language: "es" },
      { id: "es_r110", word: "PACIENCIA", rhyme: "CIENCIA", difficulty: 3, language: "es" },
      { id: "es_r111", word: "CORDURA", rhyme: "LOCURA", difficulty: 3, language: "es" },
      { id: "es_r112", word: "CONFIANZA", rhyme: "VENGANZA", difficulty: 3, language: "es" },
      { id: "es_r113", word: "ARMONIA", rhyme: "BAHIA", difficulty: 3, language: "es" },
      { id: "es_r114", word: "TRANSPARENCIA", rhyme: "PACIENCIA", difficulty: 3, language: "es" },
      { id: "es_r115", word: "TOLERANCIA", rhyme: "GANANCIA", difficulty: 3, language: "es" },
      { id: "es_r116", word: "GENEROSIDAD", rhyme: "FELICIDAD", difficulty: 3, language: "es" },
      { id: "es_r117", word: "HONESTIDAD", rhyme: "CLARIDAD", difficulty: 3, language: "es" },
      { id: "es_r118", word: "SINCERIDAD", rhyme: "SOLEDAD", difficulty: 3, language: "es" },
      { id: "es_r119", word: "HUMILDAD", rhyme: "REALIDAD", difficulty: 3, language: "es" },
      { id: "es_r120", word: "BONDAD", rhyme: "VERDAD", difficulty: 3, language: "es" },
      { id: "es_r121", word: "TEMPESTAD", rhyme: "CIUDAD", difficulty: 3, language: "es" },
      { id: "es_r122", word: "OSCURIDAD", rhyme: "CAPACIDAD", difficulty: 3, language: "es" },
      { id: "es_r123", word: "ETERNIDAD", rhyme: "VARIEDAD", difficulty: 3, language: "es" },
      { id: "es_r124", word: "OPORTUNIDAD", rhyme: "COMUNIDAD", difficulty: 3, language: "es" },
      { id: "es_r125", word: "CURIOSIDAD", rhyme: "DIGNIDAD", difficulty: 3, language: "es" },
      { id: "es_r126", word: "TRANQUILIDAD", rhyme: "SEGURIDAD", difficulty: 3, language: "es" },
      { id: "es_r127", word: "RESPONSABILIDAD", rhyme: "VELOCIDAD", difficulty: 3, language: "es" },
      { id: "es_r128", word: "PERSONALIDAD", rhyme: "CALIDAD", difficulty: 3, language: "es" },
      { id: "es_r129", word: "DIFICULTAD", rhyme: "FACULTAD", difficulty: 3, language: "es" },
      { id: "es_r130", word: "POSIBILIDAD", rhyme: "UTILIDAD", difficulty: 3, language: "es" },
      { id: "es_r131", word: "MARIPOSA", rhyme: "HERMOSA", difficulty: 3, language: "es" },
      { id: "es_r132", word: "CARACOL", rhyme: "ESPAÑOL", difficulty: 3, language: "es" },
      { id: "es_r133", word: "LIBELULA", rhyme: "PELICULA", difficulty: 3, language: "es" },
      { id: "es_r134", word: "CIGARRA", rhyme: "GUITARRA", difficulty: 3, language: "es" },
      { id: "es_r135", word: "SALTAMONTES", rhyme: "MONTES", difficulty: 3, language: "es" },
      { id: "es_r136", word: "LUCIERNAGA", rhyme: "LLAGA", difficulty: 3, language: "es" },
      { id: "es_r137", word: "HORMIGA", rhyme: "BARRIGA", difficulty: 3, language: "es" },
      { id: "es_r138", word: "MARIQUITA", rhyme: "CHIQUITA", difficulty: 3, language: "es" },
      { id: "es_r139", word: "ABEJORRO", rhyme: "ZORRO", difficulty: 3, language: "es" },
      { id: "es_r140", word: "GUSANO", rhyme: "TEMPRANO", difficulty: 3, language: "es" },
      { id: "es_r141", word: "CATARINA", rhyme: "MEDICINA", difficulty: 3, language: "es" },
      { id: "es_r142", word: "ESCARABAJO", rhyme: "TRABAJO", difficulty: 3, language: "es" },
      { id: "es_r143", word: "MOSQUITO", rhyme: "BONITO", difficulty: 3, language: "es" },
      { id: "es_r144", word: "AVISPA", rhyme: "CHISPA", difficulty: 3, language: "es" },
      { id: "es_r145", word: "POLILLA", rhyme: "SEMILLA", difficulty: 3, language: "es" },
      { id: "es_r146", word: "ORUGA", rhyme: "TORTUGA", difficulty: 3, language: "es" },
      { id: "es_r147", word: "CRISALIDA", rhyme: "VIDA", difficulty: 3, language: "es" },
      { id: "es_r148", word: "LIBRETA", rhyme: "ETAS", difficulty: 3, language: "es" },
      { id: "es_r149", word: "CARPETA", rhyme: "PLANETA", difficulty: 3, language: "es" },
      { id: "es_r150", word: "LAPICERO", rhyme: "LUCERO", difficulty: 3, language: "es" }
    ];

    const englishRhymes = [
      // NIVEL 1 (FÁCIL): 50 RIMAS OBVIAS
      { id: "en_r001", word: "CAT", rhyme: "HAT", difficulty: 1, language: "en" },
      { id: "en_r002", word: "DOG", rhyme: "LOG", difficulty: 1, language: "en" },
      { id: "en_r003", word: "SUN", rhyme: "FUN", difficulty: 1, language: "en" },
      { id: "en_r004", word: "MOON", rhyme: "SPOON", difficulty: 1, language: "en" },
      { id: "en_r005", word: "STAR", rhyme: "CAR", difficulty: 1, language: "en" },
      { id: "en_r006", word: "TREE", rhyme: "BEE", difficulty: 1, language: "en" },
      { id: "en_r007", word: "HOUSE", rhyme: "MOUSE", difficulty: 1, language: "en" },
      { id: "en_r008", word: "RAIN", rhyme: "TRAIN", difficulty: 1, language: "en" },
      { id: "en_r009", word: "SNOW", rhyme: "GLOW", difficulty: 1, language: "en" },
      { id: "en_r010", word: "FLOWER", rhyme: "POWER", difficulty: 1, language: "en" },
      { id: "en_r011", word: "BOOK", rhyme: "COOK", difficulty: 1, language: "en" },
      { id: "en_r012", word: "CAKE", rhyme: "LAKE", difficulty: 1, language: "en" },
      { id: "en_r013", word: "FISH", rhyme: "WISH", difficulty: 1, language: "en" },
      { id: "en_r014", word: "BALL", rhyme: "WALL", difficulty: 1, language: "en" },
      { id: "en_r015", word: "TOY", rhyme: "JOY", difficulty: 1, language: "en" },
      { id: "en_r016", word: "KING", rhyme: "RING", difficulty: 1, language: "en" },
      { id: "en_r017", word: "QUEEN", rhyme: "GREEN", difficulty: 1, language: "en" },
      { id: "en_r018", word: "LIGHT", rhyme: "BRIGHT", difficulty: 1, language: "en" },
      { id: "en_r019", word: "NIGHT", rhyme: "KITE", difficulty: 1, language: "en" },
      { id: "en_r020", word: "DAY", rhyme: "PLAY", difficulty: 1, language: "en" },
      { id: "en_r021", word: "FROG", rhyme: "FOG", difficulty: 1, language: "en" },
      { id: "en_r022", word: "BUG", rhyme: "HUG", difficulty: 1, language: "en" },
      { id: "en_r023", word: "WING", rhyme: "SING", difficulty: 1, language: "en" },
      { id: "en_r024", word: "NEST", rhyme: "BEST", difficulty: 1, language: "en" },
      { id: "en_r025", word: "BOAT", rhyme: "COAT", difficulty: 1, language: "en" },
      { id: "en_r026", word: "ROAD", rhyme: "TOAD", difficulty: 1, language: "en" },
      { id: "en_r027", word: "GAME", rhyme: "SAME", difficulty: 1, language: "en" },
      { id: "en_r028", word: "NAME", rhyme: "FAME", difficulty: 1, language: "en" },
      { id: "en_r029", word: "SMILE", rhyme: "MILE", difficulty: 1, language: "en" },
      { id: "en_r030", word: "DOOR", rhyme: "FLOOR", difficulty: 1, language: "en" },
      { id: "en_r031", word: "CHAIR", rhyme: "HAIR", difficulty: 1, language: "en" },
      { id: "en_r032", word: "BED", rhyme: "RED", difficulty: 1, language: "en" },
      { id: "en_r033", word: "BLUE", rhyme: "TRUE", difficulty: 1, language: "en" },
      { id: "en_r034", word: "PINK", rhyme: "WINK", difficulty: 1, language: "en" },
      { id: "en_r035", word: "BROWN", rhyme: "TOWN", difficulty: 1, language: "en" },
      { id: "en_r036", word: "BLACK", rhyme: "BACK", difficulty: 1, language: "en" },
      { id: "en_r037", word: "WHITE", rhyme: "BITE", difficulty: 1, language: "en" },
      { id: "en_r038", word: "COLD", rhyme: "GOLD", difficulty: 1, language: "en" },
      { id: "en_r039", word: "HOT", rhyme: "POT", difficulty: 1, language: "en" },
      { id: "en_r040", word: "WET", rhyme: "PET", difficulty: 1, language: "en" },
      { id: "en_r041", word: "DRY", rhyme: "SKY", difficulty: 1, language: "en" },
      { id: "en_r042", word: "TALL", rhyme: "HALL", difficulty: 1, language: "en" },
      { id: "en_r043", word: "SMALL", rhyme: "MALL", difficulty: 1, language: "en" },
      { id: "en_r044", word: "BIG", rhyme: "PIG", difficulty: 1, language: "en" },
      { id: "en_r045", word: "FAST", rhyme: "LAST", difficulty: 1, language: "en" },
      { id: "en_r046", word: "SLOW", rhyme: "GROW", difficulty: 1, language: "en" },
      { id: "en_r047", word: "STOP", rhyme: "HOP", difficulty: 1, language: "en" },
      { id: "en_r048", word: "JUMP", rhyme: "BUMP", difficulty: 1, language: "en" },
      { id: "en_r049", word: "RUN", rhyme: "SUN", difficulty: 1, language: "en" },
      { id: "en_r050", word: "WALK", rhyme: "TALK", difficulty: 1, language: "en" },

      // NIVEL 2 (NORMAL): 50 RIMAS COMUNES
      { id: "en_r051", word: "HAPPY", rhyme: "SNAPPY", difficulty: 2, language: "en" },
      { id: "en_r052", word: "PRETTY", rhyme: "CITY", difficulty: 2, language: "en" },
      { id: "en_r053", word: "FUNNY", rhyme: "SUNNY", difficulty: 2, language: "en" },
      { id: "en_r054", word: "CLEVER", rhyme: "NEVER", difficulty: 2, language: "en" },
      { id: "en_r055", word: "BETTER", rhyme: "LETTER", difficulty: 2, language: "en" },
      { id: "en_r056", word: "DRAGON", rhyme: "WAGON", difficulty: 2, language: "en" },
      { id: "en_r057", word: "CASTLE", rhyme: "TASSEL", difficulty: 2, language: "en" },
      { id: "en_r058", word: "PRINCESS", rhyme: "STRESS", difficulty: 2, language: "en" },
      { id: "en_r059", word: "TREASURE", rhyme: "PLEASURE", difficulty: 2, language: "en" },
      { id: "en_r060", word: "JOURNEY", rhyme: "ATTORNEY", difficulty: 2, language: "en" },
      { id: "en_r061", word: "MOUNTAIN", rhyme: "FOUNTAIN", difficulty: 2, language: "en" },
      { id: "en_r062", word: "OCEAN", rhyme: "MOTION", difficulty: 2, language: "en" },
      { id: "en_r063", word: "RIVER", rhyme: "DELIVER", difficulty: 2, language: "en" },
      { id: "en_r064", word: "FOREST", rhyme: "FLORIST", difficulty: 2, language: "en" },
      { id: "en_r065", word: "DESERT", rhyme: "DESSERT", difficulty: 2, language: "en" },
      { id: "en_r066", word: "ISLAND", rhyme: "HIGHLAND", difficulty: 2, language: "en" },
      { id: "en_r067", word: "VALLEY", rhyme: "RALLY", difficulty: 2, language: "en" },
      { id: "en_r068", word: "JUNGLE", rhyme: "BUNGLE", difficulty: 2, language: "en" },
      { id: "en_r069", word: "PLANET", rhyme: "GRANITE", difficulty: 2, language: "en" },
      { id: "en_r070", word: "ROCKET", rhyme: "POCKET", difficulty: 2, language: "en" },
      { id: "en_r071", word: "GALAXY", rhyme: "FANTASY", difficulty: 2, language: "en" },
      { id: "en_r072", word: "COMET", rhyme: "VOMIT", difficulty: 2, language: "en" },
      { id: "en_r073", word: "SPIRIT", rhyme: "MERIT", difficulty: 2, language: "en" },
      { id: "en_r074", word: "MAGIC", rhyme: "TRAGIC", difficulty: 2, language: "en" },
      { id: "en_r075", word: "WONDER", rhyme: "THUNDER", difficulty: 2, language: "en" },
      { id: "en_r076", word: "WEATHER", rhyme: "FEATHER", difficulty: 2, language: "en" },
      { id: "en_r077", word: "SUMMER", rhyme: "DRUMMER", difficulty: 2, language: "en" },
      { id: "en_r078", word: "WINTER", rhyme: "SPLINTER", difficulty: 2, language: "en" },
      { id: "en_r079", word: "AUTUMN", rhyme: "BOTTOM", difficulty: 2, language: "en" },
      { id: "en_r080", word: "SPRING", rhyme: "STRING", difficulty: 2, language: "en" },
      { id: "en_r081", word: "RAINBOW", rhyme: "ELBOW", difficulty: 2, language: "en" },
      { id: "en_r082", word: "THUNDER", rhyme: "UNDER", difficulty: 2, language: "en" },
      { id: "en_r083", word: "LIGHTNING", rhyme: "FRIGHTENING", difficulty: 2, language: "en" },
      { id: "en_r084", word: "CLOUDY", rhyme: "ROWDY", difficulty: 2, language: "en" },
      { id: "en_r085", word: "STORMY", rhyme: "WORMY", difficulty: 2, language: "en" },
      { id: "en_r086", word: "WINDY", rhyme: "CINDY", difficulty: 2, language: "en" },
      { id: "en_r087", word: "TEACHER", rhyme: "PREACHER", difficulty: 2, language: "en" },
      { id: "en_r088", word: "DOCTOR", rhyme: "PROCTOR", difficulty: 2, language: "en" },
      { id: "en_r089", word: "PAINTER", rhyme: "FAINTER", difficulty: 2, language: "en" },
      { id: "en_r090", word: "SINGER", rhyme: "RINGER", difficulty: 2, language: "en" },
      { id: "en_r091", word: "DANCER", rhyme: "CANCER", difficulty: 2, language: "en" },
      { id: "en_r092", word: "WRITER", rhyme: "FIGHTER", difficulty: 2, language: "en" },
      { id: "en_r093", word: "BAKER", rhyme: "MAKER", difficulty: 2, language: "en" },
      { id: "en_r094", word: "SAILOR", rhyme: "TAILOR", difficulty: 2, language: "en" },
      { id: "en_r095", word: "FARMER", rhyme: "CHARMER", difficulty: 2, language: "en" },
      { id: "en_r096", word: "DRIVER", rhyme: "DIVER", difficulty: 2, language: "en" },
      { id: "en_r097", word: "PLAYER", rhyme: "LAYER", difficulty: 2, language: "en" },
      { id: "en_r098", word: "BUILDER", rhyme: "GUILDER", difficulty: 2, language: "en" },
      { id: "en_r099", word: "HELPER", rhyme: "YELPER", difficulty: 2, language: "en" },
      { id: "en_r100", word: "LEADER", rhyme: "READER", difficulty: 2, language: "en" },

      // NIVEL 3 (DIFÍCIL): 50 RIMAS COMPLEJAS
      { id: "en_r101", word: "ADVENTURE", rhyme: "DENTURE", difficulty: 3, language: "en" },
      { id: "en_r102", word: "MYSTERY", rhyme: "HISTORY", difficulty: 3, language: "en" },
      { id: "en_r103", word: "IMAGINATION", rhyme: "NATION", difficulty: 3, language: "en" },
      { id: "en_r104", word: "CREATION", rhyme: "STATION", difficulty: 3, language: "en" },
      { id: "en_r105", word: "EDUCATION", rhyme: "VACATION", difficulty: 3, language: "en" },
      { id: "en_r106", word: "CELEBRATION", rhyme: "SENSATION", difficulty: 3, language: "en" },
      { id: "en_r107", word: "DETERMINATION", rhyme: "DESTINATION", difficulty: 3, language: "en" },
      { id: "en_r108", word: "INSPIRATION", rhyme: "PREPARATION", difficulty: 3, language: "en" },
      { id: "en_r109", word: "COOPERATION", rhyme: "OPERATION", difficulty: 3, language: "en" },
      { id: "en_r110", word: "COMMUNICATION", rhyme: "LOCATION", difficulty: 3, language: "en" },
      { id: "en_r111", word: "POSSIBILITY", rhyme: "ABILITY", difficulty: 3, language: "en" },
      { id: "en_r112", word: "RESPONSIBILITY", rhyme: "FACILITY", difficulty: 3, language: "en" },
      { id: "en_r113", word: "OPPORTUNITY", rhyme: "COMMUNITY", difficulty: 3, language: "en" },
      { id: "en_r114", word: "PERSONALITY", rhyme: "REALITY", difficulty: 3, language: "en" },
      { id: "en_r115", word: "CURIOSITY", rhyme: "VELOCITY", difficulty: 3, language: "en" },
      { id: "en_r116", word: "CREATIVITY", rhyme: "ACTIVITY", difficulty: 3, language: "en" },
      { id: "en_r117", word: "ELECTRICITY", rhyme: "SIMPLICITY", difficulty: 3, language: "en" },
      { id: "en_r118", word: "TRANQUILITY", rhyme: "QUALITY", difficulty: 3, language: "en" },
      { id: "en_r119", word: "SECURITY", rhyme: "PURITY", difficulty: 3, language: "en" },
      { id: "en_r120", word: "CLARITY", rhyme: "CHARITY", difficulty: 3, language: "en" },
      { id: "en_r121", word: "HARMONY", rhyme: "SYMPHONY", difficulty: 3, language: "en" },
      { id: "en_r122", word: "MELODY", rhyme: "REMEDY", difficulty: 3, language: "en" },
      { id: "en_r123", word: "MEMORY", rhyme: "CENTURY", difficulty: 3, language: "en" },
      { id: "en_r124", word: "ENERGY", rhyme: "SYNERGY", difficulty: 3, language: "en" },
      { id: "en_r125", word: "STRATEGY", rhyme: "TRAGEDY", difficulty: 3, language: "en" },
      { id: "en_r126", word: "VICTORY", rhyme: "HISTORY", difficulty: 3, language: "en" },
      { id: "en_r127", word: "BOUNDARY", rhyme: "FOUNDRY", difficulty: 3, language: "en" },
      { id: "en_r128", word: "CENTURY", rhyme: "ENTRY", difficulty: 3, language: "en" },
      { id: "en_r129", word: "LIBRARY", rhyme: "PRIMARY", difficulty: 3, language: "en" },
      { id: "en_r130", word: "NECESSARY", rhyme: "LITERARY", difficulty: 3, language: "en" },
      { id: "en_r131", word: "BUTTERFLY", rhyme: "LULLABY", difficulty: 3, language: "en" },
      { id: "en_r132", word: "DRAGONFLY", rhyme: "SUPPLY", difficulty: 3, language: "en" },
      { id: "en_r133", word: "FIREFLY", rhyme: "MULTIPLY", difficulty: 3, language: "en" },
      { id: "en_r134", word: "GRASSHOPPER", rhyme: "STOPPER", difficulty: 3, language: "en" },
      { id: "en_r135", word: "CATERPILLAR", rhyme: "PILLAR", difficulty: 3, language: "en" },
      { id: "en_r136", word: "LADYBUG", rhyme: "BEDBUG", difficulty: 3, language: "en" },
      { id: "en_r137", word: "BUMBLEBEE", rhyme: "DEGREE", difficulty: 3, language: "en" },
      { id: "en_r138", word: "HONEYBEE", rhyme: "REFEREE", difficulty: 3, language: "en" },
      { id: "en_r139", word: "CRICKET", rhyme: "TICKET", difficulty: 3, language: "en" },
      { id: "en_r140", word: "MOSQUITO", rhyme: "BURRITO", difficulty: 3, language: "en" },
      { id: "en_r141", word: "BEETLE", rhyme: "NEEDLE", difficulty: 3, language: "en" },
      { id: "en_r142", word: "SPIDER", rhyme: "CIDER", difficulty: 3, language: "en" },
      { id: "en_r143", word: "SCORPION", rhyme: "CHAMPION", difficulty: 3, language: "en" },
      { id: "en_r144", word: "TARANTULA", rhyme: "FORMULA", difficulty: 3, language: "en" },
      { id: "en_r145", word: "CENTIPEDE", rhyme: "STAMPEDE", difficulty: 3, language: "en" },
      { id: "en_r146", word: "MILLIPEDE", rhyme: "PROCEED", difficulty: 3, language: "en" },
      { id: "en_r147", word: "FIREFLY", rhyme: "TERRIFY", difficulty: 3, language: "en" },
      { id: "en_r148", word: "NOTEBOOK", rhyme: "TEXTBOOK", difficulty: 3, language: "en" },
      { id: "en_r149", word: "PENCIL", rhyme: "STENCIL", difficulty: 3, language: "en" },
      { id: "en_r150", word: "ERASER", rhyme: "LASER", difficulty: 3, language: "en" }
    ];

    this.allRhymes = this.currentLanguage === 'es' ? spanishRhymes : englishRhymes;
    Logger.log(`✅ ${this.allRhymes.length} rimas cargadas para ${this.currentLanguage}`);
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
    
    this.loadRhymesData();
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
      
      this.elements.scoreValue.textContent = '0';
      
      await this.createSession();
      
      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);
      
      this.gameStartTime = Date.now();
      this.startGameTimer();
      
      await this.loadNextQuestion();
      
      Logger.log(`✅ Juego 4 iniciado: dificultad ${difficulty}`);
      
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
    
    this.currentQuestion++;
    this.updateProgress();
    
    this.selectRandomRhyme();
    this.displayQuestion();
    this.timeTracker.start();
  }

  selectRandomRhyme() {
    const filtered = this.allRhymes.filter(r => r.difficulty === this.currentDifficulty);
    this.currentRhyme = filtered[Math.floor(Math.random() * filtered.length)];
    Logger.log(`✅ Rima seleccionada: ${this.currentRhyme.word} - ${this.currentRhyme.rhyme}`);
  }

  displayQuestion() {
    // Mostrar palabra objetivo
    this.elements.targetWord.textContent = this.currentRhyme.word;
    
    // Generar opciones
    this.createOptions();
    
    // Reproducir audio automáticamente
    setTimeout(() => this.playTargetWord(), 500);
  }

  createOptions() {
    DOMUtils.clearContent(this.elements.optionsContainer);
    
    // Crear 4 opciones: 1 correcta + 3 distractores
    const correctAnswer = this.currentRhyme.rhyme;
    const distractors = this.generateDistractors(3);
    
    this.currentOptions = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    
    this.currentOptions.forEach((option, index) => {
      const card = document.createElement('div');
      card.className = 'option-card';
      card.dataset.option = option;
      card.dataset.isCorrect = option === correctAnswer;
      
      const icon = document.createElement('span');
      icon.className = 'option-icon';
      icon.textContent = ['🎵', '🎶', '🎼', '🎤'][index];
      
      const word = document.createElement('div');
      word.className = 'option-word';
      word.textContent = option;
      
      card.appendChild(icon);
      card.appendChild(word);
      
      card.addEventListener('click', () => this.handleOptionClick(card));
      
      this.elements.optionsContainer.appendChild(card);
    });
  }

  generateDistractors(count) {
    const filtered = this.allRhymes.filter(r => 
      r.difficulty === this.currentDifficulty && 
      r.id !== this.currentRhyme.id
    );
    
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const distractors = [];
    
    for (let i = 0; i < count && i < shuffled.length; i++) {
      distractors.push(shuffled[i].rhyme);
    }
    
    // Si no hay suficientes, generar palabras aleatorias
    while (distractors.length < count) {
      const randomWord = this.allRhymes[Math.floor(Math.random() * this.allRhymes.length)].word;
      if (!distractors.includes(randomWord) && randomWord !== this.currentRhyme.rhyme) {
        distractors.push(randomWord);
      }
    }
    
    return distractors;
  }

  async handleOptionClick(card) {
    if (card.classList.contains('option-card--disabled')) return;
    
    // Deshabilitar todas las opciones
    const allCards = this.elements.optionsContainer.querySelectorAll('.option-card');
    allCards.forEach(c => c.classList.add('option-card--disabled'));
    
    const reactionTime = this.timeTracker.recordReaction();
    const isCorrect = card.dataset.isCorrect === 'true';
    const selectedWord = card.dataset.option;
    
    // Marcar como seleccionada
    card.classList.add('option-card--selected');
    
    // Esperar un momento antes de mostrar feedback
    setTimeout(async () => {
      // Mostrar respuesta correcta/incorrecta
      if (isCorrect) {
        card.classList.add('option-card--correct');
        this.correctAnswers++;
      } else {
        card.classList.add('option-card--wrong');
        // Resaltar la respuesta correcta
        allCards.forEach(c => {
          if (c.dataset.isCorrect === 'true') {
            c.classList.add('option-card--correct');
          }
        });
      }
      
      const points = CalculationUtils.calculatePoints(isCorrect, reactionTime, this.currentDifficulty);
      this.totalScore += points;
      this.elements.scoreValue.textContent = this.totalScore;
      
      await this.saveResponse({
        rhymeId: this.currentRhyme.id,
        targetWord: this.currentRhyme.word,
        correctRhyme: this.currentRhyme.rhyme,
        selectedWord: selectedWord,
        correct: isCorrect,
        reactionTime: reactionTime,
        points: points
      });
      
      setTimeout(() => this.showFeedback(isCorrect, points), 1000);
    }, 300);
  }

  showFeedback(isCorrect, points) {
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.feedbackScreen);
    
    const content = this.elements.feedbackContent;
    DOMUtils.clearContent(content);
    
    const icon = document.createElement('div');
    icon.className = 'feedback-icon';
    icon.textContent = isCorrect ? '🎉' : '😅';
    
    const title = document.createElement('h3');
    title.className = 'feedback-title';
    title.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto';
    
    const message = document.createElement('p');
    message.className = 'feedback-message';
    message.textContent = isCorrect 
      ? `¡Excelente! ${this.currentRhyme.word} rima con ${this.currentRhyme.rhyme}` 
      : `${this.currentRhyme.word} rima con ${this.currentRhyme.rhyme}`;
    
    const explanation = document.createElement('div');
    explanation.className = 'feedback-rhyme-explanation';
    explanation.innerHTML = `
      <p><strong>${this.currentRhyme.word}</strong> ➔ ${this.getRhymeSound(this.currentRhyme.word)}</p>
      <p><strong>${this.currentRhyme.rhyme}</strong> ➔ ${this.getRhymeSound(this.currentRhyme.rhyme)}</p>
      <p>Ambas terminan con el mismo sonido 🎵</p>
    `;
    
    const pointsDiv = document.createElement('p');
    pointsDiv.className = 'feedback-points';
    pointsDiv.textContent = `+${points} puntos`;
    
    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(explanation);
    content.appendChild(pointsDiv);
  }

  getRhymeSound(word) {
    // Extraer últimas 2-3 letras como sonido de rima
    const length = word.length;
    if (length <= 3) return word;
    return word.substring(length - 3);
  }

  handleNextQuestion() {
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

  async playTargetWord() {
    DOMUtils.disable(this.elements.playTargetBtn);
    
    try {
      await this.synthesizeSpeech(this.currentRhyme.word);
    } catch (error) {
      Logger.error('Error reproduciendo audio', error);
    } finally {
      setTimeout(() => DOMUtils.enable(this.elements.playTargetBtn), 1000);
    }
  }

  synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = (error) => reject(error);
        speechSynthesis.speak(utterance);
      } else {
        reject(new Error('Speech synthesis not supported'));
      }
    });
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
      this.currentSessionId = `session_g4_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentCode: this.studentCode || 'ANONIMO',
        studentName: this.studentName || 'Jugador',
        gameNumber: 4,
        gameName: 'Rimas Divertidas',
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
      this.currentSessionId = `session_g4_${Date.now()}`;
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
            gamesCompleted: firebase.firestore.FieldValue.arrayUnion('game4'),
            game4LastScore: this.totalScore,
            game4LastAccuracy: accuracy,
            game4LastTime: this.gameTotalTime,
            game4CompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            allGamesCompleted: true // ✅ Marca que completó los 4 juegos
          });
          Logger.log('✅ Datos del estudiante actualizados - ¡4 juegos completados!');
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
    
    // Lanzar confetti final
    this.launchFinalConfetti();
    
    Logger.log(`📊 Juego 4 completado: ${this.totalScore} pts, ${accuracy}%`);
    Logger.log('🎉 ¡TODOS LOS 4 JUEGOS COMPLETADOS!');
  }

  generateMotivationalMessage(accuracy) {
    if (accuracy === 100) return '🌟 ¡Perfecto! ¡Eres un maestro de las rimas!';
    else if (accuracy >= 90) return '⭐ ¡Excelente trabajo! ¡Tienes oído musical!';
    else if (accuracy >= 80) return '👏 ¡Muy bien! ¡Conoces las rimas!';
    else if (accuracy >= 70) return '💪 ¡Buen esfuerzo! ¡Sigue practicando!';
    else return '🎯 ¡Sigue intentando! ¡Las rimas son divertidas!';
  }

  launchFinalConfetti() {
    // Confetti masivo para celebrar la finalización de los 4 juegos
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.background = ['#FF6B9D', '#C06C84', '#6C5B7B', '#355C7D', '#4CAF50', '#FFA726'][Math.floor(Math.random() * 6)];
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
      }, i * 30);
    }
  }

  async resetGame() {
    this.stopGameTimer();
    this.timeTracker.reset();
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
  module.exports = RimasDivertidasGame;
}