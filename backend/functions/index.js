const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Función para obtener estímulos
exports.getStimuli = functions.https.onCall(async (data, context) => {
  const { language } = data;
  
  try {
    const snapshot = await admin.firestore()
      .collection('stimuli')
      .where('language', '==', language)
      .get();
    
    const stimuli = {};
    snapshot.forEach(doc => {
      stimuli[doc.id] = doc.data();
    });
    
    return { stimuli };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Función para crear sesión
exports.createSession = functions.https.onCall(async (data, context) => {
  const { studentId, language, gameVersion } = data;
  
  const sessionRef = admin.database().ref('games/silabas_danzantes/sessions').push();
  const sessionId = sessionRef.key;
  
  await sessionRef.set({
    studentId,
    language,
    gameVersion,
    createdAt: admin.database.ServerValue.TIMESTAMP,
    status: 'active'
  });
  
  return { sessionId };
});

// Función para finalizar sesión
exports.endSession = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;
  
  await admin.database()
    .ref(`games/silabas_danzantes/sessions/${sessionId}`)
    .update({
      status: 'completed',
      completedAt: admin.database.ServerValue.TIMESTAMP
    });
  
  return { success: true };
});