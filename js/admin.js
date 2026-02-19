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
      loadingSpinner: document.getElementById('loadingSpinner')
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
      
      // Cargar sesiones
      const sessionsSnapshot = await db.collection('sessions').get();
      this.allSessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cargar respuestas para cada sesión (LIMITADO A 20 SESIONES PARA VELOCIDAD)
      const sessionsToLoad = this.allSessions.slice(0, 20);
      
      for (let session of sessionsToLoad) {
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
      
      // Para las sesiones restantes, dejar responses vacío
      for (let i = 20; i < this.allSessions.length; i++) {
        this.allSessions[i].responses = [];
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
  // EXPORTACIÓN: DATOS COMPLETOS
  // =============================================

  async exportAllData() {
    this.showLoading();
    
    try {
      console.log('📊 Generando archivo Excel completo...');
      
      // Preparar datos
      const data = this.prepareCompleteData();
      
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Datos Completos
      const ws1 = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws1, 'Datos_Completos');
      
      // Hoja 2: Diccionario de Variables
      const ws2 = XLSX.utils.json_to_sheet(this.getVariablesDictionary());
      XLSX.utils.book_append_sheet(wb, ws2, 'Diccionario');
      
      // Hoja 3: Estadísticas Descriptivas
      const ws3 = XLSX.utils.json_to_sheet(this.calculateDescriptiveStats(data));
      XLSX.utils.book_append_sheet(wb, ws3, 'Estadisticas');
      
      // Descargar
      const fileName = `Datos_Completos_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Archivo generado: ${fileName}`);
      alert(`✅ Archivo descargado: ${fileName}`);
      
      this.hideLoading();
    } catch (error) {
      console.error('❌ Error exportando datos:', error);
      alert('Error generando archivo Excel');
      this.hideLoading();
    }
  }

