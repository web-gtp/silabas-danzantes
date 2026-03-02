// frontend/js/admin.js
// Panel de Administración - Exportación de Datos para SPSS

// =============================================
// CONFIGURACIÓN
// =============================================

const ADMIN_PASSWORD = 'BIU2026'; // 🔑 Contraseña de acceso

// =============================================
// CLASE PRINCIPAL
// =============================================

class AdminPanel {
  constructor() {
    this.isAuthenticated = false;
    this.allStudents = [];
    this.allSessions = [];
    this.filteredData = [];
    this.elements = {};
  }

  async init() {
    console.log('🔒 Inicializando Panel de Administración...');
    
    try {
      this.cacheElements();
      this.setupEventListeners();
      this.checkAuthentication();
      
      // Asegurarse de que el spinner esté oculto al inicio
      this.hideLoading();
      
      console.log('✅ Panel de administración inicializado');
    } catch (error) {
      console.error('❌ Error inicializando panel:', error);
      this.hideLoading();
    }
  }

  cacheElements() {
    this.elements = {
      // Login
      loginScreen: document.getElementById('loginScreen'),
      loginForm: document.getElementById('loginForm'),
      adminPassword: document.getElementById('adminPassword'),
      loginError: document.getElementById('loginError'),
      
      // Panel
      adminPanel: document.getElementById('adminPanel'),
      btnLogout: document.getElementById('btnLogout'),
      
      // Estadísticas
      totalStudents: document.getElementById('totalStudents'),
      totalSessions: document.getElementById('totalSessions'),
      completedAll: document.getElementById('completedAll'),
      lastUpdate: document.getElementById('lastUpdate'),
      
      // Exportación
      btnExportAll: document.getElementById('btnExportAll'),
      btnExportGame1: document.getElementById('btnExportGame1'),
      btnExportGame2: document.getElementById('btnExportGame2'),
      btnExportGame3: document.getElementById('btnExportGame3'),
      btnExportGame4: document.getElementById('btnExportGame4'),
      btnExportResponses: document.getElementById('btnExportResponses'),
      btnExportDemo: document.getElementById('btnExportDemo'),
      
      // Vista Previa
      btnLoadPreview: document.getElementById('btnLoadPreview'),
      previewStatus: document.getElementById('previewStatus'),
      previewTable: document.getElementById('previewTable'),
      
      // Filtros
      filterDateFrom: document.getElementById('filterDateFrom'),
      filterDateTo: document.getElementById('filterDateTo'),
      filterLanguage: document.getElementById('filterLanguage'),
      filterCompleted: document.getElementById('filterCompleted'),
      btnApplyFilters: document.getElementById('btnApplyFilters'),
      btnClearFilters: document.getElementById('btnClearFilters'),
      
      // Loading
      loadingSpinner: document.getElementById('loadingSpinner'),
      
      // DIBELS
      dibelsStudentSelect: document.getElementById('dibelsStudentSelect'),
      btnDibelsInfo: document.getElementById('btnDibelsInfo'),
      dibelsModal: document.getElementById('dibelsModal'),
      btnCloseDibelsModal: document.getElementById('btnCloseDibelsModal'),
      btnSaveDibels: document.getElementById('btnSaveDibels'),
      dibelsSaveStatus: document.getElementById('dibelsSaveStatus')
    };
  }

  setupEventListeners() {
    // Login
    this.elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    // Logout
    this.elements.btnLogout.addEventListener('click', () => this.handleLogout());
    
    // Exportación
    this.elements.btnExportAll.addEventListener('click', () => this.exportAllData());
    this.elements.btnExportGame1.addEventListener('click', () => this.exportGameData(1));
    this.elements.btnExportGame2.addEventListener('click', () => this.exportGameData(2));
    this.elements.btnExportGame3.addEventListener('click', () => this.exportGameData(3));
    this.elements.btnExportGame4.addEventListener('click', () => this.exportGameData(4));
    this.elements.btnExportResponses.addEventListener('click', () => this.exportResponsesData());
    this.elements.btnExportDemo.addEventListener('click', () => this.exportDemographicData());
    
    // Vista Previa
    this.elements.btnLoadPreview.addEventListener('click', () => this.loadPreview());
    
    // Filtros
    this.elements.btnApplyFilters.addEventListener('click', () => this.applyFilters());
    this.elements.btnClearFilters.addEventListener('click', () => this.clearFilters());
    
    // DIBELS
    if (this.elements.btnDibelsInfo) {
      this.elements.btnDibelsInfo.addEventListener('click', () => {
        if (this.elements.dibelsModal) this.elements.dibelsModal.hidden = false;
      });
    }
    if (this.elements.btnCloseDibelsModal) {
      this.elements.btnCloseDibelsModal.addEventListener('click', () => {
        if (this.elements.dibelsModal) this.elements.dibelsModal.hidden = true;
      });
    }
    if (this.elements.dibelsModal) {
      this.elements.dibelsModal.addEventListener('click', (e) => {
        if (e.target === this.elements.dibelsModal) this.elements.dibelsModal.hidden = true;
      });
    }
    if (this.elements.dibelsStudentSelect) {
      this.elements.dibelsStudentSelect.addEventListener('change', (e) => this.loadDibelsForStudent(e.target.value));
    }
    if (this.elements.btnSaveDibels) {
      this.elements.btnSaveDibels.addEventListener('click', () => this.saveDibels());
    }
  }

