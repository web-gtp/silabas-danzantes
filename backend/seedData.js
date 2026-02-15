const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 🎯 Importar tus archivos JSON
const estimulosES = require('./estimulos-es.json');
const estimulosEN = require('./estimulos-en.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Convertir objetos a arrays y AGREGAR campo language
const palabrasES = Object.values(estimulosES).map(p => ({
  ...p,
  language: 'es'  // ← AGREGAR IDIOMA
}));

const palabrasEN = Object.values(estimulosEN).map(p => ({
  ...p,
  language: 'en'  // ← AGREGAR IDIOMA
}));

// Combinar ambos idiomas
const todasLasPalabras = [...palabrasES, ...palabrasEN];

async function cargarPalabras() {
  console.log('🌱 Cargando palabras a Firebase...');
  
  try {
    const batch = db.batch();
    
    todasLasPalabras.forEach((palabra) => {
      const docRef = db.collection('stimuli').doc(palabra.id);
      batch.set(docRef, palabra, { merge: true });  // ← merge: true para actualizar
    });
    
    await batch.commit();
    
    console.log(`✅ Se cargaron ${todasLasPalabras.length} palabras correctamente`);
    console.log(`   - Español: ${palabrasES.length}`);
    console.log(`   - Inglés: ${palabrasEN.length}`);
    
    // Verificar que tienen el campo language
    console.log('\n📋 Verificando estructura de datos:');
    console.log('Ejemplo palabra ES:', palabrasES[0]);
    console.log('Ejemplo palabra EN:', palabrasEN[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

cargarPalabras();