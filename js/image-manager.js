// js/image-manager.js
// ============================================================
// GESTOR DE IMÁGENES - Reemplaza emojis por imágenes propias
// 
// CÓMO FUNCIONA:
//   1. Cada palabra tiene un ID de imagen (el mismo ID del estímulo)
//   2. Las imágenes se buscan en la carpeta /images/{language}/{word}.png
//   3. Si no existe imagen local, usa Firebase Storage como fallback
//   4. Si tampoco hay en Storage, muestra un emoji como último recurso
//
// ESTRUCTURA DE CARPETAS ESPERADA:
//   /images/
//     es/
//       sol.png, mar.png, pan.png, gato.png, casa.png...
//     en/
//       sun.png, cat.png, dog.png, moon.png, star.png...
//
// TAMAÑO RECOMENDADO: 256x256px PNG con fondo transparente
// ============================================================

class ImageManager {
  constructor() {
    // Base path for local images
    this.basePath = 'images';
    
    // Cache de imágenes ya verificadas (evita re-verificar)
    this.imageCache = new Map();
    
    // Modo: 'local' | 'firebase' | 'emoji' (fallback)
    this.mode = 'local';
    
    // Firebase Storage reference (se inicializa si es necesario)
    this.storageRef = null;
    
    // Emoji fallback map (el que ya existe en game.js)
    this.emojiMap = this._buildEmojiMap();
    
    // Preload queue
    this.preloadQueue = [];
    this.isPreloading = false;
    
    Logger.log('🖼️ ImageManager inicializado');
  }

  // ============================================================
  // MÉTODO PRINCIPAL: obtener elemento visual para una palabra
  // Retorna un elemento DOM (<img> o <span> con emoji)
  // ============================================================
  getImageElement(word, language = 'es', options = {}) {
    const {
      width = 200,
      height = 200,
      className = 'stimulus-image',
      alt = word
    } = options;

    const container = document.createElement('div');
    container.className = 'image-container ' + className;
    container.style.width = width + 'px';
    container.style.height = height + 'px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    // Normalizar palabra para nombre de archivo
    const fileName = this._normalizeFileName(word);
    const localPath = `${this.basePath}/${language}/${fileName}.png`;

    // Crear imagen
    const img = document.createElement('img');
    img.className = 'word-image';
    img.alt = alt;
    img.title = word;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.draggable = false;

    // Intentar cargar imagen local
    img.src = localPath;
    
    img.onload = () => {
      // Imagen local encontrada
      this.imageCache.set(`${language}_${word}`, localPath);
      container.innerHTML = '';
      container.appendChild(img);
    };

    img.onerror = () => {
      // No hay imagen local → intentar Firebase Storage
      this._tryFirebaseStorage(word, language, img, container, width);
    };

    // Mientras carga, mostrar emoji como placeholder
    const placeholder = document.createElement('span');
    placeholder.className = 'image-placeholder';
    placeholder.style.fontSize = (width * 0.6) + 'px';
    placeholder.style.lineHeight = '1';
    placeholder.textContent = this.getEmoji(word);
    container.appendChild(placeholder);

    return container;
  }

  // ============================================================
  // MÉTODO SIMPLIFICADO: obtener URL de imagen (para backgrounds etc)
  // ============================================================
  getImageUrl(word, language = 'es') {
    const cached = this.imageCache.get(`${language}_${word}`);
    if (cached) return cached;
    
    const fileName = this._normalizeFileName(word);
    return `${this.basePath}/${language}/${fileName}.png`;
  }

  // ============================================================
  // PRECARGAR imágenes para una lista de estímulos
  // ============================================================
  async preloadImages(stimuli, language = 'es') {
    if (this.isPreloading) return;
    this.isPreloading = true;
    
    let loaded = 0;
    let failed = 0;
    
    const promises = stimuli.map(stimulus => {
      return new Promise((resolve) => {
        const word = stimulus.word || stimulus;
        const fileName = this._normalizeFileName(word);
        const path = `${this.basePath}/${language}/${fileName}.png`;
        
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(`${language}_${word}`, path);
          loaded++;
          resolve(true);
        };
        img.onerror = () => {
          failed++;
          resolve(false);
        };
        img.src = path;
      });
    });

