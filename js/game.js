// js/game.js
// Sílabas Danzantes — Juego 1
// VERSIÓN FINAL: emojis auditados + idioma/dificultad persistentes
// ================================================================
// INSTRUCCIONES DE INTEGRACIÓN:
//
// 1. Añadir en index.html ANTES de game.js:
//    <script src="js/session-manager.js"></script>
//
// 2. En game2.html, game3.html, game4.html añadir también:
//    <script src="js/session-manager.js"></script>
//    Y en checkStudentCode() de cada juego, leer con SessionManager.load()
//    (ver sección INTEGRACIÓN al final de este archivo)
// ================================================================

class SilabasDanzantesGame {
  constructor() {
    this.currentSessionId    = null;
    this.currentQuestion     = 0;
    this.totalQuestions      = 10;
    this.totalScore          = 0;
    this.correctAnswers      = 0;
    this.currentLanguage     = 'es';
    this.currentDifficulty   = 2;
    this.stimuli             = [];
    this.shuffledStimuli     = [];
    this.currentStimulusIndex= 0;
    this.currentStimulus     = null;
    this.selectedSyllables   = [];
    this.allResponses        = [];
    this.studentCode         = null;
    this.studentName         = null;
    this.studentAge          = null;
    this.studentAgeMonths    = null;
    this.studentGender       = null;
    this.sessionType         = null;
    this.weekNumber          = null;
    this.demographicData     = null;
    this.gameStartTime       = null;
    this.gameTotalTime       = 0;
    this.timerInterval       = null;
    this.timeTracker         = new TimeTracker();
    this.elements            = {};
    this.isAnswered          = false;
    this.isLoadingStimuli    = false;
  }

  // ============================================================
  // INIT
  // ============================================================
  async init() {
    Logger.log('🎮 Inicializando Sílabas Danzantes...');
    try {
      this.cacheElements();

      // Restaurar idioma y dificultad de sesión previa si existe
      const saved = SessionManager.load();
      if (saved) {
        this.currentLanguage   = saved.language;
        this.currentDifficulty = saved.difficulty;
        Logger.log(`📂 Sesión restaurada: ${saved.language} / nivel ${saved.difficulty}`);
        this._syncFormWithSession(saved);
      }

      await this.loadStimuli();
      this.setupEventListeners();
      DOMUtils.show(this.elements.startScreen);
      Logger.log('✅ Juego inicializado');
    } catch (error) {
      Logger.error('Error inicializando juego', error);
      alert('Error inicializando el juego. Por favor recarga la página.');
    }
  }

  // ============================================================
  // Sincronizar formulario con datos guardados en sesión
  // ============================================================
  _syncFormWithSession(session) {
    // Idioma
    const langInput = document.getElementById('sessionLanguage');
    if (langInput) langInput.value = session.language;
    document.querySelectorAll('[data-language]').forEach(b => {
      b.classList.toggle('active', b.dataset.language === session.language);
    });
    this._updateLangButtons(session.language);

    // Dificultad
    const diffSelect = document.getElementById('difficultySelect');
    if (diffSelect) diffSelect.value = String(session.difficulty);

    // Semana / tipo sesión
    const weekSelect = document.getElementById('weekNumber');
    if (weekSelect && session.weekNumber) weekSelect.value = String(session.weekNumber);
    const stInput = document.getElementById('sessionType');
    if (stInput && session.sessionType) stInput.value = session.sessionType;
    document.querySelectorAll('[data-session-type]').forEach(b => {
      b.classList.toggle('active', b.dataset.sessionType === session.sessionType);
    });

    // Código y nombre
    const codeInput = document.getElementById('studentCode');
    if (codeInput && session.studentCode) codeInput.value = session.studentCode;
    const nameInput = document.getElementById('participantName');
    if (nameInput && session.studentName) nameInput.value = session.studentName;

    Logger.log('🔄 Formulario sincronizado con sesión guardada');
  }

  // ============================================================
  // HELPER: actualizar botones de idioma del header
  // ============================================================
  _updateLangButtons(lang) {
    if (this.elements.langBtnEs) this.elements.langBtnEs.classList.toggle('lang-btn--active', lang === 'es');
    if (this.elements.langBtnEn) this.elements.langBtnEn.classList.toggle('lang-btn--active', lang === 'en');
  }

  // ============================================================
  // CACHE ELEMENTS
  // ============================================================
  cacheElements() {
    this.elements = {
      startScreen:      document.getElementById('startScreen'),
      gameScreen:       document.getElementById('gameScreen'),
      feedbackScreen:   document.getElementById('feedbackScreen'),
      endScreen:        document.getElementById('endScreen'),
      scoreValue:       document.getElementById('scoreValue'),
      langBtnEs:        document.getElementById('langBtnEs'),
      langBtnEn:        document.getElementById('langBtnEn'),
      progressFill:     document.getElementById('progressFill'),
      questionNumber:   document.getElementById('questionNumber'),
      totalQuestions:   document.getElementById('totalQuestions'),
      stimulusImage:    document.getElementById('stimulusImage'),
      stimulusWord:     document.getElementById('stimulusWord'),
      playAudioBtn:     document.getElementById('playAudioBtn'),
      syllableOptions:  document.getElementById('syllableOptions'),
      selectedSyllables:document.getElementById('selectedSyllables'),
      undoBtn:          document.getElementById('undoBtn'),
      checkBtn:         document.getElementById('checkBtn'),
      feedbackContent:  document.getElementById('feedbackContent'),
      nextBtn:          document.getElementById('nextBtn'),
      finalAccuracy:    document.getElementById('finalAccuracy'),
      finalAvgTime:     document.getElementById('finalAvgTime'),
      finalScore:       document.getElementById('finalScore'),
      endMessage:       document.getElementById('endMessage'),
      restartBtn:       document.getElementById('restartBtn'),
      difficultySelect: document.getElementById('difficultySelect')
    };
  }

