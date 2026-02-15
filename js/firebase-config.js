// frontend/js/firebase-config.js
// Configuración de Firebase (Sintaxis Compat para uso sin módulos)

// 🔑 Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCL7MMQ5-vrJV02h4SU9meCq4IWp4F_h5w",
  authDomain: "silabas-danzantes-2026.firebaseapp.com",
  databaseURL: "https://silabas-danzantes-2026-default-rtdb.firebaseio.com",
  projectId: "silabas-danzantes-2026",
  storageBucket: "silabas-danzantes-2026.firebasestorage.app",
  messagingSenderId: "282584372078",
  appId: "1:282584372078:web:4d7cbcc47e63dad5cde77f"
};

console.log('🔧 Inicializando Firebase...');

// Inicializar Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  throw error;
}

// Obtener referencias
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✅ Referencias de Firebase creadas');

// Crear usuario anónimo si no existe
auth.onAuthStateChanged((user) => {
  if (!user) {
    console.log('👤 Creando usuario anónimo...');
    auth.signInAnonymously()
      .then(() => {
        console.log("✅ Usuario anónimo autenticado");
      })
      .catch((error) => {
        console.error("❌ Error en autenticación:", error);
      });
  } else {
    console.log("✅ Usuario ya autenticado:", user.uid);
  }
});

// Analytics (opcional)
let analytics = null;
try {
  if (typeof firebase.analytics === 'function') {
    analytics = firebase.analytics();
    console.log('✅ Analytics inicializado');
  }
} catch (e) {
  console.warn('⚠️ Analytics no disponible (normal en desarrollo)');
}