prepareCompleteData() {
  const data = [];
  
  for (let student of this.allStudents) {
    // ========== OBTENER SESIONES POR JUEGO E IDIOMA ==========
    
    // Juego 1 - Español
    const game1_ES_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 1 && s.language === 'es'
    );
    const game1_ES_Pre = game1_ES_Sessions.length > 0 ? game1_ES_Sessions[0] : null;
    const game1_ES_Post = game1_ES_Sessions.length > 1 ? game1_ES_Sessions[game1_ES_Sessions.length - 1] : null;
    
    // Juego 1 - Inglés
    const game1_EN_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 1 && s.language === 'en'
    );
    const game1_EN_Pre = game1_EN_Sessions.length > 0 ? game1_EN_Sessions[0] : null;
    const game1_EN_Post = game1_EN_Sessions.length > 1 ? game1_EN_Sessions[game1_EN_Sessions.length - 1] : null;
    
    // Juego 2 - Español
    const game2_ES_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 2 && s.language === 'es'
    );
    const game2_ES_Pre = game2_ES_Sessions.length > 0 ? game2_ES_Sessions[0] : null;
    const game2_ES_Post = game2_ES_Sessions.length > 1 ? game2_ES_Sessions[game2_ES_Sessions.length - 1] : null;
    
    // Juego 2 - Inglés
    const game2_EN_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 2 && s.language === 'en'
    );
    const game2_EN_Pre = game2_EN_Sessions.length > 0 ? game2_EN_Sessions[0] : null;
    const game2_EN_Post = game2_EN_Sessions.length > 1 ? game2_EN_Sessions[game2_EN_Sessions.length - 1] : null;
    
    // Juego 3 - Español
    const game3_ES_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 3 && s.language === 'es'
    );
    const game3_ES_Pre = game3_ES_Sessions.length > 0 ? game3_ES_Sessions[0] : null;
    const game3_ES_Post = game3_ES_Sessions.length > 1 ? game3_ES_Sessions[game3_ES_Sessions.length - 1] : null;
    
    // Juego 3 - Inglés
    const game3_EN_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 3 && s.language === 'en'
    );
    const game3_EN_Pre = game3_EN_Sessions.length > 0 ? game3_EN_Sessions[0] : null;
    const game3_EN_Post = game3_EN_Sessions.length > 1 ? game3_EN_Sessions[game3_EN_Sessions.length - 1] : null;
    
    // Juego 4 - Español
    const game4_ES_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 4 && s.language === 'es'
    );
    const game4_ES_Pre = game4_ES_Sessions.length > 0 ? game4_ES_Sessions[0] : null;
    const game4_ES_Post = game4_ES_Sessions.length > 1 ? game4_ES_Sessions[game4_ES_Sessions.length - 1] : null;
    
    // Juego 4 - Inglés
    const game4_EN_Sessions = this.allSessions.filter(s => 
      s.studentCode === student.code && s.gameNumber === 4 && s.language === 'en'
    );
    const game4_EN_Pre = game4_EN_Sessions.length > 0 ? game4_EN_Sessions[0] : null;
    const game4_EN_Post = game4_EN_Sessions.length > 1 ? game4_EN_Sessions[game4_EN_Sessions.length - 1] : null;
    
    // ========== CALCULAR COHEN'S D ==========
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
    
    // ========== CALCULAR CORRELACIÓN INTRA-SUJETO (TRANSFERENCIA) ==========
    // Simplificado: diferencia entre mejoras (idealmente calcular r de Pearson)
    const transferencia_L1_L2 = (promedio_mejora_ES !== null && promedio_mejora_EN !== null) 
      ? Math.abs(promedio_mejora_ES - promedio_mejora_EN) 
      : null;
    
    // ========== CONSTRUIR FILA DE DATOS ==========
    const row = {
      // ===== IDENTIFICACIÓN =====
      ID_Estudiante: student.code,
      
      // ===== DEMOGRAFÍA =====
      Edad_Años: student.age || null,
      Edad_Meses: student.ageMonths || null,
      Genero: student.gender || 'N/A',
      NSE: student.nse || 'N/A',
      Idioma_Primario_L1: student.primaryLanguage || 'Español',
      Idioma_Hogar: student.language || 'Monolingüe',
      Exposicion_Lectura_Horas: student.readingHours || 0,
      Exposicion_Pantalla_Horas: student.screenHours || 0,
      ADHD_Screening: student.adhd || 'Negativo',
      
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
      J2_ES_Pre_Precision: game2_ES_Pre ? game2_ES_Pre.accuracy : null,
      J2_ES_Pre_Tiempo: game2_ES_Pre ? game2_ES_Pre.totalGameTime : null,
      J2_ES_Post_Precision: game2_ES_Post ? game2_ES_Post.accuracy : null,
      J2_ES_Post_Tiempo: game2_ES_Post ? game2_ES_Post.totalGameTime : null,
      J2_ES_Dif_Precision: this.calcDiff(game2_ES_Pre, game2_ES_Post, 'accuracy'),
      J2_ES_Dif_Tiempo: this.calcDiff(game2_ES_Pre, game2_ES_Post, 'totalGameTime'),
      J2_ES_Cohen_d: cohensD_J2_ES,
      J2_ES_Puntos: game2_ES_Post ? game2_ES_Post.totalScore : null,
      
      // ===== JUEGO 2: MEMORIA DE TRABAJO - INGLÉS =====
      J2_EN_Pre_Precision: game2_EN_Pre ? game2_EN_Pre.accuracy : null,
      J2_EN_Pre_Tiempo: game2_EN_Pre ? game2_EN_Pre.totalGameTime : null,
      J2_EN_Post_Precision: game2_EN_Post ? game2_EN_Post.accuracy : null,
      J2_EN_Post_Tiempo: game2_EN_Post ? game2_EN_Post.totalGameTime : null,
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
      
      // ===== JUEGO 4: RECONOCIMIENTO - ESPAÑOL =====
      J4_ES_Pre_Precision: game4_ES_Pre ? game4_ES_Pre.accuracy : null,
      J4_ES_Pre_Tiempo: game4_ES_Pre ? game4_ES_Pre.averageReactionTime : null,
      J4_ES_Post_Precision: game4_ES_Post ? game4_ES_Post.accuracy : null,
      J4_ES_Post_Tiempo: game4_ES_Post ? game4_ES_Post.averageReactionTime : null,
      J4_ES_Dif_Precision: this.calcDiff(game4_ES_Pre, game4_ES_Post, 'accuracy'),
      J4_ES_Dif_Tiempo: this.calcDiff(game4_ES_Pre, game4_ES_Post, 'averageReactionTime'),
      J4_ES_Cohen_d: cohensD_J4_ES,
      J4_ES_Puntos: game4_ES_Post ? game4_ES_Post.totalScore : null,
      
      // ===== JUEGO 4: RECONOCIMIENTO - INGLÉS =====
      J4_EN_Pre_Precision: game4_EN_Pre ? game4_EN_Pre.accuracy : null,
      J4_EN_Pre_Tiempo: game4_EN_Pre ? game4_EN_Pre.averageReactionTime : null,
      J4_EN_Post_Precision: game4_EN_Post ? game4_EN_Post.accuracy : null,
      J4_EN_Post_Tiempo: game4_EN_Post ? game4_EN_Post.averageReactionTime : null,
      J4_EN_Dif_Precision: this.calcDiff(game4_EN_Pre, game4_EN_Post, 'accuracy'),
      J4_EN_Dif_Tiempo: this.calcDiff(game4_EN_Pre, game4_EN_Post, 'averageReactionTime'),
      J4_EN_Cohen_d: cohensD_J4_EN,
      J4_EN_Puntos: game4_EN_Post ? game4_EN_Post.totalScore : null,
      
      // ===== TEST ESTANDARIZADO EXTERNO (DIBELS) =====
      Test_DIBELS_Pre: student.dibelsPre || null,
      Test_DIBELS_Post: student.dibelsPost || null,
      Test_DIBELS_Dif: (student.dibelsPost && student.dibelsPre) 
        ? student.dibelsPost - student.dibelsPre 
        : null,
      
      // ===== VARIABLES CALCULADAS =====
      Promedio_Mejora_L1_Español: promedio_mejora_ES,
      Promedio_Mejora_L2_Inglés: promedio_mejora_EN,
      Diferencia_Mejora_L1_L2: transferencia_L1_L2,
      
      Promedio_Cohen_d_Español: this.mean([cohensD_J1_ES, cohensD_J2_ES, cohensD_J3_ES, cohensD_J4_ES].filter(v => v !== null)),
      Promedio_Cohen_d_Inglés: this.mean([cohensD_J1_EN, cohensD_J2_EN, cohensD_J3_EN, cohensD_J4_EN].filter(v => v !== null)),
      
      Completo_4_Juegos: student.allGamesCompleted ? 'Sí' : 'No',
      Total_Sesiones: student.totalSessions || 0,
      
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
  // Calcular Cohen's d = (M_post - M_pre) / SD_pooled
  if (!preSession || !postSession || !preSession[field] || !postSession[field]) {
    return null;
  }
  
  const M_pre = preSession[field];
  const M_post = postSession[field];
  
  // Estimación de SD usando 15% de la media como aproximación
  // (En datos reales deberías tener SD guardado en cada sesión)
  const SD_pre = M_pre * 0.15;
  const SD_post = M_post * 0.15;
  
  // SD pooled = sqrt((SD_pre² + SD_post²) / 2)
  const SD_pooled = Math.sqrt((Math.pow(SD_pre, 2) + Math.pow(SD_post, 2)) / 2);
  
  if (SD_pooled === 0) return null;
  
  const d = (M_post - M_pre) / SD_pooled;
  
  return parseFloat(d.toFixed(2));
}

  // =============================================
  // EXPORTACIÓN: POR JUEGO INDIVIDUAL
  // =============================================

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
    
    // ===== JUEGOS 2, 3, 4 (mismo patrón) =====
    { Variable: 'J2_ES_Pre_Precision', Descripcion: 'J2 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_ES_Post_Precision', Descripcion: 'J2 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_ES_Cohen_d', Descripcion: 'J2 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'J2_EN_Pre_Precision', Descripcion: 'J2 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_EN_Post_Precision', Descripcion: 'J2 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J2_EN_Cohen_d', Descripcion: 'J2 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    { Variable: 'J3_ES_Pre_Precision', Descripcion: 'J3 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_ES_Post_Precision', Descripcion: 'J3 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_ES_Cohen_d', Descripcion: 'J3 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'J3_EN_Pre_Precision', Descripcion: 'J3 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_EN_Post_Precision', Descripcion: 'J3 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J3_EN_Cohen_d', Descripcion: 'J3 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    { Variable: 'J4_ES_Pre_Precision', Descripcion: 'J4 Español - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_ES_Post_Precision', Descripcion: 'J4 Español - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_ES_Cohen_d', Descripcion: 'J4 Español - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'J4_EN_Pre_Precision', Descripcion: 'J4 Inglés - Precisión Pre-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_EN_Post_Precision', Descripcion: 'J4 Inglés - Precisión Post-Test (%)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'J4_EN_Cohen_d', Descripcion: 'J4 Inglés - Tamaño de Efecto', Tipo: 'Escala', Valores: '-3 a +3' },
    
    // ===== TEST EXTERNO =====
    { Variable: 'Test_DIBELS_Pre', Descripcion: 'DIBELS Pre-Test (LNF+FSF)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'Test_DIBELS_Post', Descripcion: 'DIBELS Post-Test (LNF+FSF)', Tipo: 'Escala', Valores: '0-100' },
    { Variable: 'Test_DIBELS_Dif', Descripcion: 'DIBELS Ganancia (Post-Pre)', Tipo: 'Escala', Valores: '-100 a +100' },
    
    // ===== VARIABLES CALCULADAS =====
    { Variable: 'Promedio_Mejora_L1_Español', Descripcion: 'Promedio de ganancias en español (4 juegos)', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'Promedio_Mejora_L2_Inglés', Descripcion: 'Promedio de ganancias en inglés (4 juegos)', Tipo: 'Escala', Valores: '-100 a +100' },
    { Variable: 'Diferencia_Mejora_L1_L2', Descripcion: 'Diferencia absoluta entre mejoras L1 y L2', Tipo: 'Escala', Valores: '0-200' },
    { Variable: 'Promedio_Cohen_d_Español', Descripcion: 'Promedio de tamaños de efecto en español', Tipo: 'Escala', Valores: '-3 a +3' },
    { Variable: 'Promedio_Cohen_d_Inglés', Descripcion: 'Promedio de tamaños de efecto en inglés', Tipo: 'Escala', Valores: '-3 a +3' },
    
    { Variable: 'Completo_4_Juegos', Descripcion: 'Completó los 4 juegos', Tipo: 'Nominal', Valores: 'Sí, No' }
  ];
}

  // =============================================
  // ESTADÍSTICAS DESCRIPTIVAS
  // =============================================

  calculateDescriptiveStats(data) {
    const stats = [];
    
    const numericFields = [
      'J1_Pre_Precision', 'J1_Post_Precision', 'J1_Dif_Precision',
      'J2_Pre_Precision', 'J2_Post_Precision', 'J2_Dif_Precision',
      'J3_Pre_Precision', 'J3_Post_Precision', 'J3_Dif_Precision',
      'J4_Pre_Precision', 'J4_Post_Precision', 'J4_Dif_Precision'
    ];
    
    for (let field of numericFields) {
      const values = data.map(d => d[field]).filter(v => v !== null && !isNaN(v));
      
      if (values.length > 0) {
        stats.push({
          Variable: field,
          N: values.length,
          Media: this.mean(values).toFixed(2),
          Mediana: this.median(values).toFixed(2),
          Desviacion_Estandar: this.std(values).toFixed(2),
          Minimo: Math.min(...values).toFixed(2),
          Maximo: Math.max(...values).toFixed(2)
        });
      }
    }
    
    return stats;
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