  checkAuthentication() {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'authenticated') {
      this.isAuthenticated = true;
      this.showPanel();
    }
  }

  handleLogin() {
    const password = this.elements.adminPassword.value.trim();
    
    if (password === ADMIN_PASSWORD) {
      this.isAuthenticated = true;
      sessionStorage.setItem('adminAuth', 'authenticated');
      this.elements.loginError.hidden = true;
      this.showPanel();
    } else {
      this.elements.loginError.hidden = false;
      this.elements.adminPassword.value = '';
      this.elements.adminPassword.focus();
    }
  }

  handleLogout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('adminAuth');
    this.elements.adminPanel.hidden = true;
    this.elements.loginScreen.style.display = 'flex';
    this.elements.adminPassword.value = '';
  }

  async showPanel() {
    this.elements.loginScreen.style.display = 'none';
    this.elements.adminPanel.hidden = false;
    
    // Cargar datos
    try {
      await this.loadData();
      this.updateStats();
      this.populateDibelsStudentDropdown();
    } catch (error) {
      console.error('❌ Error en showPanel:', error);
      alert('Error cargando datos del panel');
    }
  }

  // =============================================
  // CARGA DE DATOS DESDE FIREBASE
  // =============================================

  async loadData() {
    console.log('📥 Cargando datos desde Firebase...');
    
    try {
      // Cargar estudiantes
      const studentsSnapshot = await db.collection('students').get();
      this.allStudents = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cargar TODAS las sesiones (necesario para análisis completo)
      const sessionsSnapshot = await db.collection('sessions').get();
      this.allSessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cargar respuestas para TODAS las sesiones
      // (necesario para análisis item-level en SPSS)
      for (let session of this.allSessions) {
        try {
          const responsesSnapshot = await db.collection('sessions')
            .doc(session.id)
            .collection('responses')
            .get();
          
          session.responses = responsesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (err) {
          console.warn(`⚠️ Error cargando respuestas de sesión ${session.id}:`, err);
          session.responses = [];
        }
      }
      
      console.log(`✅ Datos cargados: ${this.allStudents.length} estudiantes, ${this.allSessions.length} sesiones`);
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      alert('Error cargando datos de Firebase.\n\nDetalles: ' + error.message);
      throw error;
    }
  }

  updateStats() {
    try {
      // Total estudiantes
      this.elements.totalStudents.textContent = this.allStudents.length;
      
      // Total sesiones
      this.elements.totalSessions.textContent = this.allSessions.length;
      
      // Completaron los 4 juegos
      const completedAll = this.allStudents.filter(s => s.allGamesCompleted === true).length;
      this.elements.completedAll.textContent = completedAll;
      
      // Última actualización
      const now = new Date();
      this.elements.lastUpdate.textContent = now.toLocaleString('es-ES');
      
      console.log('✅ Estadísticas actualizadas');
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  // =============================================
  // DIBELS: Cargar, guardar y gestionar datos
  // =============================================

  populateDibelsStudentDropdown() {
    const sel = this.elements.dibelsStudentSelect;
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>';
    for (const s of this.allStudents) {
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = `${s.code} - ${s.name || 'Sin nombre'}`;
      sel.appendChild(opt);
    }
  }

  async loadDibelsForStudent(code) {
    if (!code) return;
    const subtests = ['lnf', 'fsf', 'psf', 'nwf_cls', 'nwf_wrc', 'orf'];
    const phases = ['pre', 'post'];

    // Buscar datos existentes en el student doc
    try {
      const doc = await db.collection('students').doc(code).get();
      const data = doc.exists ? doc.data() : {};
      const dibels = data.dibels || {};

      for (const phase of phases) {
        for (const sub of subtests) {
          const input = document.getElementById(`dibels_${phase}_${sub}`);
          if (input) input.value = dibels[`${phase}_${sub}`] ?? '';
        }
      }
    } catch (e) {
      console.error('Error cargando DIBELS:', e);
    }
  }

  async saveDibels() {
    const code = this.elements.dibelsStudentSelect?.value;
    if (!code) { alert('Selecciona un estudiante primero'); return; }

    const subtests = ['lnf', 'fsf', 'psf', 'nwf_cls', 'nwf_wrc', 'orf'];
    const phases = ['pre', 'post'];
    const dibels = {};

    for (const phase of phases) {
      for (const sub of subtests) {
        const input = document.getElementById(`dibels_${phase}_${sub}`);
        const val = input ? parseFloat(input.value) : null;
        if (val !== null && !isNaN(val)) dibels[`${phase}_${sub}`] = val;
      }
    }

    try {
      await db.collection('students').doc(code).update({ dibels });

      // Actualizar en memoria también
      const student = this.allStudents.find(s => s.code === code);
      if (student) student.dibels = dibels;

      if (this.elements.dibelsSaveStatus) {
        this.elements.dibelsSaveStatus.className = 'save-status success';
        this.elements.dibelsSaveStatus.textContent = '✅ Guardado correctamente';
        setTimeout(() => { this.elements.dibelsSaveStatus.textContent = ''; }, 3000);
      }
    } catch (e) {
      console.error('Error guardando DIBELS:', e);
      if (this.elements.dibelsSaveStatus) {
        this.elements.dibelsSaveStatus.className = 'save-status error';
        this.elements.dibelsSaveStatus.textContent = '❌ Error al guardar';
      }
    }
  }

  // =============================================
  // EXPORTACIÓN: DATOS COMPLETOS
  // =============================================

  async exportAllData() {
    this.showLoading();
    
    try {
      console.log('📊 Generando archivo Excel completo para SPSS...');
      
      // Preparar datos
      const data = this.prepareCompleteData();
      
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Datos Completos (una fila por estudiante - formato SPSS wide)
      const ws1 = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws1, 'Datos_Completos');
      
      // Hoja 2: Diccionario de Variables (para configurar SPSS)
      const ws2 = XLSX.utils.json_to_sheet(this.getVariablesDictionary());
      XLSX.utils.book_append_sheet(wb, ws2, 'Diccionario');
      
      // Hoja 3: Estadísticas Descriptivas (verificación previa)
      const ws3 = XLSX.utils.json_to_sheet(this.calculateDescriptiveStats(data));
      XLSX.utils.book_append_sheet(wb, ws3, 'Estadisticas');
      
      // Hoja 4: Crecimiento por Sesión (formato long - para análisis de curva de crecimiento)
      const growthData = this.prepareGrowthData();
      if (growthData.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(growthData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Crecimiento_Sesion');
      }
      
      // Hoja 5: Respuestas Individuales (item-level data)
      const itemData = this.prepareItemLevelData();
      if (itemData.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(itemData);
        XLSX.utils.book_append_sheet(wb, ws5, 'Respuestas_Items');
      }
      
      // Hoja 6: Instrucciones SPSS
      const ws6 = XLSX.utils.json_to_sheet(this.getSPSSInstructions());
      XLSX.utils.book_append_sheet(wb, ws6, 'Instrucciones_SPSS');
      
      // Descargar
      const fileName = `Silabas_Danzantes_SPSS_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Archivo generado: ${fileName}`);
      alert(`✅ Archivo descargado: ${fileName}\n\n` +
        `Hojas incluidas:\n` +
        `1. Datos_Completos - Pegar en SPSS (una fila por estudiante)\n` +
        `2. Diccionario - Configurar variables en SPSS\n` +
        `3. Estadisticas - Verificación de datos\n` +
        `4. Crecimiento_Sesion - Para análisis de curva de crecimiento\n` +
        `5. Respuestas_Items - Datos por cada respuesta individual\n` +
        `6. Instrucciones_SPSS - Paso a paso para importar`);
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error exportando datos:', error);
      alert('Error generando archivo Excel: ' + error.message);
      this.hideLoading();
    }
  }

prepareCompleteData() {
  const data = [];
  
  // Total de sesiones programadas: 10 semanas * 2 idiomas * 4 juegos = 80
  const TOTAL_SESIONES_PROGRAMADAS = 64;
  
  for (let student of this.allStudents) {
    // ========== HELPER: OBTENER SESIÓN PRE o POST POR TIPO ==========
    // Usa el campo sessionType si existe; si no, fallback a posición cronológica
    const getSession = (gameNum, lang, type) => {
      const sessions = this.allSessions.filter(s => 
        s.studentCode === student.code && s.gameNumber === gameNum && s.language === lang
      ).sort((a, b) => {
        // Ordenar cronológicamente
        const dateA = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt || 0);
        const dateB = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt || 0);
        return dateA - dateB;
      });
      
      if (sessions.length === 0) return null;
      
      // Intentar filtrar por sessionType (campo que debería existir)
      const byType = sessions.filter(s => s.sessionType === type);
      if (byType.length > 0) return byType[byType.length - 1]; // Última de ese tipo
      
      // Fallback: primera sesión = pre-test, última = post-test
      if (type === 'pre-test') return sessions[0];
      if (type === 'post-test' && sessions.length > 1) return sessions[sessions.length - 1];
      
      return null;
    };
    
    // ========== OBTENER SESIONES PRE/POST POR JUEGO E IDIOMA ==========
    const game1_ES_Pre = getSession(1, 'es', 'pre-test');
    const game1_ES_Post = getSession(1, 'es', 'post-test');
    const game1_EN_Pre = getSession(1, 'en', 'pre-test');
    const game1_EN_Post = getSession(1, 'en', 'post-test');
    
    const game2_ES_Pre = getSession(2, 'es', 'pre-test');
    const game2_ES_Post = getSession(2, 'es', 'post-test');
    const game2_EN_Pre = getSession(2, 'en', 'pre-test');
    const game2_EN_Post = getSession(2, 'en', 'post-test');
    
    const game3_ES_Pre = getSession(3, 'es', 'pre-test');
    const game3_ES_Post = getSession(3, 'es', 'post-test');
    const game3_EN_Pre = getSession(3, 'en', 'pre-test');
    const game3_EN_Post = getSession(3, 'en', 'post-test');
    
    const game4_ES_Pre = getSession(4, 'es', 'pre-test');
    const game4_ES_Post = getSession(4, 'es', 'post-test');
    const game4_EN_Pre = getSession(4, 'en', 'pre-test');
    const game4_EN_Post = getSession(4, 'en', 'post-test');
    
    // ========== CALCULAR COHEN'S D (orientativo) ==========
    const cohensD_J1_ES = this.calculateCohenD(game1_ES_Pre, game1_ES_Post, 'accuracy');
    const cohensD_J1_EN = this.calculateCohenD(game1_EN_Pre, game1_EN_Post, 'accuracy');
    const cohensD_J2_ES = this.calculateCohenD(game2_ES_Pre, game2_ES_Post, 'accuracy');
    const cohensD_J2_EN = this.calculateCohenD(game2_EN_Pre, game2_EN_Post, 'accuracy');
    const cohensD_J3_ES = this.calculateCohenD(game3_ES_Pre, game3_ES_Post, 'accuracy');
    const cohensD_J3_EN = this.calculateCohenD(game3_EN_Pre, game3_EN_Post, 'accuracy');
    const cohensD_J4_ES = this.calculateCohenD(game4_ES_Pre, game4_ES_Post, 'accuracy');
    const cohensD_J4_EN = this.calculateCohenD(game4_EN_Pre, game4_EN_Post, 'accuracy');
    
    // ========== CALCULAR PROMEDIOS DE MEJORA ==========
    const mejoras_ES = [
      this.calcDiff(game1_ES_Pre, game1_ES_Post, 'accuracy'),
      this.calcDiff(game2_ES_Pre, game2_ES_Post, 'accuracy'),
      this.calcDiff(game3_ES_Pre, game3_ES_Post, 'accuracy'),
      this.calcDiff(game4_ES_Pre, game4_ES_Post, 'accuracy')
    ].filter(v => v !== null);
    
    const mejoras_EN = [
      this.calcDiff(game1_EN_Pre, game1_EN_Post, 'accuracy'),
      this.calcDiff(game2_EN_Pre, game2_EN_Post, 'accuracy'),
      this.calcDiff(game3_EN_Pre, game3_EN_Post, 'accuracy'),
      this.calcDiff(game4_EN_Pre, game4_EN_Post, 'accuracy')
    ].filter(v => v !== null);
    
    const promedio_mejora_ES = mejoras_ES.length > 0 ? this.mean(mejoras_ES) : null;
    const promedio_mejora_EN = mejoras_EN.length > 0 ? this.mean(mejoras_EN) : null;
    
    // ========== TRANSFERENCIA INTERLINGÜÍSTICA ==========
    // En SPSS se debe calcular con correlación de Pearson.
    // Aquí exportamos la diferencia de mejoras como proxy.
    const transferencia_L1_L2 = (promedio_mejora_ES !== null && promedio_mejora_EN !== null) 
      ? (promedio_mejora_EN - promedio_mejora_ES)  // Positivo = mayor mejora en L2
      : null;
    
    // ========== ENGAGEMENT SCORE ==========
    const totalSesionesEstudiante = this.allSessions.filter(s => s.studentCode === student.code).length;
    const engagementScore = parseFloat((totalSesionesEstudiante / TOTAL_SESIONES_PROGRAMADAS * 100).toFixed(1));
    
    // ========== CONSTRUIR FILA DE DATOS ==========
    const row = {
      // ===== IDENTIFICACIÓN =====
      ID_Estudiante: student.code,
      
      // ===== DEMOGRAFÍA (nombres corregidos para coincidir con Firestore) =====
      Edad_Anios: student.age || null,
      Edad_Meses: student.ageMonths || null,
      Genero: student.gender || 'N/A',
      NSE: student.nseLevel || student.nse || 'N/A',
      Idioma_Primario_L1: student.primaryLanguage || 'Español',
      Idioma_Hogar: student.language || 'Monolingüe',
      Exposicion_Lectura_Horas: student.readingHoursPerWeek || student.readingHours || 0,
      Exposicion_Pantalla_Horas: student.screenHoursPerDay || student.screenHours || 0,
      ADHD_Screening: student.adhdScreening || student.adhd || 'Negativo',
      
      // ===== JUEGO 1: CONCIENCIA FONOLÓGICA - ESPAÑOL =====
      J1_ES_Pre_Precision: game1_ES_Pre ? game1_ES_Pre.accuracy : null,
      J1_ES_Pre_Tiempo: game1_ES_Pre ? game1_ES_Pre.averageReactionTime : null,
      J1_ES_Post_Precision: game1_ES_Post ? game1_ES_Post.accuracy : null,
      J1_ES_Post_Tiempo: game1_ES_Post ? game1_ES_Post.averageReactionTime : null,
      J1_ES_Dif_Precision: this.calcDiff(game1_ES_Pre, game1_ES_Post, 'accuracy'),
      J1_ES_Dif_Tiempo: this.calcDiff(game1_ES_Pre, game1_ES_Post, 'averageReactionTime'),
      J1_ES_Cohen_d: cohensD_J1_ES,
      J1_ES_Puntos: game1_ES_Post ? game1_ES_Post.totalScore : null,
      
      // ===== JUEGO 1: CONCIENCIA FONOLÓGICA - INGLÉS =====
      J1_EN_Pre_Precision: game1_EN_Pre ? game1_EN_Pre.accuracy : null,
      J1_EN_Pre_Tiempo: game1_EN_Pre ? game1_EN_Pre.averageReactionTime : null,
      J1_EN_Post_Precision: game1_EN_Post ? game1_EN_Post.accuracy : null,
      J1_EN_Post_Tiempo: game1_EN_Post ? game1_EN_Post.averageReactionTime : null,
      J1_EN_Dif_Precision: this.calcDiff(game1_EN_Pre, game1_EN_Post, 'accuracy'),
      J1_EN_Dif_Tiempo: this.calcDiff(game1_EN_Pre, game1_EN_Post, 'averageReactionTime'),
      J1_EN_Cohen_d: cohensD_J1_EN,
      J1_EN_Puntos: game1_EN_Post ? game1_EN_Post.totalScore : null,
      
      // ===== JUEGO 2: MEMORIA DE TRABAJO - ESPAÑOL =====
      J2_ES_Pre_MaxSpan: game2_ES_Pre ? game2_ES_Pre.maxSpan : null,
      J2_ES_Pre_Precision: game2_ES_Pre ? game2_ES_Pre.accuracy : null,
      J2_ES_Pre_Tiempo: game2_ES_Pre ? game2_ES_Pre.totalGameTime : null,
      J2_ES_Post_MaxSpan: game2_ES_Post ? game2_ES_Post.maxSpan : null,
      J2_ES_Post_Precision: game2_ES_Post ? game2_ES_Post.accuracy : null,
      J2_ES_Post_Tiempo: game2_ES_Post ? game2_ES_Post.totalGameTime : null,
      J2_ES_Dif_MaxSpan: this.calcDiff(game2_ES_Pre, game2_ES_Post, 'maxSpan'),
      J2_ES_Dif_Precision: this.calcDiff(game2_ES_Pre, game2_ES_Post, 'accuracy'),
      J2_ES_Dif_Tiempo: this.calcDiff(game2_ES_Pre, game2_ES_Post, 'totalGameTime'),
      J2_ES_Cohen_d: cohensD_J2_ES,
      J2_ES_Puntos: game2_ES_Post ? game2_ES_Post.totalScore : null,
      
      // ===== JUEGO 2: MEMORIA DE TRABAJO - INGLÉS =====
      J2_EN_Pre_MaxSpan: game2_EN_Pre ? game2_EN_Pre.maxSpan : null,
      J2_EN_Pre_Precision: game2_EN_Pre ? game2_EN_Pre.accuracy : null,
      J2_EN_Pre_Tiempo: game2_EN_Pre ? game2_EN_Pre.totalGameTime : null,
      J2_EN_Post_MaxSpan: game2_EN_Post ? game2_EN_Post.maxSpan : null,
      J2_EN_Post_Precision: game2_EN_Post ? game2_EN_Post.accuracy : null,
      J2_EN_Post_Tiempo: game2_EN_Post ? game2_EN_Post.totalGameTime : null,
      J2_EN_Dif_MaxSpan: this.calcDiff(game2_EN_Pre, game2_EN_Post, 'maxSpan'),
      J2_EN_Dif_Precision: this.calcDiff(game2_EN_Pre, game2_EN_Post, 'accuracy'),
      J2_EN_Dif_Tiempo: this.calcDiff(game2_EN_Pre, game2_EN_Post, 'totalGameTime'),
      J2_EN_Cohen_d: cohensD_J2_EN,
      J2_EN_Puntos: game2_EN_Post ? game2_EN_Post.totalScore : null,
      
      // ===== JUEGO 3: DECODIFICACIÓN - ESPAÑOL =====
      J3_ES_Pre_Precision: game3_ES_Pre ? game3_ES_Pre.accuracy : null,
      J3_ES_Pre_Tiempo: game3_ES_Pre ? game3_ES_Pre.averageReactionTime : null,
      J3_ES_Post_Precision: game3_ES_Post ? game3_ES_Post.accuracy : null,
      J3_ES_Post_Tiempo: game3_ES_Post ? game3_ES_Post.averageReactionTime : null,
      J3_ES_Dif_Precision: this.calcDiff(game3_ES_Pre, game3_ES_Post, 'accuracy'),
      J3_ES_Dif_Tiempo: this.calcDiff(game3_ES_Pre, game3_ES_Post, 'averageReactionTime'),
      J3_ES_Cohen_d: cohensD_J3_ES,
      J3_ES_Puntos: game3_ES_Post ? game3_ES_Post.totalScore : null,
      
      // ===== JUEGO 3: DECODIFICACIÓN - INGLÉS =====
      J3_EN_Pre_Precision: game3_EN_Pre ? game3_EN_Pre.accuracy : null,
      J3_EN_Pre_Tiempo: game3_EN_Pre ? game3_EN_Pre.averageReactionTime : null,
      J3_EN_Post_Precision: game3_EN_Post ? game3_EN_Post.accuracy : null,
      J3_EN_Post_Tiempo: game3_EN_Post ? game3_EN_Post.averageReactionTime : null,
      J3_EN_Dif_Precision: this.calcDiff(game3_EN_Pre, game3_EN_Post, 'accuracy'),
      J3_EN_Dif_Tiempo: this.calcDiff(game3_EN_Pre, game3_EN_Post, 'averageReactionTime'),
      J3_EN_Cohen_d: cohensD_J3_EN,
      J3_EN_Puntos: game3_EN_Post ? game3_EN_Post.totalScore : null,
      
      // ===== JUEGO 4: RECONOCIMIENTO DE PALABRAS - ESPAÑOL =====
      J4_ES_Pre_WPM: game4_ES_Pre ? game4_ES_Pre.wordsPerMinute : null,
      J4_ES_Pre_Precision: game4_ES_Pre ? game4_ES_Pre.accuracy : null,
      J4_ES_Pre_Tiempo: game4_ES_Pre ? game4_ES_Pre.averageReactionTime : null,
      J4_ES_Post_WPM: game4_ES_Post ? game4_ES_Post.wordsPerMinute : null,
      J4_ES_Post_Precision: game4_ES_Post ? game4_ES_Post.accuracy : null,
      J4_ES_Post_Tiempo: game4_ES_Post ? game4_ES_Post.averageReactionTime : null,
      J4_ES_Dif_WPM: this.calcDiff(game4_ES_Pre, game4_ES_Post, 'wordsPerMinute'),
      J4_ES_Dif_Precision: this.calcDiff(game4_ES_Pre, game4_ES_Post, 'accuracy'),
      J4_ES_Dif_Tiempo: this.calcDiff(game4_ES_Pre, game4_ES_Post, 'averageReactionTime'),
      J4_ES_Cohen_d: cohensD_J4_ES,
      J4_ES_Puntos: game4_ES_Post ? game4_ES_Post.totalScore : null,
      
      // ===== JUEGO 4: RECONOCIMIENTO DE PALABRAS - INGLÉS =====
      J4_EN_Pre_WPM: game4_EN_Pre ? game4_EN_Pre.wordsPerMinute : null,
      J4_EN_Pre_Precision: game4_EN_Pre ? game4_EN_Pre.accuracy : null,
      J4_EN_Pre_Tiempo: game4_EN_Pre ? game4_EN_Pre.averageReactionTime : null,
      J4_EN_Post_WPM: game4_EN_Post ? game4_EN_Post.wordsPerMinute : null,
      J4_EN_Post_Precision: game4_EN_Post ? game4_EN_Post.accuracy : null,
      J4_EN_Post_Tiempo: game4_EN_Post ? game4_EN_Post.averageReactionTime : null,
      J4_EN_Dif_WPM: this.calcDiff(game4_EN_Pre, game4_EN_Post, 'wordsPerMinute'),
      J4_EN_Dif_Precision: this.calcDiff(game4_EN_Pre, game4_EN_Post, 'accuracy'),
      J4_EN_Dif_Tiempo: this.calcDiff(game4_EN_Pre, game4_EN_Post, 'averageReactionTime'),
      J4_EN_Cohen_d: cohensD_J4_EN,
      J4_EN_Puntos: game4_EN_Post ? game4_EN_Post.totalScore : null,
      
      // ===== TEST ESTANDARIZADO EXTERNO (DIBELS subtests) =====
      DIBELS_Pre_LNF: student.dibels?.pre_lnf ?? null,
      DIBELS_Pre_FSF: student.dibels?.pre_fsf ?? null,
      DIBELS_Pre_PSF: student.dibels?.pre_psf ?? null,
      DIBELS_Pre_NWF_CLS: student.dibels?.pre_nwf_cls ?? null,
      DIBELS_Pre_NWF_WRC: student.dibels?.pre_nwf_wrc ?? null,
      DIBELS_Pre_ORF: student.dibels?.pre_orf ?? null,
      DIBELS_Post_LNF: student.dibels?.post_lnf ?? null,
      DIBELS_Post_FSF: student.dibels?.post_fsf ?? null,
      DIBELS_Post_PSF: student.dibels?.post_psf ?? null,
      DIBELS_Post_NWF_CLS: student.dibels?.post_nwf_cls ?? null,
      DIBELS_Post_NWF_WRC: student.dibels?.post_nwf_wrc ?? null,
      DIBELS_Post_ORF: student.dibels?.post_orf ?? null,
      DIBELS_Dif_LNF: (student.dibels?.post_lnf != null && student.dibels?.pre_lnf != null) ? student.dibels.post_lnf - student.dibels.pre_lnf : null,
      DIBELS_Dif_PSF: (student.dibels?.post_psf != null && student.dibels?.pre_psf != null) ? student.dibels.post_psf - student.dibels.pre_psf : null,
      DIBELS_Dif_NWF_CLS: (student.dibels?.post_nwf_cls != null && student.dibels?.pre_nwf_cls != null) ? student.dibels.post_nwf_cls - student.dibels.pre_nwf_cls : null,
      
      // ===== VARIABLES CALCULADAS =====
      Promedio_Mejora_L1_Espanol: promedio_mejora_ES,
      Promedio_Mejora_L2_Ingles: promedio_mejora_EN,
      Diferencia_Mejora_L1_L2: transferencia_L1_L2,
      
      Promedio_Cohen_d_Espanol: this.mean([cohensD_J1_ES, cohensD_J2_ES, cohensD_J3_ES, cohensD_J4_ES].filter(v => v !== null)),
      Promedio_Cohen_d_Ingles: this.mean([cohensD_J1_EN, cohensD_J2_EN, cohensD_J3_EN, cohensD_J4_EN].filter(v => v !== null)),
      
      // ===== ENGAGEMENT =====
      Engagement_Score: engagementScore,
      Total_Sesiones_Completadas: totalSesionesEstudiante,
      Total_Sesiones_Programadas: TOTAL_SESIONES_PROGRAMADAS,
      Completo_4_Juegos: student.allGamesCompleted ? 1 : 0, // Numérico para SPSS
      
      // ===== FECHAS =====
      Fecha_Registro: this.formatDate(student.registeredAt),
      Fecha_Ultima_Sesion: this.formatDate(student.lastSessionAt)
    };
    
    data.push(row);
  }
  
  return data;
}

  calcDiff(pre, post, field) {
    if (!pre || !post || pre[field] === undefined || post[field] === undefined) return null;
    return post[field] - pre[field];
  }
