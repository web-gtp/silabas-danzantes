// frontend/js/main.js
// Punto de entrada de la aplicación

// ASEGURAR que el loading esté oculto al inicio
document.addEventListener('DOMContentLoaded', () => {
  // Ocultar spinner inmediatamente
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.setAttribute('hidden', '');
  }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Aplicación iniciando...');

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

    // Crear instancia del juego
    const game = new SilabasDanzantesGame();

    // Inicializar juego
    await game.init();

    // OCULTAR SPINNER después de inicializar
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
    }

    // Hacer instancia global para debugging
    window.game = game;

    console.log('🎮 Juego listo para jugar');

  } catch (error) {
    console.error('❌ Error iniciando aplicación:', error);
    
    // Ocultar spinner aunque haya error
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.setAttribute('hidden', '');
    }
    
    document.body.innerHTML = `
      <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
        <h1>Error al cargar la aplicación</h1>
        <p>${error.message}</p>
        <button onclick="location.reload()">Recargar página</button>
      </div>
    `;
  }
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  Logger.error('Error no capturado', event.error);
});

// Manejar rechazos de promesas no capturados
window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Promesa rechazada no capturada', event.reason);
  event.preventDefault();
});