    await Promise.all(promises);
    this.isPreloading = false;
    
    Logger.log(`🖼️ Precarga: ${loaded} OK, ${failed} sin imagen (usarán emoji)`);
    return { loaded, failed, total: stimuli.length };
  }

  // ============================================================
  // VERIFICAR qué imágenes faltan (para el admin)
  // ============================================================
  async checkMissingImages(stimuli, language = 'es') {
    const missing = [];
    const found = [];

    for (const stimulus of stimuli) {
      const word = stimulus.word || stimulus;
      const fileName = this._normalizeFileName(word);
      const path = `${this.basePath}/${language}/${fileName}.png`;
      
      const exists = await this._imageExists(path);
      if (exists) {
        found.push({ word, path });
      } else {
        missing.push({ 
          word, 
          expectedPath: path,
          emoji: this.getEmoji(word)
        });
      }
    }

    return { found, missing };
  }

  // ============================================================
  // GENERAR LISTA DE IMÁGENES NECESARIAS (para que el usuario sepa qué subir)
  // ============================================================
  generateImageList(stimuli) {
    const list = {
      es: { nivel1: [], nivel2: [], nivel3: [] },
      en: { nivel1: [], nivel2: [], nivel3: [] }
    };

    for (const s of stimuli) {
      const lang = s.language || 'es';
      const diff = s.difficulty || 2;
      const nivel = `nivel${diff}`;
      
      if (list[lang] && list[lang][nivel]) {
        list[lang][nivel].push({
          word: s.word,
          fileName: this._normalizeFileName(s.word) + '.png',
          currentEmoji: this.getEmoji(s.word)
        });
      }
    }

    return list;
  }

  // ============================================================
  // FIREBASE STORAGE FALLBACK
  // ============================================================
  async _tryFirebaseStorage(word, language, imgElement, container, width) {
    try {
      if (typeof firebase !== 'undefined' && firebase.storage) {
        if (!this.storageRef) {
          this.storageRef = firebase.storage().ref();
        }
        
        const fileName = this._normalizeFileName(word);
        const storagePath = `images/${language}/${fileName}.png`;
        
        const url = await this.storageRef.child(storagePath).getDownloadURL();
        imgElement.src = url;
        this.imageCache.set(`${language}_${word}`, url);
        
        imgElement.onload = () => {
          container.innerHTML = '';
          container.appendChild(imgElement);
        };
        imgElement.onerror = () => {
          this._showEmojiInContainer(container, word, width);
        };
        return;
      }
    } catch (e) {
      // Firebase Storage no disponible o imagen no encontrada
    }
    
    // Último recurso: mostrar emoji
    this._showEmojiInContainer(container, word, width);
  }

  // ============================================================
  // MOSTRAR EMOJI COMO FALLBACK
  // ============================================================
  _showEmojiInContainer(container, word, width = 200) {
    container.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'emoji-fallback';
    span.style.fontSize = (width * 0.6) + 'px';
    span.style.lineHeight = '1';
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.width = '100%';
    span.style.height = '100%';
    span.textContent = this.getEmoji(word);
    container.appendChild(span);
  }

  // ============================================================
  // OBTENER EMOJI (fallback)
  // ============================================================
  getEmoji(word) {
    if (!word) return '📝';
    const key = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.emojiMap[word] || this.emojiMap[word.toLowerCase()] || this.emojiMap[key] || '📝';
  }

  // ============================================================
  // NORMALIZAR nombre de archivo
  // Quita acentos, espacios, caracteres especiales
  // ============================================================
  _normalizeFileName(word) {
    return word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Quitar acentos
      .replace(/ñ/g, 'n')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]/g, '_')      // Reemplazar especiales con _
      .replace(/_+/g, '_')             // Limpiar _ múltiples
      .replace(/^_|_$/g, '');           // Quitar _ al inicio/final
  }

  // ============================================================
  // VERIFICAR si una imagen existe
  // ============================================================
  _imageExists(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = path;
    });
  }

  // ============================================================
  // MAPA DE EMOJIS COMPLETO (fallback)
  // ============================================================
  _buildEmojiMap() {
    return {
      // ESPAÑOL NIVEL 1
      'sol':'☀️','mar':'🌊','pan':'🍞','pez':'🐟','luz':'💡',
      'flor':'🌸','gato':'🐱','casa':'🏠','perro':'🐶','luna':'🌙',
      'mesa':'🪑','silla':'🪑','libro':'📖','niño':'👦','boca':'👄',
      'mano':'✋','pelo':'💇','agua':'💧','cama':'🛏️','vaca':'🐄',
      'pato':'🦆','sapo':'🐸','oso':'🐻','lobo':'🐺','rata':'🐀',
      'loro':'🦜','puma':'🐆','coco':'🥥','uva':'🍇','pera':'🍐',
      'piña':'🍍','toro':'🐂','rosa':'🌹','nube':'☁️','dedo':'☝️',
      'codo':'💪','pie':'🦶','ojo':'👁️','cara':'😊','ropa':'👕',
      'mono':'🐵','foca':'🦭','dado':'🎲','lana':'🧶','palo':'🪵',
      'sopa':'🍲','bote':'⛵','taza':'☕','cuna':'🍼','lupa':'🔍','tren':'🚂',
      // ESPAÑOL NIVEL 2
      'helado':'🍦','pelota':'⚽','zapato':'👟','camisa':'👔','ventana':'🪟',
      'tomate':'🍅','patata':'🥔','banana':'🍌','manzana':'🍎','naranja':'🍊',
      'paloma':'🕊️','tortuga':'🐢','gallina':'🐔','conejo':'🐰','caballo':'🐴',
      'oveja':'🐑','jirafa':'🦒','camello':'🐪','cebra':'🦓','tijera':'✂️',
      'cuchara':'🥄','tenedor':'🍴','cuchillo':'🔪','cocina':'🍳','guitarra':'🎸',
      'hamster':'🐹','sandía':'🍉','pepino':'🥒','tambor':'🥁','cereza':'🍒',
      'cohete':'🚀','botella':'🍼','espejo':'🪞','colores':'🖍️','maleta':'🧳',
      'corona':'👑','bufanda':'🧣','cigüeña':'🦢','planeta':'🪐','estrella':'⭐',
      'cometa':'☄️','montaña':'⛰️','pingüino':'🐧','ballena':'🐋','linterna':'🔦',
      'papaya':'🥭','maíz':'🌽','semilla':'🌱','canguro':'🦘','tobillo':'🦵',
      'galleta':'🍪','paraguas':'☂️','langosta':'🦞','corazón':'❤️',
      // ESPAÑOL NIVEL 3
      'mariposa':'🦋','elefante':'🐘','hipopótamo':'🦛','rinoceronte':'🦏',
      'cocodrilo':'🐊','dinosaurio':'🦕','helicóptero':'🚁','computadora':'💻',
      'television':'📺','refrigerador':'🧊','automóvil':'🚗','bicicleta':'🚲',
      'motocicleta':'🏍️','paracaídas':'🪂','telescopio':'🔭','microscopio':'🔬',
      'termómetro':'🌡️','calendario':'📅','diccionario':'📚','biblioteca':'📚',
      'universidad':'🎓','laboratorio':'🧪','experimento':'🔬','astronauta':'👨‍🚀',
      'videojuego':'🎮','fotografía':'📷','carretera':'🛣️','semáforo':'🚦',
      'ambulancia':'🚑','medicina':'💊','enfermera':'👩‍⚕️','bombero':'👨‍🚒',
      'policía':'👮','superhéroe':'🦸','princesa':'👸','unicornio':'🦄',
      'arcoíris':'🌈','trampolín':'🤸','tobogán':'🛝','columpio':'🎢',
      'carrusel':'🎠','payaso':'🤡','malabarista':'🤹','equilibrista':'🎪',
      'acróbata':'🤸','trapecista':'🎪','domador':'🦁','zanahoria':'🥕',
      'dragón':'🐉','circo':'🎪',
      // INGLÉS NIVEL 1
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
      // INGLÉS NIVEL 2
      'apple':'🍎','water':'💧','pencil':'✏️','rabbit':'🐰','window':'🪟',
      'monkey':'🐵','basket':'🧺','button':'🔘','carrot':'🥕','chicken':'🐔',
      'cookie':'🍪','doctor':'👨‍⚕️','dragon':'🐉','finger':'☝️','flower':'🌸',
      'garden':'🏡','hammer':'🔨','helmet':'⛑️','jacket':'🧥','kitten':'🐱',
      'ladder':'🪜','lemon':'🍋','letter':'✉️','muffin':'🧁','orange':'🍊',
      'panda':'🐼','parrot':'🦜','pepper':'🌶️','pillow':'🛏️','planet':'🪐',
      'mango':'🥭','rocket':'🚀','robot':'🤖','sister':'👧','spider':'🕷️',
      'tiger':'🐯','tomato':'🍅','turtle':'🐢','mushroom':'🍄','winter':'❄️',
      'brother':'👦','birthday':'🎂','thunder':'⛈️','butter':'🧈','scarf':'🧣',
      'candle':'🕯️','cactus':'🌵','castle':'🏰','mitten':'🧤','puzzle':'🧩',
      'pickle':'🥒','penguin':'🐧',
      // INGLÉS NIVEL 3
      'bicycle':'🚲','butterfly':'🦋','elephant':'🐘','dinosaur':'🦕','hamburger':'🍔',
      'helicopter':'🚁','umbrella':'☂️','telephone':'📱','computer':'💻',
      'television':'📺','kangaroo':'🦘','watermelon':'🍉','strawberry':'🍓',
      'chocolate':'🍫','photograph':'📷','basketball':'🏀','motorcycle':'🏍️',
      'crocodile':'🐊','octopus':'🐙','caterpillar':'🐛','blueberry':'🫐',
      'pineapple':'🍍','avocado':'🥑','broccoli':'🥦','ambulance':'🚑',
      'astronaut':'👨‍🚀','microscope':'🔬','telescope':'🔭','thermometer':'🌡️',
      'calculator':'🧮','dictionary':'📚','library':'📚','hospital':'🏥',
      'trampoline':'🤸','parachute':'🪂','binoculars':'🔭','alligator':'🐊',
      'jellyfish':'🪼','dragonfly':'🦟','ladybug':'🐞','raspberry':'🍓',
      'cauliflower':'🥦','supermarket':'🛒','restaurant':'🍽️','playground':'🛝',
      'accordion':'🪗','xylophone':'🎼','harmonica':'🎷','vegetables':'🥗',
      'volcano':'🌋','centipede':'🐛','university':'🎓',
      // RIMAS (Juego 4)
      'gato':'🐱','pato':'🦆','rana':'🐸','miel':'🍯','ratón':'🐭',
      'león':'🦁','botón':'🔘','melón':'🍈','camión':'🚛','avión':'✈️',
      'tren':'🚂','cien':'💯'
    };
  }
}

// ============================================================
// INSTANCIA GLOBAL
// ============================================================
const imageManager = new ImageManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.imageManager = imageManager;
  window.ImageManager = ImageManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageManager;
}
