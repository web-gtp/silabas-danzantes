// frontend/js/main3.js
// Punto de entrada de la aplicación - Juego 3: Palabras Secretas

// Ocultar spinner al inicio
document.addEventListener('DOMContentLoaded', () => {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.setAttribute('hidden', '');
  }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando Palabras Secretas (Juego 3)...');

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

    // Crear instancia del juego 3
    const game = new PalabrasSecretasGame();

    // Inicializar juego
    await game.init();

    // Ocultar spinner después de inicializar
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
    }

    // Hacer instancia global para debugging
    window.game3 = game;

    console.log('🔤 Palabras Secretas listo para jugar');

  } catch (error) {
    console.error('❌ Error iniciando Juego 3:', error);
    
    // Ocultar spinner aunque haya error
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.setAttribute('hidden', '');
    }
    
    document.body.innerHTML = `
      <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
        <h1>❌ Error al cargar Palabras Secretas</h1>
        <p>${error.message}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 10px;">
          🔄 Recargar página
        </button>
        <br>
        <a href="game2.html" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #FF6B9D; color: white; text-decoration: none; border-radius: 8px;">
          ⬅️ Volver al Juego 2
        </a>
      </div>
    `;
  }
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  Logger.error('Error no capturado en Juego 3', event.error);
});

// Manejar rechazos de promesas no capturados
window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Promesa rechazada no capturada en Juego 3', event.reason);
  event.preventDefault();
});