calculateCohenD(preSession, postSession, field) {
  // ============================================================
  // NOTA IMPORTANTE PARA SPSS:
  // Cohen's d individual (un solo sujeto, pre vs post) NO es 
  // estadísticamente válido. El Cohen's d real debe calcularse 
  // en SPSS con la SD pooled del GRUPO completo.
  //
  // Aquí exportamos las DIFERENCIAS BRUTAS (Post - Pre) para 
  // que en SPSS se calcule correctamente:
  //   d = M_diferencia / SD_diferencia
  //
  // Este campo se deja como referencia orientativa solamente.
  // ============================================================
  if (!preSession || !postSession) return null;
  
  const M_pre = preSession[field];
  const M_post = postSession[field];
  
  if (M_pre === undefined || M_pre === null || M_post === undefined || M_post === null) return null;
  if (M_pre === 0 && M_post === 0) return 0;
  
  // Diferencia bruta normalizada (orientativa, NO usar como Cohen's d real)
  // El cálculo real debe hacerse en SPSS con la SD del grupo
  const diff = M_post - M_pre;
  const denominator = Math.max(Math.abs(M_pre), 1); // Evitar división por 0
  
  return parseFloat((diff / denominator).toFixed(3));
}

  // =============================================
  // EXPORTACIÓN: POR JUEGO INDIVIDUAL
  // =============================================

  // =============================================
  // DATOS DE CRECIMIENTO POR SESIÓN (formato long para SPSS)
  // Una fila por sesión - necesario para análisis de curva de crecimiento
  // En SPSS: Analyze > Mixed Models > Linear (variable de tiempo = Numero_Sesion)
  // =============================================
  prepareGrowthData() {
    const data = [];
    
    for (let student of this.allStudents) {
      const studentSessions = this.allSessions
        .filter(s => s.studentCode === student.code)
        .sort((a, b) => {
          const dateA = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt || 0);
          const dateB = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt || 0);
          return dateA - dateB;
        });
      
      studentSessions.forEach((session, index) => {
        data.push({
          ID_Estudiante: student.code,
          Numero_Sesion: index + 1,
          Semana: session.weekNumber || Math.ceil((index + 1) / 8),
          Juego: session.gameNumber,
          Idioma: session.language,
          Tipo_Sesion: session.sessionType || 'intervencion',
          Dificultad: session.difficulty,
          Precision: session.accuracy,
          MaxSpan: session.maxSpan || null, // Juego 2
          WPM: session.wordsPerMinute || null, // Juego 4
          Tiempo_Reaccion_ms: session.averageReactionTime,
          Tiempo_Total_seg: session.totalGameTime,
          Puntuacion: session.totalScore,
          Preguntas_Total: session.totalQuestions,
          Respuestas_Correctas: session.correctAnswers,
          Fecha: this.formatDate(session.startedAt),
          Estado: session.status
        });
      });
    }
    
    return data;
  }

  // =============================================
  // DATOS A NIVEL DE ITEM (respuestas individuales)
  // Una fila por respuesta - para análisis de dificultad de ítems
  // En SPSS: útil para análisis de fiabilidad y patrones de error
  // =============================================
  prepareItemLevelData() {
    const data = [];
    
    for (let session of this.allSessions) {
      if (!session.responses || session.responses.length === 0) continue;
      
      for (let response of session.responses) {
        data.push({
          ID_Estudiante: session.studentCode,
          Juego: session.gameNumber,
          Idioma: session.language,
          Tipo_Sesion: session.sessionType || 'intervencion',
          Semana: session.weekNumber || null,
          Dificultad: session.difficulty,
          Estimulo: response.stimulus || response.word || response.pair || '',
          Respuesta_Estudiante: response.studentAnswer || response.answer || '',
          Respuesta_Correcta: response.correctAnswer || response.expected || '',
          Es_Correcto: response.isCorrect ? 1 : 0,
          Tiempo_Reaccion_ms: response.reactionTime || response.responseTime || null,
          Numero_Intento: response.attemptNumber || response.attempt || 1,
          Timestamp: this.formatDate(response.timestamp || response.answeredAt)
        });
      }
    }
    
    return data;
  }

  // =============================================
  // INSTRUCCIONES PARA IMPORTAR EN SPSS
  // =============================================
  getSPSSInstructions() {
    return [
      {
        Paso: 1,
        Instruccion: 'Abrir SPSS y seleccionar: Archivo > Abrir > Datos',
        Detalle: 'Seleccionar el archivo .xlsx descargado. En "Tipo de archivo" elegir "Excel".'
      },
      {
        Paso: 2,
        Instruccion: 'Seleccionar la hoja "Datos_Completos"',
        Detalle: 'Marcar "Leer nombres de variables de la primera fila". Aceptar.'
      },
      {
        Paso: 3,
        Instruccion: 'Configurar tipos de variables',
        Detalle: 'Ir a Vista de Variables. Para cada variable consultar la hoja "Diccionario": Escala=Scale, Nominal=Nominal, Ordinal=Ordinal. J2 MaxSpan y J4 WPM son Scale.'
      },
      {
        Paso: 4,
        Instruccion: 'Configurar valores perdidos',
        Detalle: 'Las celdas vacías (null) se importan como system-missing en SPSS. No requiere acción adicional.'
      },
      {
        Paso: 5,
        Instruccion: 'Verificar datos con Estadísticas Descriptivas',
        Detalle: 'Analyze > Descriptive Statistics > Descriptives. Seleccionar variables clave: J1 Precisión, J2 MaxSpan, J3 Precisión, J4 WPM. Comparar con hoja "Estadisticas".'
      },
      {
        Paso: 6,
        Instruccion: 'Test de Normalidad (Shapiro-Wilk)',
        Detalle: 'Analyze > Descriptive Statistics > Explore. Marcar "Normality plots with tests". Verificar Shapiro-Wilk (n<50). Si p<0.05, usar Wilcoxon en vez de t-Student.'
      },
      {
        Paso: 7,
        Instruccion: 'H1: t de Student pareada - Conciencia Fonológica (J1)',
        Detalle: 'Analyze > Compare Means > Paired-Samples T Test. Par 1: J1_ES_Pre_Precision ↔ J1_ES_Post_Precision. Par 2: J1_EN análogo. Reportar t, gl, p, d de Cohen.'
      },
      {
        Paso: 8,
        Instruccion: 'H1: t pareada - Memoria de Trabajo (J2 MaxSpan)',
        Detalle: 'Paired T Test. Par: J2_ES_Pre_MaxSpan ↔ J2_ES_Post_MaxSpan. MaxSpan es la variable dependiente principal de J2 (amplitud de memoria secuencial). Repetir para EN.'
      },
      {
        Paso: 9,
        Instruccion: 'H1: t pareada - Decodificación (J3)',
        Detalle: 'Paired T Test. Par: J3_ES_Pre_Precision ↔ J3_ES_Post_Precision y J3_ES_Pre_Tiempo ↔ J3_ES_Post_Tiempo. Repetir para EN.'
      },
      {
        Paso: 10,
        Instruccion: 'H1: t pareada - Reconocimiento Rápido (J4 WPM)',
        Detalle: 'Paired T Test. Par: J4_ES_Pre_WPM ↔ J4_ES_Post_WPM. WPM es la variable dependiente principal de J4 (palabras reconocidas por minuto). Repetir para EN.'
      },
      {
        Paso: 11,
        Instruccion: 'H2: ANOVA de medidas repetidas (4 constructos)',
        Detalle: 'Analyze > General Linear Model > Repeated Measures. Factor: "Constructo" (4 niveles). VDs: J1_Dif_Precision, J2_Dif_MaxSpan, J3_Dif_Precision, J4_Dif_WPM (estandarizar con z-scores antes). Post-hoc: Bonferroni.'
      },
      {
        Paso: 12,
        Instruccion: 'H3: Correlación L1-L2 (Transferencia Interlingüística)',
        Detalle: 'Analyze > Correlate > Bivariate. Emparejar: J1_ES_Dif vs J1_EN_Dif, J2_ES_Dif_MaxSpan vs J2_EN_Dif_MaxSpan, J4_ES_Dif_WPM vs J4_EN_Dif_WPM. Pearson si normal, Spearman si no.'
      },
      {
        Paso: 13,
        Instruccion: 'Tamaño de efecto (Cohen d REAL)',
        Detalle: 'NO usar las columnas Cohen_d del Excel (son orientativas). Calcular en SPSS: d = Media_Diferencia / DE_Diferencia. Interpretar: 0.2=pequeño, 0.5=mediano, 0.8=grande.'
      },
      {
        Paso: 14,
        Instruccion: 'Validez convergente con DIBELS (6 subtests)',
        Detalle: 'Correlacionar: J1_Dif_Precision con DIBELS_Dif_PSF (fonológica), J2_Dif_MaxSpan con DIBELS_Dif_NWF_CLS (memoria-decodificación), J4_Dif_WPM con DIBELS_Post_ORF (fluidez). Si r > 0.4, hay validez convergente.'
      },
      {
        Paso: 15,
        Instruccion: 'Curva de crecimiento (opcional)',
        Detalle: 'Importar hoja "Crecimiento_Sesion" en archivo SPSS separado. Analyze > Mixed Models > Linear. VD: Precision/MaxSpan/WPM. Factor fijo: Numero_Sesion. Evaluar tendencia de mejora a lo largo de las 10 semanas.'
      },
      {
        Paso: 16,
        Instruccion: 'Análisis complementario: Regresión múltiple',
        Detalle: 'Analyze > Regression > Linear. VD: DIBELS_Post_ORF. Predictores: J1_Dif_Precision, J2_Dif_MaxSpan, J3_Dif_Precision, J4_Dif_WPM, Engagement_Score. Evaluar qué constructo predice mejor la fluidez lectora.'
      }
    ];
  }

  async exportGameData(gameNumber) {
    this.showLoading();
    
    try {
      console.log(`📊 Exportando datos del Juego ${gameNumber}...`);
      
      const sessions = this.allSessions.filter(s => s.gameNumber === gameNumber);
      const data = sessions.map(s => ({
        ID_Estudiante: s.studentCode,
        Nombre: s.studentName,
        Juego: s.gameName,
        Idioma: s.language,
        Dificultad: s.difficulty,
        Preguntas_Totales: s.totalQuestions,
        Respuestas_Correctas: s.correctAnswers,
        Precision_Porcentaje: s.accuracy,
        Tiempo_Promedio_Reaccion_ms: s.averageReactionTime,
        Tiempo_Total_Juego_seg: s.totalGameTime,
        Puntuacion_Total: s.totalScore,
        Fecha_Inicio: this.formatDate(s.startedAt),
        Fecha_Completado: this.formatDate(s.completedAt),
        Estado: s.status
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `Juego_${gameNumber}`);
      
      const fileName = `Juego_${gameNumber}_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Archivo generado: ${fileName}`);
      alert(`✅ Archivo descargado: ${fileName}`);
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error exportando juego:', error);
      alert('Error generando archivo');
      this.hideLoading();
    }
  }

  // =============================================
  // EXPORTACIÓN: RESPUESTAS INDIVIDUALES
  // =============================================

  async exportResponsesData() {
    this.showLoading();
    
    try {
      console.log('📊 Exportando respuestas individuales...');
      
      const data = [];
      
      for (let session of this.allSessions) {
        if (!session.responses) continue;
        
        for (let response of session.responses) {
          data.push({
            ID_Estudiante: session.studentCode,
            Nombre: session.studentName,
            Juego: session.gameNumber,
            Sesion_ID: session.id,
            Respuesta_ID: response.id,
            Correcto: response.correct ? 'Sí' : 'No',
            Tiempo_Reaccion_ms: response.reactionTime,
            Puntos: response.points,
            Timestamp: this.formatDate(response.timestamp),
            Estimulo: response.emotionName || response.word || response.targetWord || 'N/A',
            Respuesta_Dada: response.selectedEmotion || response.selectedWord || 'N/A',
            Respuesta_Correcta: response.correctEmotion || response.correctRhyme || 'N/A'
          });
        }
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
      
      const fileName = `Respuestas_Detalladas_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Archivo generado: ${fileName}`);
      alert(`✅ Archivo descargado: ${fileName}\n\nTotal de respuestas: ${data.length}`);
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error exportando respuestas:', error);
      alert('Error generando archivo');
      this.hideLoading();
    }
  }

  // =============================================
  // EXPORTACIÓN: SOLO DEMOGRAFÍA
  // =============================================

  async exportDemographicData() {
    this.showLoading();
    
    try {
      console.log('📊 Exportando datos demográficos...');
      
      const data = this.allStudents.map(s => ({
        ID_Estudiante: s.code,
        Nombre: s.name || 'N/A',
        Genero: s.gender || 'N/A',
        NSE: s.nse || 'N/A',
        Idioma_Hogar: s.language || 'Monolingüe',
        Exposicion_Lectura_Horas_Semana: s.readingHours || 0,
        Exposicion_Pantalla_Horas_Semana: s.screenHours || 0,
        ADHD_Screening: s.adhd || 'Negativo',
        Total_Sesiones: s.totalSessions || 0,
        Completo_4_Juegos: s.allGamesCompleted ? 'Sí' : 'No',
        Fecha_Registro: this.formatDate(s.registeredAt),
        Fecha_Ultima_Sesion: this.formatDate(s.lastSessionAt)
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Demografia');
      
      const fileName = `Datos_Demograficos_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Archivo generado: ${fileName}`);
      alert(`✅ Archivo descargado: ${fileName}`);
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error exportando demografía:', error);
      alert('Error generando archivo');
      this.hideLoading();
    }
  }

  // =============================================
  // DICCIONARIO DE VARIABLES PARA SPSS
  // =============================================

getVariablesDictionary() {
  return [
    // ===== IDENTIFICACIÓN =====
    { Variable: 'ID_Estudiante', Descripcion: 'Código único del estudiante', Tipo: 'String', Valores: 'Alfanumérico' },
    
    // ===== DEMOGRAFÍA =====
    { Variable: 'Edad_Años', Descripcion: 'Edad en años completos', Tipo: 'Escala', Valores: '5-7' },
    { Variable: 'Edad_Meses', Descripcion: 'Meses adicionales de edad', Tipo: 'Escala', Valores: '0-11' },
    { Variable: 'Genero', Descripcion: 'Género del estudiante', Tipo: 'Nominal', Valores: 'Masculino, Femenino' },
    { Variable: 'NSE', Descripcion: 'Nivel Socioeconómico', Tipo: 'Ordinal', Valores: 'Bajo, Medio, Alto' },
    { Variable: 'Idioma_Primario_L1', Descripcion: 'Idioma primario del estudiante (L1)', Tipo: 'Nominal', Valores: 'Español, Inglés' },
    { Variable: 'Idioma_Hogar', Descripcion: 'Idioma hablado en casa', Tipo: 'Nominal', Valores: 'Monolingüe, Bilingüe' },
    { Variable: 'Exposicion_Lectura_Horas', Descripcion: 'Horas semanales de lectura', Tipo: 'Escala', Valores: '0-14' },
    { Variable: 'Exposicion_Pantalla_Horas', Descripcion: 'Horas semanales de pantalla', Tipo: 'Escala', Valores: '0-14' },
    { Variable: 'ADHD_Screening', Descripcion: 'Resultado screening ADHD (SNAP-IV)', Tipo: 'Nominal', Valores: 'Negativo, Positivo' },
    
    // ===== JUEGO 1: ESPAÑOL =====
    { Variable: 'J1_ES_Pre_Precision', Descripcion: 'J1 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J1_ES_Post_Precision', Descripcion: 'J1 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J1_ES_Dif_Precision', Descripcion: 'J1 Español - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J1_ES_Pre_Tiempo', Descripcion: 'J1 Español - Tiempo Reacción Pre (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J1_ES_Post_Tiempo', Descripcion: 'J1 Español - Tiempo Reacción Post (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J1_ES_Dif_Tiempo', Descripcion: 'J1 Español - Ganancia Tiempo (negativo=mejora)', Tipo: 'Escala', Valores: '-4500 a +4500' },
    { Variable: 'J1_ES_Cohen_d', Descripcion: 'J1 Español - Tamaño de Efecto (Cohen d)', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'J1_ES_Puntos', Descripcion: 'J1 Español - Puntuación Total Post-Test', Tipo: 'Escala', Valores: '0-1000' },
    
    // ===== JUEGO 1: INGLÉS =====
    { Variable: 'J1_EN_Pre_Precision', Descripcion: 'J1 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J1_EN_Post_Precision', Descripcion: 'J1 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J1_EN_Dif_Precision', Descripcion: 'J1 Inglés - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J1_EN_Pre_Tiempo', Descripcion: 'J1 Inglés - Tiempo Reacción Pre (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J1_EN_Post_Tiempo', Descripcion: 'J1 Inglés - Tiempo Reacción Post (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J1_EN_Dif_Tiempo', Descripcion: 'J1 Inglés - Ganancia Tiempo (negativo=mejora)', Tipo: 'Escala', Valores: '-4500 a +4500' },
    { Variable: 'J1_EN_Cohen_d', Descripcion: 'J1 Inglés - Tamaño de Efecto (Cohen d)', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'J1_EN_Puntos', Descripcion: 'J1 Inglés - Puntuación Total Post-Test', Tipo: 'Escala', Valores: '0-1000' },
    
    // ===== JUEGO 2: MEMORIA DE TRABAJO (MaxSpan) - ESPAÑOL =====
    { Variable: 'J2_ES_Pre_Precision', Descripcion: 'J2 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_ES_Post_Precision', Descripcion: 'J2 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_ES_Dif_Precision', Descripcion: 'J2 Español - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J2_ES_Pre_MaxSpan', Descripcion: 'J2 Español - Span Máximo Pre-Test (ítems)', Tipo: 'Escala', Valores: '2-9' },
    { Variable: 'J2_ES_Post_MaxSpan', Descripcion: 'J2 Español - Span Máximo Post-Test (ítems)', Tipo: 'Escala', Valores: '2-9' },
    { Variable: 'J2_ES_Dif_MaxSpan', Descripcion: 'J2 Español - Ganancia Span Máximo', Tipo: 'Escala', Valores: '-7 a +7' },
    { Variable: 'J2_ES_Cohen_d', Descripcion: 'J2 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== JUEGO 2: MEMORIA DE TRABAJO (MaxSpan) - INGLÉS =====
    { Variable: 'J2_EN_Pre_Precision', Descripcion: 'J2 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_EN_Post_Precision', Descripcion: 'J2 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_EN_Dif_Precision', Descripcion: 'J2 Inglés - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J2_EN_Pre_MaxSpan', Descripcion: 'J2 Inglés - Span Máximo Pre-Test (ítems)', Tipo: 'Escala', Valores: '2-9' },
    { Variable: 'J2_EN_Post_MaxSpan', Descripcion: 'J2 Inglés - Span Máximo Post-Test (ítems)', Tipo: 'Escala', Valores: '2-9' },
    { Variable: 'J2_EN_Dif_MaxSpan', Descripcion: 'J2 Inglés - Ganancia Span Máximo', Tipo: 'Escala', Valores: '-7 a +7' },
    { Variable: 'J2_EN_Cohen_d', Descripcion: 'J2 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== JUEGO 3: DECODIFICACIÓN - ESPAÑOL =====
    { Variable: 'J3_ES_Pre_Precision', Descripcion: 'J3 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_ES_Post_Precision', Descripcion: 'J3 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_ES_Dif_Precision', Descripcion: 'J3 Español - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J3_ES_Pre_Tiempo', Descripcion: 'J3 Español - Tiempo Reacción Pre (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J3_ES_Post_Tiempo', Descripcion: 'J3 Español - Tiempo Reacción Post (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J3_ES_Dif_Tiempo', Descripcion: 'J3 Español - Ganancia Tiempo (negativo=mejora)', Tipo: 'Escala', Valores: '-4500 a +4500' },
    { Variable: 'J3_ES_Cohen_d', Descripcion: 'J3 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== JUEGO 3: DECODIFICACIÓN - INGLÉS =====
    { Variable: 'J3_EN_Pre_Precision', Descripcion: 'J3 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_EN_Post_Precision', Descripcion: 'J3 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_EN_Dif_Precision', Descripcion: 'J3 Inglés - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J3_EN_Pre_Tiempo', Descripcion: 'J3 Inglés - Tiempo Reacción Pre (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J3_EN_Post_Tiempo', Descripcion: 'J3 Inglés - Tiempo Reacción Post (ms)', Tipo: 'Escala', Valores: '500-5000' },
    { Variable: 'J3_EN_Dif_Tiempo', Descripcion: 'J3 Inglés - Ganancia Tiempo (negativo=mejora)', Tipo: 'Escala', Valores: '-4500 a +4500' },
    { Variable: 'J3_EN_Cohen_d', Descripcion: 'J3 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== JUEGO 4: RECONOCIMIENTO RÁPIDO (WPM) - ESPAÑOL =====
    { Variable: 'J4_ES_Pre_Precision', Descripcion: 'J4 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_ES_Post_Precision', Descripcion: 'J4 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_ES_Dif_Precision', Descripcion: 'J4 Español - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J4_ES_Pre_WPM', Descripcion: 'J4 Español - Palabras por Minuto Pre-Test', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'J4_ES_Post_WPM', Descripcion: 'J4 Español - Palabras por Minuto Post-Test', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'J4_ES_Dif_WPM', Descripcion: 'J4 Español - Ganancia WPM', Tipo: 'Escala', Valores: '-60 a +60' },
    { Variable: 'J4_ES_Cohen_d', Descripcion: 'J4 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== JUEGO 4: RECONOCIMIENTO RÁPIDO (WPM) - INGLÉS =====
    { Variable: 'J4_EN_Pre_Precision', Descripcion: 'J4 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_EN_Post_Precision', Descripcion: 'J4 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_EN_Dif_Precision', Descripcion: 'J4 Inglés - Ganancia Precisión', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'J4_EN_Pre_WPM', Descripcion: 'J4 Inglés - Palabras por Minuto Pre-Test', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'J4_EN_Post_WPM', Descripcion: 'J4 Inglés - Palabras por Minuto Post-Test', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'J4_EN_Dif_WPM', Descripcion: 'J4 Inglés - Ganancia WPM', Tipo: 'Escala', Valores: '-60 a +60' },
    { Variable: 'J4_EN_Cohen_d', Descripcion: 'J4 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== DIBELS: SUBTESTS INDIVIDUALES =====
    { Variable: 'DIBELS_Pre_LNF', Descripcion: 'DIBELS Pre - Letter Naming Fluency (letras/min)', Tipo: 'Escala', Valores: '0-120' },
    { Variable: 'DIBELS_Post_LNF', Descripcion: 'DIBELS Post - Letter Naming Fluency (letras/min)', Tipo: 'Escala', Valores: '0-120' },
    { Variable: 'DIBELS_Dif_LNF', Descripcion: 'DIBELS Ganancia LNF', Tipo: 'Escala', Valores: '-120 a +120' },
    { Variable: 'DIBELS_Pre_FSF', Descripcion: 'DIBELS Pre - First Sound Fluency (sonidos/min)', Tipo: 'Escala', Valores: '0-80' },
    { Variable: 'DIBELS_Post_FSF', Descripcion: 'DIBELS Post - First Sound Fluency (sonidos/min)', Tipo: 'Escala', Valores: '0-80' },
    { Variable: 'DIBELS_Pre_PSF', Descripcion: 'DIBELS Pre - Phoneme Segmentation Fluency (fonemas/min)', Tipo: 'Escala', Valores: '0-80' },
    { Variable: 'DIBELS_Post_PSF', Descripcion: 'DIBELS Post - Phoneme Segmentation Fluency (fonemas/min)', Tipo: 'Escala', Valores: '0-80' },
    { Variable: 'DIBELS_Dif_PSF', Descripcion: 'DIBELS Ganancia PSF', Tipo: 'Escala', Valores: '-80 a +80' },
    { Variable: 'DIBELS_Pre_NWF_CLS', Descripcion: 'DIBELS Pre - Nonsense Word CLS (sonidos/min)', Tipo: 'Escala', Valores: '0-120' },
    { Variable: 'DIBELS_Post_NWF_CLS', Descripcion: 'DIBELS Post - Nonsense Word CLS (sonidos/min)', Tipo: 'Escala', Valores: '0-120' },
    { Variable: 'DIBELS_Dif_NWF_CLS', Descripcion: 'DIBELS Ganancia NWF-CLS', Tipo: 'Escala', Valores: '-120 a +120' },
    { Variable: 'DIBELS_Pre_NWF_WRC', Descripcion: 'DIBELS Pre - Nonsense Word WRC (palabras/min)', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'DIBELS_Post_NWF_WRC', Descripcion: 'DIBELS Post - Nonsense Word WRC (palabras/min)', Tipo: 'Escala', Valores: '0-60' },
    { Variable: 'DIBELS_Pre_ORF', Descripcion: 'DIBELS Pre - Oral Reading Fluency (palabras/min)', Tipo: 'Escala', Valores: '0-200' },
    { Variable: 'DIBELS_Post_ORF', Descripcion: 'DIBELS Post - Oral Reading Fluency (palabras/min)', Tipo: 'Escala', Valores: '0-200' },
    
    // ===== VARIABLES CALCULADAS =====
    { Variable: 'Promedio_Mejora_L1_Espanol', Descripcion: 'Promedio de ganancias en español (4 juegos)', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'Promedio_Mejora_L2_Ingles', Descripcion: 'Promedio de ganancias en inglés (4 juegos)', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'Diferencia_Mejora_L1_L2', Descripcion: 'Mejora L2 minus L1 (positivo = mayor ganancia en L2)', Tipo: 'Escala', Valores: '-200 a +200' },
    { Variable: 'Promedio_Cohen_d_Espanol', Descripcion: 'Promedio d orientativo español (calcular real en SPSS)', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'Promedio_Cohen_d_Ingles', Descripcion: 'Promedio d orientativo inglés (calcular real en SPSS)', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== ENGAGEMENT =====
    { Variable: 'Engagement_Score', Descripcion: 'Porcentaje de sesiones completadas vs programadas', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'Total_Sesiones_Completadas', Descripcion: 'Número de sesiones realizadas', Tipo: 'Escala', Valores: '0-64' },
    { Variable: 'Total_Sesiones_Programadas', Descripcion: 'Total de sesiones esperadas (10 semanas x 2 idiomas x 4 juegos)', Tipo: 'Constante', Valores: '80' },
    { Variable: 'Completo_4_Juegos', Descripcion: 'Completó los 4 juegos (0=No, 1=Sí)', Tipo: 'Nominal', Valores: '0, 1' }
  ];
}

  // =============================================
  // ESTADÍSTICAS DESCRIPTIVAS
  // =============================================

  calculateDescriptiveStats(data) {
    const stats = [];
    
    // ============================================================
    // CAMPOS CORREGIDOS: coinciden con los nombres reales exportados
    // Incluye ES y EN para análisis por idioma en SPSS
    // ============================================================
    const numericFields = [
      // Juego 1: Conciencia Fonológica
      'J1_ES_Pre_Precision', 'J1_ES_Post_Precision', 'J1_ES_Dif_Precision',
      'J1_ES_Pre_Tiempo', 'J1_ES_Post_Tiempo', 'J1_ES_Dif_Tiempo',
      'J1_EN_Pre_Precision', 'J1_EN_Post_Precision', 'J1_EN_Dif_Precision',
      'J1_EN_Pre_Tiempo', 'J1_EN_Post_Tiempo', 'J1_EN_Dif_Tiempo',
      // Juego 2: Memoria de Trabajo (Precisión + MaxSpan)
      'J2_ES_Pre_Precision', 'J2_ES_Post_Precision', 'J2_ES_Dif_Precision',
      'J2_ES_Pre_MaxSpan', 'J2_ES_Post_MaxSpan', 'J2_ES_Dif_MaxSpan',
      'J2_EN_Pre_Precision', 'J2_EN_Post_Precision', 'J2_EN_Dif_Precision',
      'J2_EN_Pre_MaxSpan', 'J2_EN_Post_MaxSpan', 'J2_EN_Dif_MaxSpan',
      // Juego 3: Decodificación
      'J3_ES_Pre_Precision', 'J3_ES_Post_Precision', 'J3_ES_Dif_Precision',
      'J3_ES_Pre_Tiempo', 'J3_ES_Post_Tiempo', 'J3_ES_Dif_Tiempo',
      'J3_EN_Pre_Precision', 'J3_EN_Post_Precision', 'J3_EN_Dif_Precision',
      'J3_EN_Pre_Tiempo', 'J3_EN_Post_Tiempo', 'J3_EN_Dif_Tiempo',
      // Juego 4: Reconocimiento Rápido (Precisión + WPM)
      'J4_ES_Pre_Precision', 'J4_ES_Post_Precision', 'J4_ES_Dif_Precision',
      'J4_ES_Pre_WPM', 'J4_ES_Post_WPM', 'J4_ES_Dif_WPM',
      'J4_EN_Pre_Precision', 'J4_EN_Post_Precision', 'J4_EN_Dif_Precision',
      'J4_EN_Pre_WPM', 'J4_EN_Post_WPM', 'J4_EN_Dif_WPM',
      // Variables calculadas
      'Promedio_Mejora_L1_Español', 'Promedio_Mejora_L2_Inglés',
      'Diferencia_Mejora_L1_L2',
      // DIBELS subtests
      'DIBELS_Pre_LNF', 'DIBELS_Post_LNF', 'DIBELS_Dif_LNF',
      'DIBELS_Pre_FSF', 'DIBELS_Post_FSF',
      'DIBELS_Pre_PSF', 'DIBELS_Post_PSF', 'DIBELS_Dif_PSF',
      'DIBELS_Pre_NWF_CLS', 'DIBELS_Post_NWF_CLS', 'DIBELS_Dif_NWF_CLS',
      'DIBELS_Pre_NWF_WRC', 'DIBELS_Post_NWF_WRC',
      'DIBELS_Pre_ORF', 'DIBELS_Post_ORF',
      // Engagement
      'Engagement_Score'
    ];
    
    for (let field of numericFields) {
      const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (values.length > 0) {
        const mean = this.mean(values);
        const sd = this.std(values);
        stats.push({
          Variable: field,
          N: values.length,
          Media: mean.toFixed(2),
          Mediana: this.median(values).toFixed(2),
          Desviacion_Estandar: sd.toFixed(2),
          Error_Estandar: (sd / Math.sqrt(values.length)).toFixed(3),
          Minimo: Math.min(...values).toFixed(2),
          Maximo: Math.max(...values).toFixed(2),
          Skewness: this.skewness(values).toFixed(3),
          Kurtosis: this.kurtosis(values).toFixed(3),
          Shapiro_Wilk_Aprox: values.length >= 3 ? this.shapiroWilkApprox(values).toFixed(4) : 'N/A'
        });
      }
    }
    
    return stats;
  }

  // Skewness (asimetría) - necesario para verificar normalidad en SPSS
  skewness(arr) {
    const n = arr.length;
    if (n < 3) return 0;
    const avg = this.mean(arr);
    const sd = this.std(arr);
    if (sd === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / sd, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  // Kurtosis (curtosis) - necesaria para verificar normalidad
  kurtosis(arr) {
    const n = arr.length;
    if (n < 4) return 0;
    const avg = this.mean(arr);
    const sd = this.std(arr);
    if (sd === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / sd, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum
      - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  // Aproximación Shapiro-Wilk (W-stat) - test de normalidad
  shapiroWilkApprox(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const avg = this.mean(sorted);
    const ss = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
    if (ss === 0) return 1;
    // Aproximación simplificada del estadístico W
    let b = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      b += (sorted[n - 1 - i] - sorted[i]);
    }
    return Math.min(1, (b * b) / (ss * n));
  }

  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  std(arr) {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  // =============================================
  // VISTA PREVIA
  // =============================================

  async loadPreview() {
    this.showLoading();
    
    try {
      const data = this.prepareCompleteData().slice(0, 10);
      
      if (data.length === 0) {
        this.elements.previewStatus.textContent = '⚠️ No hay datos para mostrar';
        this.hideLoading();
        return;
      }
      
      const headers = Object.keys(data[0]);
      
      let html = '<table><thead><tr>';
      headers.forEach(h => {
        html += `<th>${h}</th>`;
      });
      html += '</tr></thead><tbody>';
      
      data.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
          html += `<td>${row[h] !== null && row[h] !== undefined ? row[h] : '-'}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      
      this.elements.previewTable.innerHTML = html;
      this.elements.previewStatus.textContent = `✅ Mostrando primeros ${data.length} estudiantes`;
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error cargando vista previa:', error);
      this.elements.previewStatus.textContent = '❌ Error cargando datos';
      this.hideLoading();
    }
  }

  // =============================================
  // FILTROS
  // =============================================

  applyFilters() {
    alert('🔍 Filtros aplicados (funcionalidad en desarrollo)');
  }

  clearFilters() {
    this.elements.filterDateFrom.value = '';
    this.elements.filterDateTo.value = '';
    this.elements.filterLanguage.value = 'all';
    this.elements.filterCompleted.checked = false;
    alert('✅ Filtros limpiados');
  }

  // =============================================
  // UTILIDADES
  // =============================================

  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'N/A';
    }
    
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES');
  }

  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  showLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.style.display = 'flex';
    }
  }

  hideLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.style.display = 'none';
    }
  }
}

// =============================================
// INICIALIZACIÓN
// =============================================

let adminPanel;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando Panel de Administración...');

  try {
    // Esperar a que Firebase esté inicializado
    await new Promise((resolve) => {
      firebase.auth().onAuthStateChanged((user) => {
        if (user || firebase.auth().currentUser) {
          resolve();
        } else {
          firebase.auth().signInAnonymously().then(() => resolve());
        }
      });
    });

    console.log('✅ Firebase autenticado');

    // Crear instancia del panel
    adminPanel = new AdminPanel();
    await adminPanel.init();

    // Hacer global para debugging
    window.adminPanel = adminPanel;

    console.log('✅ Panel de administración listo');

  } catch (error) {
    console.error('❌ Error iniciando panel:', error);
    alert('Error inicializando el panel. Verifica tu conexión a Firebase.');
  }
});

// Manejar errores
window.addEventListener('error', (event) => {
  console.error('Error no capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada:', event.reason);
  event.preventDefault();
});