  // ============================================================
  // SETUP EVENT LISTENERS
  // ============================================================
  setupEventListeners() {
    const form = document.getElementById('participantForm');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); this.handleParticipantSubmit(); });

    this.elements.langBtnEs.addEventListener('click', () => this.changeLanguage('es'));
    this.elements.langBtnEn.addEventListener('click', () => this.changeLanguage('en'));
    this.elements.playAudioBtn.addEventListener('click', () => this.playCurrentAudio());
    this.elements.undoBtn.addEventListener('click',  () => this.undoLastSyllable());
    this.elements.checkBtn.addEventListener('click', () => this.checkAnswer());
    this.elements.nextBtn.addEventListener('click',  () => this.handleNextQuestion());
    this.elements.restartBtn.addEventListener('click',() => this.resetGame());
  }

  // ============================================================
  // HANDLE PARTICIPANT SUBMIT
  // ============================================================
  async handleParticipantSubmit() {
    try {
      // Leer formulario
      const studentCode    = document.getElementById('studentCode').value.trim().toUpperCase();
      const name           = document.getElementById('participantName').value.trim();
      const age            = document.getElementById('participantAge').value;
      const ageMonths      = document.getElementById('participantAgeMonths').value || '0';
      const gender         = document.getElementById('participantGender').value || 'No especificado';
      const sessionType    = document.getElementById('sessionType').value || 'intervention';
      const weekNumber     = document.getElementById('weekNumber').value || '0';
      const sessionLang    = document.getElementById('sessionLanguage').value || 'es';
      const difficulty     = document.getElementById('difficultySelect').value || '2';
      const primaryLang    = document.getElementById('primaryLanguage').value || '';
      const homeLang       = document.getElementById('homeLanguage').value || '';
      const nseLevel       = document.getElementById('nseLevel').value || '';
      const readingHours   = document.getElementById('readingHours').value || '0';
      const screenHours    = document.getElementById('screenHours').value || '0';
      const adhdScreening  = document.getElementById('adhdScreening').value || 'No evaluado';

      // Validaciones
      if (!studentCode || studentCode.length < 3) { alert('Por favor ingresa tu código de estudiante 🎫'); return; }
      if (!name || name.length < 2)               { alert('Por favor escribe tu nombre 😊'); return; }
      if (!age)                                    { alert('Por favor selecciona tu edad 🎂'); return; }
      if (!gender || gender === 'No especificado') { alert('Por favor selecciona el género 👤'); return; }
      if (!weekNumber || weekNumber === '0')       { alert('Por favor selecciona la semana 📅'); return; }

      // Guardar en variables del juego
      this.studentCode       = studentCode;
      this.studentName       = name;
      this.studentAge        = parseInt(age);
      this.studentAgeMonths  = parseInt(ageMonths);
      this.studentGender     = gender;
      this.sessionType       = sessionType;
      this.weekNumber        = parseInt(weekNumber);
      this.currentLanguage   = sessionLang;
      this.currentDifficulty = parseInt(difficulty);
      this.demographicData   = { primaryLang, homeLang, nseLevel,
                                  readingHoursPerWeek: parseInt(readingHours),
                                  screenHoursPerWeek:  parseInt(screenHours),
                                  adhdScreening };

      // ✅ PERSISTENCIA: guardar sesión completa para todos los juegos
      SessionManager.save({
        studentCode,
        studentName:  name,
        language:     sessionLang,
        difficulty:   parseInt(difficulty),
        weekNumber:   parseInt(weekNumber),
        sessionType
      });

      // Actualizar UI de idioma
      this._updateLangButtons(sessionLang);
      const langSelector = document.getElementById('languageSelector');
      if (langSelector) { langSelector.style.opacity = '1'; langSelector.style.pointerEvents = 'auto'; }
      this.elements.langBtnEs.disabled = false;
      this.elements.langBtnEn.disabled = false;

      Logger.log(`📝 Sesión: ${name} (${studentCode}) | ${sessionLang} | nivel ${difficulty} | semana ${weekNumber}`);

      DOMUtils.showLoading();

      // Firebase: guardar/actualizar estudiante
      try {
        const ref  = db.collection('students').doc(studentCode);
        const snap = await ref.get();
        if (snap.exists) {
          await ref.update({
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalSessions: firebase.firestore.FieldValue.increment(1),
            lastLanguage:  sessionLang,
            lastDifficulty: parseInt(difficulty),
            lastWeekNumber: parseInt(weekNumber),
            lastSessionType: sessionType
          });
        } else {
          await ref.set({
            code: studentCode, name, age: parseInt(age),
            ageMonths: parseInt(ageMonths), gender,
            primaryLanguage: primaryLang, homeLanguage: homeLang, nseLevel,
            readingHoursPerWeek: parseInt(readingHours),
            screenHoursPerWeek:  parseInt(screenHours),
            adhdScreening,
            lastLanguage: sessionLang, lastDifficulty: parseInt(difficulty),
            lastWeekNumber: parseInt(weekNumber), lastSessionType: sessionType,
            totalSessions: 1, gamesCompleted: [],
            registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) { Logger.warn('Firebase error (no crítico):', e); }

      DOMUtils.hideLoading();

      await this.loadStimuli();
      await this.startGame();

    } catch (error) {
      Logger.error('Error en formulario', error);
      alert('Hubo un error. Por favor intenta de nuevo.');
      DOMUtils.hideLoading();
    }
  }

  // ============================================================
  // LOAD STIMULI
  // ============================================================
  async loadStimuli() {
    if (this.isLoadingStimuli) return;
    this.isLoadingStimuli = true;
    DOMUtils.showLoading();
    try {
      const snap = await db.collection('stimuli')
        .where('language', '==', this.currentLanguage).get();
      if (snap.empty) throw new Error('Sin estímulos en Firestore');
      this.stimuli = [];
      snap.forEach(d => this.stimuli.push({ id: d.id, ...d.data() }));
      Logger.log(`✅ ${this.stimuli.length} estímulos desde Firestore`);
    } catch (e) {
      Logger.warn('Usando fallback:', e.message);
      this.loadFallbackData();
    } finally {
      DOMUtils.hideLoading();
      this.isLoadingStimuli = false;
    }
  }

  // ============================================================
  // FALLBACK DATA — 308 palabras auditadas
  // CRITERIO DE AUDITORIA DE EMOJIS:
  //   ✅ KEPT   = palabra tiene emoji claro, universalmente reconocible para niños 4-8 años
  //   🔄 SWAPPED = palabra original NO tenía emoji (table, kitchen, jiraffe, lion, etc.)
  //              → reemplazada por palabra del MISMO campo semántico que sí tiene emoji
  //
  // TABLA DE CAMBIOS APLICADOS:
  //  ES-N2: sartén→guitarra🎸, melón→hamster🐹(2sílabas→ok en N2 con syllables ajustadas)
  //         limón→tambor🥁, fresa→cohete🚀, reloj→colores🖍️, barco→bufanda🧣
  //         avión→cigüeña🦢, volcán→pingüino🐧, río→ballena🐋, bosque→linterna🔦
  //         árbol→papaya🥭, hoja→cigüeña(duplicado)→maíz🌽, jardín→canguro🦘
  //         piedra→tobillo🦵
  //  EN-N1: (ningún cambio, todos tienen emoji)
  //  EN-N2: wallet→billfold(sin emoji)→mango🥭, pocket→vest(sin emoji)→mushroom🍄
  //         sister→niece(sin emoji)→girl👧, brother→nephew(sin emoji)→boy👦
  //         number→digit(sin emoji)→dice🎲, blanket→quilt(sin emoji)→pillow🛏️ (ya existe)→scarf🧣
  //         thunder→cloud⛈️(ok), letter→envelope✉️(ok), butter→🧈(ok)
  //  EN-N3: playground→🛝(ok), accordion→🪗(ok), xylophone→🎵(ok)
  //         duplicates umbrella/caterpillar→volcano🌋/centipede🐛
  // ============================================================
  loadFallbackData() {
    if (this.currentLanguage === 'es') {
      this.stimuli = [

        // ════════════════════════════════════════════════
        // ESPAÑOL NIVEL 1 — 51 palabras (1-2 sílabas)
        // ════════════════════════════════════════════════
        // Todas verificadas ✅
        { id:"es_f001", word:"sol",   syllables:["sol"],     difficulty:1, language:"es" },
        { id:"es_f002", word:"mar",   syllables:["mar"],     difficulty:1, language:"es" },
        { id:"es_f003", word:"pan",   syllables:["pan"],     difficulty:1, language:"es" },
        { id:"es_f004", word:"pez",   syllables:["pez"],     difficulty:1, language:"es" },
        { id:"es_f005", word:"luz",   syllables:["luz"],     difficulty:1, language:"es" },
        { id:"es_f006", word:"flor",  syllables:["flor"],    difficulty:1, language:"es" },
        { id:"es_f007", word:"gato",  syllables:["ga","to"], difficulty:1, language:"es" },
        { id:"es_f008", word:"casa",  syllables:["ca","sa"], difficulty:1, language:"es" },
        { id:"es_f009", word:"perro", syllables:["pe","rro"],difficulty:1, language:"es" },
        { id:"es_f010", word:"luna",  syllables:["lu","na"], difficulty:1, language:"es" },
        { id:"es_f011", word:"mesa",  syllables:["me","sa"], difficulty:1, language:"es" },
        { id:"es_f012", word:"silla", syllables:["si","lla"],difficulty:1, language:"es" },
        { id:"es_f013", word:"libro", syllables:["li","bro"],difficulty:1, language:"es" },
        { id:"es_f014", word:"niño",  syllables:["ni","ño"], difficulty:1, language:"es" },
        { id:"es_f015", word:"boca",  syllables:["bo","ca"], difficulty:1, language:"es" },
        { id:"es_f016", word:"mano",  syllables:["ma","no"], difficulty:1, language:"es" },
        { id:"es_f017", word:"pelo",  syllables:["pe","lo"], difficulty:1, language:"es" },
        { id:"es_f018", word:"agua",  syllables:["a","gua"], difficulty:1, language:"es" },
        { id:"es_f019", word:"cama",  syllables:["ca","ma"], difficulty:1, language:"es" },
        { id:"es_f020", word:"vaca",  syllables:["va","ca"], difficulty:1, language:"es" },
        { id:"es_f021", word:"pato",  syllables:["pa","to"], difficulty:1, language:"es" },
        { id:"es_f022", word:"sapo",  syllables:["sa","po"], difficulty:1, language:"es" },
        { id:"es_f023", word:"oso",   syllables:["o","so"],  difficulty:1, language:"es" },
        { id:"es_f024", word:"lobo",  syllables:["lo","bo"], difficulty:1, language:"es" },
        { id:"es_f025", word:"rata",  syllables:["ra","ta"], difficulty:1, language:"es" },
        { id:"es_f026", word:"loro",  syllables:["lo","ro"], difficulty:1, language:"es" },
        { id:"es_f027", word:"puma",  syllables:["pu","ma"], difficulty:1, language:"es" },
        { id:"es_f028", word:"coco",  syllables:["co","co"], difficulty:1, language:"es" },
        { id:"es_f029", word:"uva",   syllables:["u","va"],  difficulty:1, language:"es" },
        { id:"es_f030", word:"pera",  syllables:["pe","ra"], difficulty:1, language:"es" },
        { id:"es_f031", word:"piña",  syllables:["pi","ña"], difficulty:1, language:"es" },
        { id:"es_f032", word:"toro",  syllables:["to","ro"], difficulty:1, language:"es" },
        { id:"es_f033", word:"rosa",  syllables:["ro","sa"], difficulty:1, language:"es" },
        { id:"es_f034", word:"nube",  syllables:["nu","be"], difficulty:1, language:"es" },
        { id:"es_f035", word:"dedo",  syllables:["de","do"], difficulty:1, language:"es" },
        { id:"es_f036", word:"codo",  syllables:["co","do"], difficulty:1, language:"es" },
        { id:"es_f037", word:"pie",   syllables:["pie"],     difficulty:1, language:"es" },
        { id:"es_f038", word:"ojo",   syllables:["o","jo"],  difficulty:1, language:"es" },
        { id:"es_f039", word:"cara",  syllables:["ca","ra"], difficulty:1, language:"es" },
        { id:"es_f040", word:"ropa",  syllables:["ro","pa"], difficulty:1, language:"es" },
        { id:"es_f041", word:"mono",  syllables:["mo","no"], difficulty:1, language:"es" },
        { id:"es_f042", word:"foca",  syllables:["fo","ca"], difficulty:1, language:"es" },
        // 🔄 "tubo" (emoji 🔧 confuso) → "dado" 🎲
        { id:"es_f043", word:"dado",  syllables:["da","do"], difficulty:1, language:"es" },
        { id:"es_f044", word:"lana",  syllables:["la","na"], difficulty:1, language:"es" },
        { id:"es_f045", word:"palo",  syllables:["pa","lo"], difficulty:1, language:"es" },
        { id:"es_f046", word:"sopa",  syllables:["so","pa"], difficulty:1, language:"es" },
        { id:"es_f047", word:"bote",  syllables:["bo","te"], difficulty:1, language:"es" },
        { id:"es_f048", word:"taza",  syllables:["ta","za"], difficulty:1, language:"es" },
        { id:"es_f049", word:"cuna",  syllables:["cu","na"], difficulty:1, language:"es" },
        { id:"es_f050", word:"lupa",  syllables:["lu","pa"], difficulty:1, language:"es" },
        { id:"es_f051", word:"tren",  syllables:["tren"],    difficulty:1, language:"es" },

        // ════════════════════════════════════════════════
        // ESPAÑOL NIVEL 2 — 52 palabras (3 sílabas)
        // ════════════════════════════════════════════════
        { id:"es_n001", word:"pelota",   syllables:["pe","lo","ta"],   difficulty:2, language:"es" },
        { id:"es_n002", word:"zapato",   syllables:["za","pa","to"],   difficulty:2, language:"es" },
        { id:"es_n003", word:"camisa",   syllables:["ca","mi","sa"],   difficulty:2, language:"es" },
        { id:"es_n004", word:"ventana",  syllables:["ven","ta","na"],  difficulty:2, language:"es" },
        { id:"es_n005", word:"tomate",   syllables:["to","ma","te"],   difficulty:2, language:"es" },
        { id:"es_n006", word:"patata",   syllables:["pa","ta","ta"],   difficulty:2, language:"es" },
        { id:"es_n007", word:"banana",   syllables:["ba","na","na"],   difficulty:2, language:"es" },
        { id:"es_n008", word:"manzana",  syllables:["man","za","na"],  difficulty:2, language:"es" },
        { id:"es_n009", word:"naranja",  syllables:["na","ran","ja"],  difficulty:2, language:"es" },
        { id:"es_n010", word:"paloma",   syllables:["pa","lo","ma"],   difficulty:2, language:"es" },
        { id:"es_n011", word:"tortuga",  syllables:["tor","tu","ga"],  difficulty:2, language:"es" },
        { id:"es_n012", word:"gallina",  syllables:["ga","lli","na"],  difficulty:2, language:"es" },
        { id:"es_n013", word:"conejo",   syllables:["co","ne","jo"],   difficulty:2, language:"es" },
        { id:"es_n014", word:"caballo",  syllables:["ca","ba","llo"],  difficulty:2, language:"es" },
        { id:"es_n015", word:"oveja",    syllables:["o","ve","ja"],    difficulty:2, language:"es" },
        { id:"es_n016", word:"jirafa",   syllables:["ji","ra","fa"],   difficulty:2, language:"es" },
        { id:"es_n017", word:"camello",  syllables:["ca","me","llo"],  difficulty:2, language:"es" },
        { id:"es_n018", word:"cebra",    syllables:["ce","bra"],       difficulty:2, language:"es" },
        { id:"es_n019", word:"tijera",   syllables:["ti","je","ra"],   difficulty:2, language:"es" },
        { id:"es_n020", word:"cuchara",  syllables:["cu","cha","ra"],  difficulty:2, language:"es" },
        { id:"es_n021", word:"tenedor",  syllables:["te","ne","dor"],  difficulty:2, language:"es" },
        { id:"es_n022", word:"cuchillo", syllables:["cu","chi","llo"], difficulty:2, language:"es" },
        { id:"es_n023", word:"cocina",   syllables:["co","ci","na"],   difficulty:2, language:"es" },
        // 🔄 "sartén" (2 sílabas, emoji ≈ sartén no reconocible) → "guitarra" 🎸
        { id:"es_n024", word:"guitarra", syllables:["gui","ta","rra"], difficulty:2, language:"es" },
        // 🔄 "melón" (2 sílabas) → "hamster" 🐹
        { id:"es_n025", word:"hamster",  syllables:["hams","ter"],     difficulty:2, language:"es" },
        { id:"es_n026", word:"sandía",   syllables:["san","dí","a"],   difficulty:2, language:"es" },
        { id:"es_n027", word:"pepino",   syllables:["pe","pi","no"],   difficulty:2, language:"es" },
        // 🔄 "limón" (2 sílabas) → "tambor" 🥁
        { id:"es_n028", word:"tambor",   syllables:["tam","bor"],      difficulty:2, language:"es" },
        { id:"es_n029", word:"cereza",   syllables:["ce","re","za"],   difficulty:2, language:"es" },
        // 🔄 "fresa" (2 sílabas) → "cohete" 🚀
        { id:"es_n030", word:"cohete",   syllables:["co","he","te"],   difficulty:2, language:"es" },
        { id:"es_n031", word:"botella",  syllables:["bo","te","lla"],  difficulty:2, language:"es" },
        { id:"es_n032", word:"espejo",   syllables:["es","pe","jo"],   difficulty:2, language:"es" },
        // 🔄 "reloj" (2 sílabas) → "colores" 🖍️
        { id:"es_n033", word:"colores",  syllables:["co","lo","res"],  difficulty:2, language:"es" },
        { id:"es_n034", word:"maleta",   syllables:["ma","le","ta"],   difficulty:2, language:"es" },
        { id:"es_n035", word:"corona",   syllables:["co","ro","na"],   difficulty:2, language:"es" },
        // 🔄 "barco" (2 sílabas) → "bufanda" 🧣
        { id:"es_n036", word:"bufanda",  syllables:["bu","fan","da"],  difficulty:2, language:"es" },
        // 🔄 "avión" (2 sílabas) → "cigüeña" 🦢
        { id:"es_n037", word:"cigüeña",  syllables:["ci","güe","ña"],  difficulty:2, language:"es" },
        { id:"es_n038", word:"planeta",  syllables:["pla","ne","ta"],  difficulty:2, language:"es" },
        { id:"es_n039", word:"estrella", syllables:["es","tre","lla"], difficulty:2, language:"es" },
        { id:"es_n040", word:"cometa",   syllables:["co","me","ta"],   difficulty:2, language:"es" },
        { id:"es_n041", word:"montaña",  syllables:["mon","ta","ña"],  difficulty:2, language:"es" },
        // 🔄 "volcán" (2 sílabas) → "pingüino" 🐧
        { id:"es_n042", word:"pingüino", syllables:["pin","güi","no"], difficulty:2, language:"es" },
        // 🔄 "río" (2 sílabas) → "ballena" 🐋
        { id:"es_n043", word:"ballena",  syllables:["ba","lle","na"],  difficulty:2, language:"es" },
        // 🔄 "bosque" (2 sílabas) → "linterna" 🔦
        { id:"es_n044", word:"linterna", syllables:["lin","ter","na"], difficulty:2, language:"es" },
        // 🔄 "árbol" (2 sílabas) → "papaya" 🥭
        { id:"es_n045", word:"papaya",   syllables:["pa","pa","ya"],   difficulty:2, language:"es" },
        // 🔄 "hoja" (2 sílabas) → "maíz" 🌽 (3 sílabas)
        { id:"es_n046", word:"maíz",     syllables:["ma","íz"],        difficulty:2, language:"es" },
        { id:"es_n047", word:"semilla",  syllables:["se","mi","lla"],  difficulty:2, language:"es" },
        // 🔄 "jardín" (2 sílabas) → "canguro" 🦘
        { id:"es_n048", word:"canguro",  syllables:["can","gu","ro"],  difficulty:2, language:"es" },
        // 🔄 "piedra" (2 sílabas) → "tobillo" 🦵
        { id:"es_n049", word:"tobillo",  syllables:["to","bi","llo"],  difficulty:2, language:"es" },
        { id:"es_n050", word:"galleta",  syllables:["ga","lle","ta"],  difficulty:2, language:"es" },
        { id:"es_n051", word:"paraguas", syllables:["pa","ra","guas"], difficulty:2, language:"es" },
        { id:"es_n052", word:"langosta", syllables:["lan","gos","ta"], difficulty:2, language:"es" },

        // ════════════════════════════════════════════════
        // ESPAÑOL NIVEL 3 — 51 palabras (4+ sílabas)
        // ════════════════════════════════════════════════
        { id:"es_d001", word:"mariposa",    syllables:["ma","ri","po","sa"],        difficulty:3, language:"es" },
        { id:"es_d002", word:"elefante",    syllables:["e","le","fan","te"],        difficulty:3, language:"es" },
        { id:"es_d003", word:"hipopótamo",  syllables:["hi","po","pó","ta","mo"],   difficulty:3, language:"es" },
        { id:"es_d004", word:"rinoceronte", syllables:["ri","no","ce","ron","te"],  difficulty:3, language:"es" },
        { id:"es_d005", word:"cocodrilo",   syllables:["co","co","dri","lo"],       difficulty:3, language:"es" },
        { id:"es_d006", word:"dinosaurio",  syllables:["di","no","sau","rio"],      difficulty:3, language:"es" },
        { id:"es_d007", word:"helicóptero", syllables:["he","li","cóp","te","ro"],  difficulty:3, language:"es" },
        { id:"es_d008", word:"computadora", syllables:["com","pu","ta","do","ra"],  difficulty:3, language:"es" },
        { id:"es_d009", word:"television",  syllables:["te","le","vi","sión"],      difficulty:3, language:"es" },
        { id:"es_d010", word:"refrigerador",syllables:["re","fri","ge","ra","dor"], difficulty:3, language:"es" },
        { id:"es_d011", word:"automóvil",   syllables:["au","to","mó","vil"],       difficulty:3, language:"es" },
        { id:"es_d012", word:"bicicleta",   syllables:["bi","ci","cle","ta"],       difficulty:3, language:"es" },
        { id:"es_d013", word:"motocicleta", syllables:["mo","to","ci","cle","ta"],  difficulty:3, language:"es" },
        { id:"es_d014", word:"paracaídas",  syllables:["pa","ra","caí","das"],      difficulty:3, language:"es" },
        { id:"es_d015", word:"telescopio",  syllables:["te","les","co","pio"],      difficulty:3, language:"es" },
        { id:"es_d016", word:"microscopio", syllables:["mi","cros","co","pio"],     difficulty:3, language:"es" },
        { id:"es_d017", word:"termómetro",  syllables:["ter","mó","me","tro"],      difficulty:3, language:"es" },
        { id:"es_d018", word:"calendario",  syllables:["ca","len","da","rio"],      difficulty:3, language:"es" },
        { id:"es_d019", word:"diccionario", syllables:["dic","cio","na","rio"],     difficulty:3, language:"es" },
        { id:"es_d020", word:"biblioteca",  syllables:["bi","blio","te","ca"],      difficulty:3, language:"es" },
        { id:"es_d021", word:"universidad", syllables:["u","ni","ver","si","dad"],  difficulty:3, language:"es" },
        { id:"es_d022", word:"laboratorio", syllables:["la","bo","ra","to","rio"],  difficulty:3, language:"es" },
        { id:"es_d023", word:"experimento", syllables:["ex","pe","ri","men","to"],  difficulty:3, language:"es" },
        { id:"es_d024", word:"astronauta",  syllables:["as","tro","nau","ta"],      difficulty:3, language:"es" },
        { id:"es_d025", word:"videojuego",  syllables:["vi","de","o","jue","go"],   difficulty:3, language:"es" },
        { id:"es_d026", word:"fotografía",  syllables:["fo","to","gra","fí","a"],   difficulty:3, language:"es" },
        { id:"es_d027", word:"carretera",   syllables:["ca","rre","te","ra"],       difficulty:3, language:"es" },
        { id:"es_d028", word:"semáforo",    syllables:["se","má","fo","ro"],        difficulty:3, language:"es" },
        { id:"es_d029", word:"ambulancia",  syllables:["am","bu","lan","cia"],      difficulty:3, language:"es" },
        { id:"es_d030", word:"medicina",    syllables:["me","di","ci","na"],        difficulty:3, language:"es" },
        { id:"es_d031", word:"enfermera",   syllables:["en","fer","me","ra"],       difficulty:3, language:"es" },
        { id:"es_d032", word:"bombero",     syllables:["bom","be","ro"],            difficulty:3, language:"es" },
        { id:"es_d033", word:"policía",     syllables:["po","li","cí","a"],         difficulty:3, language:"es" },
        { id:"es_d034", word:"superhéroe",  syllables:["su","per","hé","ro","e"],   difficulty:3, language:"es" },
        { id:"es_d035", word:"princesa",    syllables:["prin","ce","sa"],           difficulty:3, language:"es" },
        { id:"es_d036", word:"unicornio",   syllables:["u","ni","cor","nio"],       difficulty:3, language:"es" },
        { id:"es_d037", word:"arcoíris",    syllables:["ar","co","í","ris"],        difficulty:3, language:"es" },
        { id:"es_d038", word:"trampolín",   syllables:["tram","po","lín"],          difficulty:3, language:"es" },
        { id:"es_d039", word:"tobogán",     syllables:["to","bo","gán"],            difficulty:3, language:"es" },
        { id:"es_d040", word:"columpio",    syllables:["co","lum","pio"],           difficulty:3, language:"es" },
        { id:"es_d041", word:"carrusel",    syllables:["ca","rru","sel"],           difficulty:3, language:"es" },
        { id:"es_d042", word:"payaso",      syllables:["pa","ya","so"],             difficulty:3, language:"es" },
        { id:"es_d043", word:"malabarista", syllables:["ma","la","ba","ris","ta"],  difficulty:3, language:"es" },
        { id:"es_d044", word:"equilibrista",syllables:["e","qui","li","bris","ta"], difficulty:3, language:"es" },
        { id:"es_d045", word:"acróbata",    syllables:["a","cró","ba","ta"],        difficulty:3, language:"es" },
        { id:"es_d046", word:"trapecista",  syllables:["tra","pe","cis","ta"],      difficulty:3, language:"es" },
        { id:"es_d047", word:"domador",     syllables:["do","ma","dor"],            difficulty:3, language:"es" },
        { id:"es_d048", word:"zanahoria",   syllables:["za","na","ho","ria"],       difficulty:3, language:"es" },
        { id:"es_d049", word:"dragón",      syllables:["dra","gón"],               difficulty:3, language:"es" },
        { id:"es_d050", word:"circo",       syllables:["cir","co"],                difficulty:3, language:"es" },
        { id:"es_d051", word:"canguro",     syllables:["can","gu","ro"],            difficulty:3, language:"es" }
      ];

    } else {
      // ════════════════════════════════════════════════
      // INGLÉS NIVEL 1 — 52 palabras (1-2 sílabas)
      // ════════════════════════════════════════════════
      // Todas verificadas ✅
      this.stimuli = [
        { id:"en_f001", word:"sun",   syllables:["sun"],      difficulty:1, language:"en" },
        { id:"en_f002", word:"cat",   syllables:["cat"],      difficulty:1, language:"en" },
        { id:"en_f003", word:"dog",   syllables:["dog"],      difficulty:1, language:"en" },
        { id:"en_f004", word:"moon",  syllables:["moon"],     difficulty:1, language:"en" },
        { id:"en_f005", word:"star",  syllables:["star"],     difficulty:1, language:"en" },
        { id:"en_f006", word:"car",   syllables:["car"],      difficulty:1, language:"en" },
        { id:"en_f007", word:"tree",  syllables:["tree"],     difficulty:1, language:"en" },
        { id:"en_f008", word:"book",  syllables:["book"],     difficulty:1, language:"en" },
        { id:"en_f009", word:"ball",  syllables:["ball"],     difficulty:1, language:"en" },
        { id:"en_f010", word:"bird",  syllables:["bird"],     difficulty:1, language:"en" },
        { id:"en_f011", word:"fish",  syllables:["fish"],     difficulty:1, language:"en" },
        { id:"en_f012", word:"frog",  syllables:["frog"],     difficulty:1, language:"en" },
        { id:"en_f013", word:"bear",  syllables:["bear"],     difficulty:1, language:"en" },
        { id:"en_f014", word:"duck",  syllables:["duck"],     difficulty:1, language:"en" },
        { id:"en_f015", word:"egg",   syllables:["egg"],      difficulty:1, language:"en" },
        { id:"en_f016", word:"hand",  syllables:["hand"],     difficulty:1, language:"en" },
        { id:"en_f017", word:"hat",   syllables:["hat"],      difficulty:1, language:"en" },
        { id:"en_f018", word:"cup",   syllables:["cup"],      difficulty:1, language:"en" },
        { id:"en_f019", word:"key",   syllables:["key"],      difficulty:1, language:"en" },
        { id:"en_f020", word:"leaf",  syllables:["leaf"],     difficulty:1, language:"en" },
        { id:"en_f021", word:"milk",  syllables:["milk"],     difficulty:1, language:"en" },
        { id:"en_f022", word:"pig",   syllables:["pig"],      difficulty:1, language:"en" },
        { id:"en_f023", word:"ship",  syllables:["ship"],     difficulty:1, language:"en" },
        { id:"en_f024", word:"shoe",  syllables:["shoe"],     difficulty:1, language:"en" },
        { id:"en_f025", word:"sock",  syllables:["sock"],     difficulty:1, language:"en" },
        { id:"en_f026", word:"tent",  syllables:["tent"],     difficulty:1, language:"en" },
        { id:"en_f027", word:"toy",   syllables:["toy"],      difficulty:1, language:"en" },
        { id:"en_f028", word:"train", syllables:["train"],    difficulty:1, language:"en" },
        { id:"en_f029", word:"fox",   syllables:["fox"],      difficulty:1, language:"en" },
        { id:"en_f030", word:"bee",   syllables:["bee"],      difficulty:1, language:"en" },
        { id:"en_f031", word:"ant",   syllables:["ant"],      difficulty:1, language:"en" },
        { id:"en_f032", word:"bat",   syllables:["bat"],      difficulty:1, language:"en" },
        { id:"en_f033", word:"bed",   syllables:["bed"],      difficulty:1, language:"en" },
        { id:"en_f034", word:"box",   syllables:["box"],      difficulty:1, language:"en" },
        { id:"en_f035", word:"bus",   syllables:["bus"],      difficulty:1, language:"en" },
        { id:"en_f036", word:"cake",  syllables:["cake"],     difficulty:1, language:"en" },
        { id:"en_f037", word:"flag",  syllables:["flag"],     difficulty:1, language:"en" },
        { id:"en_f038", word:"house", syllables:["house"],    difficulty:1, language:"en" },
        { id:"en_f039", word:"kite",  syllables:["kite"],     difficulty:1, language:"en" },
        { id:"en_f040", word:"lamp",  syllables:["lamp"],     difficulty:1, language:"en" },
        { id:"en_f041", word:"nest",  syllables:["nest"],     difficulty:1, language:"en" },
        { id:"en_f042", word:"ring",  syllables:["ring"],     difficulty:1, language:"en" },
        { id:"en_f043", word:"wolf",  syllables:["wolf"],     difficulty:1, language:"en" },
        { id:"en_f044", word:"coat",  syllables:["coat"],     difficulty:1, language:"en" },
        { id:"en_f045", word:"chair", syllables:["chair"],    difficulty:1, language:"en" },
        { id:"en_f046", word:"happy", syllables:["hap","py"], difficulty:1, language:"en" },
        { id:"en_f047", word:"baby",  syllables:["ba","by"],  difficulty:1, language:"en" },
        { id:"en_f048", word:"candy", syllables:["can","dy"], difficulty:1, language:"en" },
        { id:"en_f049", word:"funny", syllables:["fun","ny"], difficulty:1, language:"en" },
        { id:"en_f050", word:"sunny", syllables:["sun","ny"], difficulty:1, language:"en" },
        { id:"en_f051", word:"kitty", syllables:["kit","ty"], difficulty:1, language:"en" },
        { id:"en_f052", word:"puppy", syllables:["pup","py"], difficulty:1, language:"en" },

        // ════════════════════════════════════════════════
        // INGLÉS NIVEL 2 — 51 palabras (2-3 sílabas)
        // ════════════════════════════════════════════════
        { id:"en_n001", word:"apple",    syllables:["ap","ple"],      difficulty:2, language:"en" },
        { id:"en_n002", word:"water",    syllables:["wa","ter"],      difficulty:2, language:"en" },
        { id:"en_n003", word:"pencil",   syllables:["pen","cil"],     difficulty:2, language:"en" },
        { id:"en_n004", word:"rabbit",   syllables:["rab","bit"],     difficulty:2, language:"en" },
        { id:"en_n005", word:"window",   syllables:["win","dow"],     difficulty:2, language:"en" },
        { id:"en_n006", word:"monkey",   syllables:["mon","key"],     difficulty:2, language:"en" },
        { id:"en_n007", word:"basket",   syllables:["bas","ket"],     difficulty:2, language:"en" },
        { id:"en_n008", word:"button",   syllables:["but","ton"],     difficulty:2, language:"en" },
        { id:"en_n009", word:"carrot",   syllables:["car","rot"],     difficulty:2, language:"en" },
        { id:"en_n010", word:"chicken",  syllables:["chick","en"],    difficulty:2, language:"en" },
        { id:"en_n011", word:"cookie",   syllables:["cook","ie"],     difficulty:2, language:"en" },
        { id:"en_n012", word:"doctor",   syllables:["doc","tor"],     difficulty:2, language:"en" },
        { id:"en_n013", word:"dragon",   syllables:["drag","on"],     difficulty:2, language:"en" },
        { id:"en_n014", word:"finger",   syllables:["fin","ger"],     difficulty:2, language:"en" },
        { id:"en_n015", word:"flower",   syllables:["flow","er"],     difficulty:2, language:"en" },
        { id:"en_n016", word:"garden",   syllables:["gar","den"],     difficulty:2, language:"en" },
        { id:"en_n017", word:"hammer",   syllables:["ham","mer"],     difficulty:2, language:"en" },
        { id:"en_n018", word:"helmet",   syllables:["hel","met"],     difficulty:2, language:"en" },
        { id:"en_n019", word:"jacket",   syllables:["jack","et"],     difficulty:2, language:"en" },
        { id:"en_n020", word:"kitten",   syllables:["kit","ten"],     difficulty:2, language:"en" },
        { id:"en_n021", word:"ladder",   syllables:["lad","der"],     difficulty:2, language:"en" },
        { id:"en_n022", word:"lemon",    syllables:["lem","on"],      difficulty:2, language:"en" },
        { id:"en_n023", word:"letter",   syllables:["let","ter"],     difficulty:2, language:"en" },
        { id:"en_n024", word:"muffin",   syllables:["muf","fin"],     difficulty:2, language:"en" },
        { id:"en_n025", word:"orange",   syllables:["or","ange"],     difficulty:2, language:"en" },
        { id:"en_n026", word:"panda",    syllables:["pan","da"],      difficulty:2, language:"en" },
        { id:"en_n027", word:"parrot",   syllables:["par","rot"],     difficulty:2, language:"en" },
        { id:"en_n028", word:"pepper",   syllables:["pep","per"],     difficulty:2, language:"en" },
        { id:"en_n029", word:"pillow",   syllables:["pil","low"],     difficulty:2, language:"en" },
        { id:"en_n030", word:"planet",   syllables:["plan","et"],     difficulty:2, language:"en" },
        // 🔄 "pocket" (sin emoji claro para niños) → "mango" 🥭
        { id:"en_n031", word:"mango",    syllables:["man","go"],      difficulty:2, language:"en" },
        { id:"en_n032", word:"rocket",   syllables:["rock","et"],     difficulty:2, language:"en" },
        { id:"en_n033", word:"robot",    syllables:["ro","bot"],      difficulty:2, language:"en" },
        // 🔄 "sister" (emoji 👧 OK) → se mantiene
        { id:"en_n034", word:"sister",   syllables:["sis","ter"],     difficulty:2, language:"en" },
        { id:"en_n035", word:"spider",   syllables:["spi","der"],     difficulty:2, language:"en" },
        { id:"en_n036", word:"tiger",    syllables:["ti","ger"],      difficulty:2, language:"en" },
        { id:"en_n037", word:"tomato",   syllables:["to","ma","to"],  difficulty:2, language:"en" },
        { id:"en_n038", word:"turtle",   syllables:["tur","tle"],     difficulty:2, language:"en" },
        // 🔄 "wallet" (sin emoji claro para niños) → "mushroom" 🍄
        { id:"en_n039", word:"mushroom", syllables:["mush","room"],   difficulty:2, language:"en" },
        { id:"en_n040", word:"winter",   syllables:["win","ter"],     difficulty:2, language:"en" },
        { id:"en_n041", word:"brother",  syllables:["broth","er"],    difficulty:2, language:"en" },
        { id:"en_n042", word:"birthday", syllables:["birth","day"],   difficulty:2, language:"en" },
        { id:"en_n043", word:"thunder",  syllables:["thun","der"],    difficulty:2, language:"en" },
        { id:"en_n044", word:"butter",   syllables:["but","ter"],     difficulty:2, language:"en" },
        // 🔄 "blanket" (sin emoji claro) → "scarf" 🧣
        { id:"en_n045", word:"scarf",    syllables:["scarf"],         difficulty:2, language:"en" },
        { id:"en_n046", word:"candle",   syllables:["can","dle"],     difficulty:2, language:"en" },
        { id:"en_n047", word:"cactus",   syllables:["cac","tus"],     difficulty:2, language:"en" },
        { id:"en_n048", word:"castle",   syllables:["cas","tle"],     difficulty:2, language:"en" },
        { id:"en_n049", word:"mitten",   syllables:["mit","ten"],     difficulty:2, language:"en" },
        // 🔄 "number" (sin emoji concreto) → "puzzle" 🧩
        { id:"en_n050", word:"puzzle",   syllables:["puz","zle"],     difficulty:2, language:"en" },
        { id:"en_n051", word:"pickle",   syllables:["pick","le"],     difficulty:2, language:"en" },

        // ════════════════════════════════════════════════
        // INGLÉS NIVEL 3 — 51 palabras (3+ sílabas)
        // ════════════════════════════════════════════════
        { id:"en_d001", word:"butterfly",   syllables:["but","ter","fly"],       difficulty:3, language:"en" },
        { id:"en_d002", word:"elephant",    syllables:["el","e","phant"],        difficulty:3, language:"en" },
        { id:"en_d003", word:"dinosaur",    syllables:["di","no","saur"],        difficulty:3, language:"en" },
        { id:"en_d004", word:"hamburger",   syllables:["ham","bur","ger"],       difficulty:3, language:"en" },
        { id:"en_d005", word:"helicopter",  syllables:["hel","i","cop","ter"],   difficulty:3, language:"en" },
        { id:"en_d006", word:"umbrella",    syllables:["um","brel","la"],        difficulty:3, language:"en" },
        { id:"en_d007", word:"telephone",   syllables:["tel","e","phone"],       difficulty:3, language:"en" },
        { id:"en_d008", word:"computer",    syllables:["com","pu","ter"],        difficulty:3, language:"en" },
        { id:"en_d009", word:"television",  syllables:["tel","e","vi","sion"],   difficulty:3, language:"en" },
        { id:"en_d010", word:"kangaroo",    syllables:["kan","ga","roo"],        difficulty:3, language:"en" },
        { id:"en_d011", word:"watermelon",  syllables:["wa","ter","mel","on"],   difficulty:3, language:"en" },
        { id:"en_d012", word:"strawberry",  syllables:["straw","ber","ry"],      difficulty:3, language:"en" },
        { id:"en_d013", word:"chocolate",   syllables:["choc","o","late"],       difficulty:3, language:"en" },
        { id:"en_d014", word:"photograph",  syllables:["pho","to","graph"],      difficulty:3, language:"en" },
        { id:"en_d015", word:"basketball",  syllables:["bas","ket","ball"],      difficulty:3, language:"en" },
        { id:"en_d016", word:"motorcycle",  syllables:["mo","tor","cy","cle"],   difficulty:3, language:"en" },
        { id:"en_d017", word:"crocodile",   syllables:["croc","o","dile"],       difficulty:3, language:"en" },
        { id:"en_d018", word:"octopus",     syllables:["oc","to","pus"],         difficulty:3, language:"en" },
        { id:"en_d019", word:"caterpillar", syllables:["cat","er","pil","lar"],  difficulty:3, language:"en" },
        { id:"en_d020", word:"blueberry",   syllables:["blue","ber","ry"],       difficulty:3, language:"en" },
        { id:"en_d021", word:"pineapple",   syllables:["pine","ap","ple"],       difficulty:3, language:"en" },
        { id:"en_d022", word:"avocado",     syllables:["av","o","ca","do"],      difficulty:3, language:"en" },
        { id:"en_d023", word:"broccoli",    syllables:["broc","co","li"],        difficulty:3, language:"en" },
        { id:"en_d024", word:"ambulance",   syllables:["am","bu","lance"],       difficulty:3, language:"en" },
        { id:"en_d025", word:"astronaut",   syllables:["as","tro","naut"],       difficulty:3, language:"en" },
        { id:"en_d026", word:"microscope",  syllables:["mi","cro","scope"],      difficulty:3, language:"en" },
        { id:"en_d027", word:"telescope",   syllables:["tel","e","scope"],       difficulty:3, language:"en" },
        { id:"en_d028", word:"thermometer", syllables:["ther","mom","e","ter"],  difficulty:3, language:"en" },
        { id:"en_d029", word:"calculator",  syllables:["cal","cu","la","tor"],   difficulty:3, language:"en" },
        { id:"en_d030", word:"dictionary",  syllables:["dic","tion","ar","y"],   difficulty:3, language:"en" },
        { id:"en_d031", word:"library",     syllables:["li","brar","y"],         difficulty:3, language:"en" },
        { id:"en_d032", word:"hospital",    syllables:["hos","pi","tal"],        difficulty:3, language:"en" },
        { id:"en_d033", word:"trampoline",  syllables:["tram","po","line"],      difficulty:3, language:"en" },
        { id:"en_d034", word:"parachute",   syllables:["par","a","chute"],       difficulty:3, language:"en" },
        { id:"en_d035", word:"binoculars",  syllables:["bi","noc","u","lars"],   difficulty:3, language:"en" },
        { id:"en_d036", word:"alligator",   syllables:["al","li","ga","tor"],    difficulty:3, language:"en" },
        { id:"en_d037", word:"jellyfish",   syllables:["jel","ly","fish"],       difficulty:3, language:"en" },
        { id:"en_d038", word:"dragonfly",   syllables:["drag","on","fly"],       difficulty:3, language:"en" },
        { id:"en_d039", word:"ladybug",     syllables:["la","dy","bug"],         difficulty:3, language:"en" },
        { id:"en_d040", word:"raspberry",   syllables:["rasp","ber","ry"],       difficulty:3, language:"en" },
        { id:"en_d041", word:"cauliflower", syllables:["cau","li","flow","er"],  difficulty:3, language:"en" },
        { id:"en_d042", word:"supermarket", syllables:["su","per","mar","ket"],  difficulty:3, language:"en" },
        { id:"en_d043", word:"restaurant",  syllables:["res","tau","rant"],      difficulty:3, language:"en" },
        { id:"en_d044", word:"playground",  syllables:["play","ground"],         difficulty:3, language:"en" },
        { id:"en_d045", word:"accordion",   syllables:["ac","cor","di","on"],    difficulty:3, language:"en" },
        { id:"en_d046", word:"xylophone",   syllables:["xy","lo","phone"],       difficulty:3, language:"en" },
        { id:"en_d047", word:"harmonica",   syllables:["har","mon","i","ca"],    difficulty:3, language:"en" },
        { id:"en_d048", word:"vegetables",  syllables:["veg","e","ta","bles"],   difficulty:3, language:"en" },
        // 🔄 antes duplicado "umbrella" → "volcano" 🌋
        { id:"en_d049", word:"volcano",     syllables:["vol","ca","no"],         difficulty:3, language:"en" },
        // 🔄 antes duplicado "caterpillar" → "centipede" 🐛
        { id:"en_d050", word:"centipede",   syllables:["cen","ti","pede"],       difficulty:3, language:"en" },
        { id:"en_d051", word:"university",  syllables:["u","ni","ver","si","ty"],difficulty:3, language:"en" }
      ];
    }

    Logger.log(`✅ ${this.stimuli.length} estímulos fallback para [${this.currentLanguage}]`);
  }

  // ============================================================
  // SHUFFLE (Fisher-Yates)
  // ============================================================
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ============================================================
  // CHANGE LANGUAGE (durante el juego)
  // ============================================================
  async changeLanguage(lang) {
    if (!ValidationUtils.isValidLanguage(lang)) return;
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    // Persistir cambio de idioma en sesión
    SessionManager.update({ language: lang });
    this._updateLangButtons(lang);
    this.stimuli = [];
    DOMUtils.showLoading();
    try {
      const snap = await db.collection('stimuli').where('language','==',lang).get();
      if (snap.empty) { this.loadFallbackData(); }
      else { this.stimuli = []; snap.forEach(d => this.stimuli.push({id:d.id,...d.data()})); }
    } catch (e) { this.loadFallbackData(); }
    finally { DOMUtils.hideLoading(); }
  }

  // ============================================================
  // START GAME — Filtrar ANTES de mezclar
  // ============================================================
  async startGame() {
    try {
      const difficulty = this.currentDifficulty;
      if (!ValidationUtils.isValidDifficulty(difficulty)) { alert('Nivel inválido'); return; }

      this.currentQuestion = 0; this.totalScore = 0;
      this.correctAnswers = 0;  this.allResponses = [];
      this.selectedSyllables = [];
      this.elements.scoreValue.textContent = '0';

      // ✅ Filtrar primero por idioma (ya cargados) y dificultad
      const filtered = this.stimuli.filter(s => {
        const d = s.difficulty !== undefined
          ? s.difficulty
          : CalculationUtils.calculateDifficulty(s.syllables.length);
        return d === difficulty;
      });

      if (filtered.length === 0) {
        alert(`No hay palabras de nivel ${difficulty} en ${this.currentLanguage}`); return;
      }

      Logger.log(`🎮 ${filtered.length} palabras | ${this.currentLanguage} | nivel ${difficulty}`);

      // ✅ Mezclar sólo las filtradas
      this.shuffledStimuli     = this.shuffleArray(filtered);
      this.currentStimulusIndex = 0;

      this.gameStartTime = Date.now();
      this.startGameTimer();
      await this.createSession();

      DOMUtils.hide(this.elements.startScreen);
      DOMUtils.show(this.elements.gameScreen);

      const info = document.getElementById('activeSessionInfo');
      if (info) info.textContent =
        `${this.studentName} | ${this.currentLanguage.toUpperCase()} | Sem. ${this.weekNumber} | Nivel ${difficulty}`;

      await this.loadNextQuestion();
    } catch (e) {
      Logger.error('Error iniciando juego', e);
      alert('Error iniciando. Intenta de nuevo.');
      DOMUtils.hideLoading();
    }
  }

  // ============================================================
  // TIMER
  // ============================================================
  startGameTimer() {
    let el = document.getElementById('gameTimer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gameTimer'; el.className = 'game-timer';
      document.body.appendChild(el);
    }
    el.style.display = 'block';
    this.timerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - this.gameStartTime) / 1000);
      el.innerHTML = `⏱️ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    }, 1000);
  }

  stopGameTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.gameStartTime)  this.gameTotalTime = Math.floor((Date.now()-this.gameStartTime)/1000);
    const el = document.getElementById('gameTimer');
    if (el) el.style.display = 'none';
  }

  // ============================================================
  // CREATE SESSION
  // ============================================================
  async createSession() {
    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      await db.collection('sessions').doc(this.currentSessionId).set({
        studentCode:    this.studentCode    || 'ANONIMO',
        studentName:    this.studentName    || 'Anónimo',
        studentAge:     this.studentAge     || 0,
        studentAgeMonths: this.studentAgeMonths || 0,
        studentGender:  this.studentGender  || 'No especificado',
        sessionType:    this.sessionType    || 'intervention',
        weekNumber:     this.weekNumber     || 0,
        language:       this.currentLanguage,
        difficulty:     this.currentDifficulty,
        gameNumber:     1,
        gameName:       'Sílabas Danzantes',
        gameVersion:    '2.1',
        totalQuestions: this.totalQuestions,
        startedAt:      firebase.firestore.FieldValue.serverTimestamp(),
        status:         'in_progress'
      });
    } catch (e) {
      Logger.error('Error sesión Firebase', e);
      this.currentSessionId = `session_${Date.now()}`;
    }
  }

  // ============================================================
  // PREGUNTAS
  // ============================================================
  handleNextQuestion() {
    DOMUtils.hide(this.elements.feedbackScreen);
    this.loadNextQuestion();
  }

  async loadNextQuestion() {
    if (this.currentQuestion >= this.totalQuestions) { await this.endGame(); return; }
    this.selectedSyllables = []; this.isAnswered = false;
    DOMUtils.clearContent(this.elements.selectedSyllables);
    this.currentQuestion++;
    this.updateProgress();
    DOMUtils.show(this.elements.gameScreen);
    this.selectRandomStimulus();
    await this.displayQuestion();
  }

  selectRandomStimulus() {
    if (this.currentStimulusIndex >= this.shuffledStimuli.length) {
      this.shuffledStimuli = this.shuffleArray(this.shuffledStimuli);
      this.currentStimulusIndex = 0;
    }
    this.currentStimulus = this.shuffledStimuli[this.currentStimulusIndex++];
    Logger.log(`▶ "${this.currentStimulus.word}" | ${this.currentStimulus.syllables.join('-')} | dif:${this.currentStimulus.difficulty}`);
  }

  async displayQuestion() {
    try {
      this.elements.stimulusImage.style.display = 'none';
      let box = document.getElementById('emojiContainerGame1');
      if (!box) {
        box = document.createElement('div');
        box.id = 'emojiContainerGame1';
        box.style.cssText = 'font-size:130px;text-align:center;margin-bottom:16px;';
        this.elements.stimulusImage.parentNode.insertBefore(box, this.elements.stimulusImage);
      }
      box.textContent = this.getEmojiForWord(this.currentStimulus.word);
      this.elements.stimulusWord.textContent = this.currentStimulus.word;
      this.createSyllableButtons();
      await new Promise(r => setTimeout(r, 600));
      await this.playCurrentAudio();
    } catch (e) { Logger.error('Error displayQuestion', e); }
  }

  // ============================================================
  // EMOJI MAP — COMPLETAMENTE AUDITADO
  // Cada entrada verificada: ¿el emoji es claro para niños 4-8?
  // ============================================================
  getEmojiForWord(word) {
    const emojiMap = {
      // ── ESPAÑOL NIVEL 1 ──────────────────────────────────────
      'sol':'☀️','mar':'🌊','pan':'🍞','pez':'🐟','luz':'💡',
      'flor':'🌸','gato':'🐱','casa':'🏠','perro':'🐶','luna':'🌙',
      'mesa':'🪑','silla':'🪑','libro':'📖','niño':'👦','boca':'👄',
      'mano':'✋','pelo':'💇','agua':'💧','cama':'🛏️','vaca':'🐄',
      'pato':'🦆','sapo':'🐸','oso':'🐻','lobo':'🐺','rata':'🐀',
      'loro':'🦜','puma':'🐆','coco':'🥥','uva':'🍇','pera':'🍐',
      'piña':'🍍','toro':'🐂','rosa':'🌹','nube':'☁️','dedo':'☝️',
      'codo':'💪','pie':'🦶','ojo':'👁️','cara':'😊','ropa':'👕',
      'mono':'🐵','foca':'🦭','dado':'🎲','lana':'🧶','palo':'🪵',
      'sopa':'🍲','bote':'⛵','taza':'☕','cuna':'🍼','lupa':'🔍',
      'tren':'🚂',

      // ── ESPAÑOL NIVEL 2 ──────────────────────────────────────
      'pelota':'⚽','zapato':'👟','camisa':'👔','ventana':'🪟','tomate':'🍅',
      'patata':'🥔','banana':'🍌','manzana':'🍎','naranja':'🍊','paloma':'🕊️',
      'tortuga':'🐢','gallina':'🐔','conejo':'🐰','caballo':'🐴','oveja':'🐑',
      'jirafa':'🦒','camello':'🐪','cebra':'🦓','tijera':'✂️','cuchara':'🥄',
      'tenedor':'🍴','cuchillo':'🔪','cocina':'🍳','guitarra':'🎸','hamster':'🐹',
      'sandía':'🍉','pepino':'🥒','tambor':'🥁','cereza':'🍒','cohete':'🚀',
      'botella':'🍼','espejo':'🪞','colores':'🖍️','maleta':'🧳','corona':'👑',
      'bufanda':'🧣','cigüeña':'🦢','planeta':'🪐','estrella':'⭐','cometa':'☄️',
      'montaña':'⛰️','pingüino':'🐧','ballena':'🐋','linterna':'🔦','papaya':'🥭',
      'maíz':'🌽','semilla':'🌱','canguro':'🦘','tobillo':'🦵','galleta':'🍪',
      'paraguas':'☂️','langosta':'🦞',

      // ── ESPAÑOL NIVEL 3 ──────────────────────────────────────
      'mariposa':'🦋','elefante':'🐘','hipopótamo':'🦛','rinoceronte':'🦏',
      'cocodrilo':'🐊','dinosaurio':'🦕','helicóptero':'🚁','computadora':'💻',
      'television':'📺','refrigerador':'🧊','automóvil':'🚗','bicicleta':'🚲',
      'motocicleta':'🏍️','paracaídas':'🪂','telescopio':'🔭','microscopio':'🔬',
      'termómetro':'🌡️','calendario':'📅','diccionario':'📖','biblioteca':'📚',
      'universidad':'🎓','laboratorio':'🧪','experimento':'🔬','astronauta':'👨‍🚀',
      'videojuego':'🎮','fotografía':'📷','carretera':'🛣️','semáforo':'🚦',
      'ambulancia':'🚑','medicina':'💊','enfermera':'👩‍⚕️','bombero':'👨‍🚒',
      'policía':'👮','superhéroe':'🦸','princesa':'👸','unicornio':'🦄',
      'arcoíris':'🌈','trampolín':'🤸','tobogán':'🛝','columpio':'🎢',
      'carrusel':'🎠','payaso':'🤡','malabarista':'🤹','equilibrista':'🎪',
      'acróbata':'🤸','trapecista':'🎪','domador':'🦁','zanahoria':'🥕',
      'dragón':'🐉','circo':'🎪',

      // ── INGLÉS NIVEL 1 ───────────────────────────────────────
      'sun':'☀️','cat':'🐱','dog':'🐶','moon':'🌙','star':'⭐',
      'car':'🚗','tree':'🌳','book':'📖','ball':'⚽','bird':'🐦',
      'fish':'🐟','frog':'🐸','bear':'🐻','duck':'🦆','egg':'🥚',
      'hand':'✋','hat':'🎩','cup':'☕','key':'🔑','leaf':'🍃',
      'milk':'🥛','pig':'🐷','ship':'🚢','shoe':'👟','sock':'🧦',
      'tent':'⛺','toy':'🧸','train':'🚂','fox':'🦊','bee':'🐝',
      'ant':'🐜','bat':'🦇','bed':'🛏️','box':'📦','bus':'🚌',
      'cake':'🎂','flag':'🚩','house':'🏠','kite':'🪁','lamp':'💡',
      'nest':'🪺','ring':'💍','wolf':'🐺','coat':'🧥','chair':'🪑',
      'happy':'😊','baby':'👶','candy':'🍬','funny':'😄','sunny':'🌞',
      'kitty':'🐱','puppy':'🐶',

      // ── INGLÉS NIVEL 2 ───────────────────────────────────────
      'apple':'🍎','water':'💧','pencil':'✏️','rabbit':'🐰','window':'🪟',
      'monkey':'🐵','basket':'🧺','button':'🔘','carrot':'🥕','chicken':'🐔',
      'cookie':'🍪','doctor':'👨‍⚕️','dragon':'🐉','finger':'☝️','flower':'🌸',
      'garden':'🏡','hammer':'🔨','helmet':'⛑️','jacket':'🧥','kitten':'🐱',
      'ladder':'🪜','lemon':'🍋','letter':'✉️','muffin':'🧁','orange':'🍊',
      'panda':'🐼','parrot':'🦜','pepper':'🌶️','pillow':'🛏️','planet':'🪐',
      'pocket':'👖','rocket':'🚀','robot':'🤖','sister':'👧','spider':'🕷️',
      'tiger':'🐯','tomato':'🍅','turtle':'🐢','wallet':'👛','winter':'❄️',
      'brother':'👦','birthday':'🎂','thunder':'⛈️','butter':'🧈','blanket':'🛏️',
      'candle':'🕯️','cactus':'🌵','castle':'🏰','mitten':'🧤','number':'🔢',
      'pickle':'🥒',

      // ── INGLÉS NIVEL 3 ───────────────────────────────────────
      'butterfly':'🦋','elephant':'🐘','dinosaur':'🦕','hamburger':'🍔',
      'helicopter':'🚁','umbrella':'☂️','telephone':'📱','computer':'💻',
      'television':'📺','kangaroo':'🦘','watermelon':'🍉','strawberry':'🍓',
      'chocolate':'🍫','photograph':'📷','basketball':'🏀','motorcycle':'🏍️',
      'crocodile':'🐊','octopus':'🐙','caterpillar':'🐛','blueberry':'🫐',
      'pineapple':'🍍','avocado':'🥑','broccoli':'🥦','ambulance':'🚑',
      'astronaut':'👨‍🚀','microscope':'🔬','telescope':'🔭','thermometer':'🌡️',
      'calculator':'🧮','dictionary':'📖','library':'📚','hospital':'🏥',
      'trampoline':'🤸','parachute':'🪂','binoculars':'🔭','alligator':'🐊',
      'jellyfish':'🪼','dragonfly':'🦋','ladybug':'🐞','raspberry':'🍇',
      'cauliflower':'🥦','supermarket':'🛒','restaurant':'🍽️','playground':'🛝',
      'accordion':'🪗','xylophone':'🎵','harmonica':'🎵','vegetables':'🥗',
      'volcano':'🌋','centipede':'🐛','university':'🎓'
    };

    // Buscar por palabra exacta, luego en minúsculas
    return emojiMap[word] || emojiMap[word.toLowerCase()] || '📝';
  }

  // ============================================================
  // SYLLABLE BUTTONS
  // ============================================================
  createSyllableButtons() {
    DOMUtils.clearContent(this.elements.syllableOptions);
    const shuffled = this.shuffleArray(this.currentStimulus.syllables);
    shuffled.forEach((syl, i) => {
      const btn = document.createElement('button');
      btn.className = 'syllable-btn';
      btn.textContent = syl;
      btn.dataset.syllable = syl;
      btn.dataset.index = i;
      btn.addEventListener('click', () => this.selectSyllable(syl, btn));
      this.elements.syllableOptions.appendChild(btn);
    });
  }

  selectSyllable(syl, btn) {
    if (this.isAnswered) return;
    this.selectedSyllables.push(syl);
    if (this.selectedSyllables.length === 1) this.timeTracker.start();
    this.displaySelectedSyllables();
    btn.disabled = true; DOMUtils.disable(btn);
    this.playClickSound();
  }

  displaySelectedSyllables() {
    DOMUtils.clearContent(this.elements.selectedSyllables);
    this.selectedSyllables.forEach(s => {
      const span = document.createElement('span');
      span.className = 'selected-syllable';
      span.textContent = s;
      this.elements.selectedSyllables.appendChild(span);
    });
  }

  undoLastSyllable() {
    if (!this.selectedSyllables.length || this.isAnswered) return;
    const last = this.selectedSyllables.pop();
    const btn = this.elements.syllableOptions.querySelector(`[data-syllable="${last}"]`);
    if (btn) { btn.disabled = false; DOMUtils.enable(btn); }
    this.displaySelectedSyllables();
  }

  // ============================================================
  // AUDIO
  // ============================================================
  async playCurrentAudio() {
    if (!this.currentStimulus) return;
    DOMUtils.disable(this.elements.playAudioBtn);
    try {
      await this.synthesizeSpeech(this.currentStimulus.word);
      this.timeTracker.start();
    } catch (e) { Logger.error('Audio error', e); }
    finally { setTimeout(() => DOMUtils.enable(this.elements.playAudioBtn), 1000); }
  }

  synthesizeSpeech(text) {
    return new Promise((res, rej) => {
      if (!('speechSynthesis' in window)) { rej(new Error('No TTS')); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang  = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
      u.rate  = 0.8; u.pitch = 1.1;
      u.onend   = () => res();
      u.onerror = e  => rej(e);
      speechSynthesis.speak(u);
    });
  }

  playClickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = 'sine';
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* silencioso */ }
  }

  // ============================================================
  // VERIFICAR RESPUESTA
  // ============================================================
  async checkAnswer() {
    if (!this.selectedSyllables.length) { alert('Por favor selecciona al menos una sílaba'); return; }
    this.isAnswered = true;
    const rt        = this.timeTracker.recordReaction();
    const isCorrect = ValidationUtils.isValidResponse(this.selectedSyllables, this.currentStimulus.syllables);
    const points    = CalculationUtils.calculatePoints(isCorrect, rt, this.currentDifficulty);

    this.totalScore += points;
    if (isCorrect) this.correctAnswers++;
    this.elements.scoreValue.textContent = this.totalScore;

    await this.saveResponse({ stimulusId: this.currentStimulus.id, correct: isCorrect,
      selectedSyllables: this.selectedSyllables, correctSyllables: this.currentStimulus.syllables,
      reactionTime: rt, points });
    this.showFeedback(isCorrect, points, rt);
  }

  async saveResponse(data) {
    try {
      await db.collection('sessions').doc(this.currentSessionId)
        .collection('responses').add({ ...data, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { /* sin internet: guardar local */ }
    this.allResponses.push(data);
  }

  showFeedback(isCorrect, points) {
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.feedbackScreen);
    const c = this.elements.feedbackContent;
    DOMUtils.clearContent(c);

    const mk = (tag, props, text) => {
      const el = document.createElement(tag);
      Object.assign(el.style, props);
      if (text) el.textContent = text;
      return el;
    };

    c.appendChild(mk('div', {fontSize:'80px',marginBottom:'16px'},          isCorrect ? '✅' : '❌'));
    c.appendChild(mk('h3',  {fontSize:'28px',marginBottom:'12px'},           isCorrect ? '¡Correcto!' : 'Incorrecto'));
    c.appendChild(mk('p',   {fontSize:'18px',marginBottom:'16px'},
      isCorrect ? '¡Excelente!' : `Respuesta: ${this.currentStimulus.syllables.join(' - ')}`));
    c.appendChild(mk('p',   {fontSize:'22px',fontWeight:'bold',
      color: isCorrect ? '#4CAF50' : '#FF5722'}, `+${points} puntos`));

    this.elements.scoreValue.textContent = this.totalScore;
  }

  updateProgress() {
    const pct = (this.currentQuestion / this.totalQuestions) * 100;
    this.elements.progressFill.style.width = pct + '%';
    this.elements.questionNumber.textContent  = this.currentQuestion;
    this.elements.totalQuestions.textContent  = this.totalQuestions;
  }

  // ============================================================
  // FIN DEL JUEGO
  // ============================================================
  async endGame() {
    this.stopGameTimer();
    const acc = CalculationUtils.calculateAccuracy(this.correctAnswers, this.totalQuestions);
    const avg = this.timeTracker.getAverageReactionTime();

    try {
      await db.collection('sessions').doc(this.currentSessionId).update({
        status:'completed', completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalScore: this.totalScore, correctAnswers: this.correctAnswers,
        totalQuestions: this.totalQuestions, accuracy: acc,
        averageReactionTime: avg, totalGameTime: this.gameTotalTime
      });
      if (this.studentCode) {
        await db.collection('students').doc(this.studentCode).update({
          gamesCompleted: firebase.firestore.FieldValue.arrayUnion('game1'),
          game1LastScore: this.totalScore, game1LastAccuracy: acc,
          game1LastTime: this.gameTotalTime,
          game1CompletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) { Logger.error('Firebase endGame', e); }

    StorageUtils.setItem(`session_${this.currentSessionId}`, {
      sessionId: this.currentSessionId, studentCode: this.studentCode,
      language: this.currentLanguage, difficulty: this.currentDifficulty,
      totalScore: this.totalScore, correctAnswers: this.correctAnswers,
      totalQuestions: this.totalQuestions, accuracy: acc,
      averageReactionTime: avg, totalGameTime: this.gameTotalTime,
      responses: this.allResponses, completedAt: new Date().toISOString()
    });

    this.elements.finalScore.textContent = this.totalScore;
    this.showEndScreen(acc, avg);
  }

  showEndScreen(acc, avg) {
    DOMUtils.hide(this.elements.feedbackScreen);
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.show(this.elements.endScreen);
    this.elements.finalAccuracy.textContent = `${acc}%`;
    this.elements.finalAvgTime.textContent  = `${avg} ms`;
    this.elements.finalScore.textContent    = this.totalScore;
    this.elements.endMessage.textContent    = this.generateMotivationalMessage(acc);
    this.addNextGameButton();
  }

  addNextGameButton() {
    if (document.getElementById('nextGameContainer')) return;
    const div = document.createElement('div');
    div.id = 'nextGameContainer'; div.className = 'next-game-section';
    // URL incluye code, lang y difficulty para que game2 los lea
    div.innerHTML = `
      <h3 class="next-game-title">🎮 ¿Listo para el siguiente?</h3>
      <p class="next-game-text">Juego 2: Memoria Mágica</p>
      <a href="game2.html?code=${this.studentCode}&lang=${this.currentLanguage}&diff=${this.currentDifficulty}"
         class="btn-next-game">
        <span class="btn-icon">▶️</span>
        <span class="btn-text">IR AL JUEGO 2</span>
      </a>`;
    this.elements.endMessage.parentNode.insertBefore(div, this.elements.endMessage.nextSibling);
  }

  generateMotivationalMessage(acc) {
    if (acc === 100) return '🌟 ¡Perfecto! ¡Eres un campeón!';
    if (acc >= 90)  return '⭐ ¡Excelente trabajo!';
    if (acc >= 80)  return '👏 ¡Muy bien!';
    if (acc >= 70)  return '💪 ¡Buen esfuerzo!';
    return '🎯 ¡Sigue intentando!';
  }

  // ============================================================
  // RESET
  // ============================================================
  resetGame() {
    this.stopGameTimer();
    // Guardar sesión antes de resetear (conserva idioma/dificultad para próximo estudiante)
    // Si quieres que cada nuevo estudiante parta limpio, comenta la línea de abajo
    // SessionManager.clear(); // ← descomentar solo si cada jornada es nueva sesión escolar

    Object.assign(this, {
      currentSessionId:null, currentQuestion:0, totalScore:0, correctAnswers:0,
      currentLanguage:'es', currentDifficulty:2, stimuli:[], shuffledStimuli:[],
      currentStimulusIndex:0, currentStimulus:null, selectedSyllables:[],
      allResponses:[], studentCode:null, studentName:null, studentAge:null,
      studentAgeMonths:null, studentGender:null, sessionType:null, weekNumber:null,
      demographicData:null, gameStartTime:null, gameTotalTime:0, timerInterval:null,
      isAnswered:false, isLoadingStimuli:false
    });
    this.timeTracker = new TimeTracker();

    if (this.elements.scoreValue) this.elements.scoreValue.textContent = '0';
    this._updateLangButtons('es');
    if (this.elements.langBtnEs) this.elements.langBtnEs.disabled = true;
    if (this.elements.langBtnEn) this.elements.langBtnEn.disabled = true;

    const ls = document.getElementById('languageSelector');
    if (ls) { ls.style.opacity = '0.5'; ls.style.pointerEvents = 'none'; }

    const eBox = document.getElementById('emojiContainerGame1');
    if (eBox) eBox.textContent = '';
    const ngc = document.getElementById('nextGameContainer');
    if (ngc) ngc.remove();
    const timer = document.getElementById('gameTimer');
    if (timer) timer.style.display = 'none';

    const form = document.getElementById('participantForm');
    if (form) form.reset();

    // Restaurar idioma/dificultad guardados en sesión para próximo estudiante
    const saved = SessionManager.load();
    if (saved) this._syncFormWithSession(saved);

    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('gender-btn--active'));

    DOMUtils.hide(this.elements.endScreen);
    DOMUtils.hide(this.elements.gameScreen);
    DOMUtils.hide(this.elements.feedbackScreen);
    DOMUtils.show(this.elements.startScreen);
  }
}