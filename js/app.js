// ============================================
// ARVET - APP PRINCIPAL (CONSOLIDADO)
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxE-UiI85pCcUYq5LqJjN7UU7aOtXsVV_7Hyag-hYgOT4LcjGhVQaDt6js9PEQQ6E9Z/exec';

// ============================================
// UTILIDADES GLOBALES
// ============================================

// Exponer funciones globalmente para asegurar disponibilidad
window.API_URL = API_URL;

window.fetchAPI = async function(action, params = {}) {
    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${API_URL}?${queryParams}`;
    console.log('fetchAPI URL:', url);
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('fetchAPI respuesta:', data);
        return data;
    } catch (error) {
        console.error('Error en fetchAPI:', error);
        throw error;
    }
};

window.postAPI = async function(action, data) {
    const response = await fetch(`${API_URL}?action=${action}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    return await response.json();
};

window.formatDate = function(dateString) {
    const date = new Date(dateString);
    return {
        dia: date.getDate(),
        mes: date.toLocaleDateString('es-ES', { month: 'short' }),
        completa: date.toLocaleDateString('es-ES')
    };
};

window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(amount);
};

// ============================================
// DETECTOR DE PÁGINA ACTUAL (VERSIÓN NUEVA)
// ============================================

function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop();

    // Si estamos en equipo.html
    if (page === 'equipo.html') {
        return 'equipo';
    }

    // Si estamos en admin.html
    if (page === 'admin.html') {
        return 'admin';
    }

    // Si estamos en index o raíz
    if (!page || page === '' || page === 'index.html') {
        return 'index';
    }

    return page.replace('.html', '');
}

// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== APP.JS CARGADO ===');
    const page = getCurrentPage();
    console.log('Página detectada:', page);

    // Router de páginas
    switch(page) {
        case 'index':
        case '':
            console.log('Inicializando INDEX');
            initIndex();
            break;
        case 'login':
            console.log('Inicializando LOGIN');
            initLogin();
            break;
        case 'registro':
            console.log('Inicializando REGISTRO');
            initRegistro();
            break;
        case 'equipo':
            console.log('Inicializando EQUIPO');
            initEquipo();
            break;
        case 'admin':
            console.log('Inicializando ADMIN');
            initAdmin();
            break;
      case 'registro-jugador':
            console.log('Inicializando REGISTRO JUGADOR');
            initRegistroJugador();
            break;
        default:
            console.log('Página no reconocida:', page);
    }
});

// ============================================
// PÁGINA: INDEX (Home)
// ============================================

function initIndex() {
    console.log('Ejecutando initIndex');
    if (document.getElementById('paisesGrid')) {
        cargarPaises();
    }
    if (document.getElementById('partidosList')) {
        cargarProximosPartidos();
    }
}

async function cargarPaises() {
    const container = document.getElementById('paisesGrid');
    if (!container) return;
    
    try {
        const response = await window.fetchAPI('getPaises');
        if (response.success) {
            container.innerHTML = response.data.map(pais => `
                <div class="pais-card" onclick="filtrarPorPais('${pais.id}')">
                    <div class="pais-flag">${pais.flag || '🏳️'}</div>
                    <h3>${pais.nombre}</h3>
                    <p>${pais.cantidadEquipos || 0} equipos</p>
                </div>
            `).join('');
        }
    } catch (error) {
        container.innerHTML = '<p>Error al cargar países</p>';
    }
}

async function buscarEquipos() {
    const termino = document.getElementById('searchInput').value;
    const container = document.getElementById('searchResults');
    
    if (!termino) return;
    
    container.innerHTML = '<div class="loading">Buscando...</div>';
    
    try {
        const response = await window.fetchAPI('buscar', { termino });
        if (response.success && response.data.equipos.length > 0) {
            container.innerHTML = response.data.equipos.map(equipo => `
                <div class="card" onclick="window.location.href='equipo.html?slug=${equipo.slug}'">
                    <h3>${equipo.nombre}</h3>
                    <p>Ver perfil del equipo →</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No se encontraron equipos</p>';
        }
    } catch (error) {
        container.innerHTML = '<p>Error en la búsqueda</p>';
    }
}

async function cargarProximosPartidos() {
    const container = document.getElementById('partidosList');
    if (!container) return;
    
    try {
        const response = await window.fetchAPI('getProximosPartidos');
        if (response.success) {
            container.innerHTML = response.data.map(partido => {
                const fecha = window.formatDate(partido.fecha);
                return `
                    <div class="partido-card">
                        <div class="partido-info">
                            <h3>vs ${partido.rival}</h3>
                            <div class="partido-meta">
                                <span>📍 ${partido.lugar}</span>
                                <span>🕐 ${partido.hora}</span>
                                <span>💵 ${window.formatCurrency(partido.precioJugador)}</span>
                            </div>
                        </div>
                        <div class="partido-fecha">
                            <div class="dia">${fecha.dia}</div>
                            <div class="mes">${fecha.mes}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        container.innerHTML = '<p>Error al cargar partidos</p>';
    }
}

// ============================================
// PÁGINA: REGISTRO
// ============================================

function initRegistro() {
    const form = document.getElementById("formRegistro");
    const btn = document.getElementById("btnCrear");
    const loading = document.getElementById("loading");
    const msg = document.getElementById("msg");

    if (!form) {
        console.log('Formulario de registro no encontrado');
        return;
    }

    function showMessage(text, type) {
        msg.textContent = text;
        msg.className = "message " + type;
        msg.style.display = "block";
    }

    function setLoading(state) {
        btn.disabled = state;
        loading.style.display = state ? "block" : "none";
    }

    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        setLoading(true);
        msg.style.display = "none";

        const data = {
            nombre: document.getElementById('nombre').value.trim(),
            paisId: document.getElementById('paisId').value.trim(),
            provinciaId: document.getElementById('provinciaId').value.trim(),
            ciudadId: document.getElementById('ciudadId').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            adminNombre: document.getElementById('adminNombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch(
                `${API_URL}?action=crearEquipo` +
                `&nombre=${encodeURIComponent(data.nombre)}` +
                `&paisId=${encodeURIComponent(data.paisId)}` +
                `&provinciaId=${encodeURIComponent(data.provinciaId)}` +
                `&ciudadId=${encodeURIComponent(data.ciudadId)}` +
                `&direccion=${encodeURIComponent(data.direccion)}` +
                `&adminNombre=${encodeURIComponent(data.adminNombre)}` +
                `&email=${encodeURIComponent(data.email)}` +
                `&password=${encodeURIComponent(data.password)}`
            );

            const result = await response.json();

            if (result.success) {
                showMessage("Equipo creado correctamente ✅ Redirigiendo...", "success");
                localStorage.setItem("arvet_user", JSON.stringify(result.data.user));

                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 1500);
            } else {
                showMessage(result.error || "Error al crear equipo", "error");
                setLoading(false);
            }

        } catch (err) {
            showMessage("Error de conexión con el servidor", "error");
            setLoading(false);
        }
    });
}

// ============================================
// PÁGINA: LOGIN
// ============================================

function initLogin() {
    checkExistingSession();

    const form = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btnLogin');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('errorMsg');

    if (!form) {
        console.log('Formulario de login no encontrado');
        return;
    }

    function showError(message, persistente = false) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    if (!persistente) {
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 7000);
    }
}
    function setLoading(loading) {
        if (loading) {
            btnLogin.disabled = true;
            btnLogin.textContent = 'Verificando...';
            loadingDiv.style.display = 'block';
        } else {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar';
            loadingDiv.style.display = 'none';
        }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('Por favor completa todos los campos');
            return;
        }
        
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            );

            const data = await response.json();
            console.log('Respuesta del servidor:', data);

            if (data.success) {
                localStorage.setItem('arvet_user', JSON.stringify(data.user));

                const user = data.user;
                const rolesAdmin = ['Admin', 'Capitán', 'Manager'];

                if (rolesAdmin.includes(user.rol)) {
               window.location.href = 'admin.html';
               } else if (user.rol === 'Jugador') {
               window.location.href = 'panel-jugador.html';
               } else {
                window.location.href = 'index.html';
               }

           } else {

   if (data.mensajePersonalizado) {
        showError(data.mensajePersonalizado);
    } else {
        showError(data.error || 'Credenciales incorrectas');
    }

    setLoading(false);
}

        } catch (error) {
            console.error('Error de conexión:', error);
            showError('Error de conexión con el servidor');
            setLoading(false);
        }
    });
}

function checkExistingSession() {
    const user = localStorage.getItem('arvet_user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            const rolesAdmin = ['Admin', 'Capitán', 'Manager'];
            if (rolesAdmin.includes(userData.rol)) {
                window.location.href = 'admin.html';
            }
        } catch(e) {
            localStorage.removeItem('arvet_user');
        }
    }
}


// ============================================
// PÁGINA: REGISTRO JUGADOR
// ============================================

function initRegistroJugador() {
    console.log('=== INICIO REGISTRO JUGADOR ===');
    // 🔥 Cerrar cualquier sesión activa
    localStorage.removeItem('arvet_user');
 
    // 🔥 AVATAR DEFAULT
    let avatarUrl = "https://i.ibb.co/4pDNDk1/avatar1.png";

    const avatarPreview = document.getElementById('avatarPreview');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const avatarUpload = document.getElementById('avatarUpload');

    // Selección avatar predefinido
    avatarOptions.forEach(img => {
        img.addEventListener('click', function() {
            avatarUrl = this.src;
            avatarPreview.src = this.src;
        });
    });

    // Subida a imgbb
    avatarUpload.addEventListener('change', async function() {

        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        try {

            const response = await fetch("https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                avatarUrl = result.data.url;
                avatarPreview.src = avatarUrl;
            }

        } catch (error) {
            console.error("Error subiendo imagen:", error);
        }

    });
    
    // Obtener equipoId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const equipoId = urlParams.get('equipo');
    
    console.log('Equipo ID:', equipoId);
    
    if (!equipoId) {
        mostrarMensaje('Error: No se especificó el equipo', 'error');
        document.getElementById('formRegistroJugador').style.display = 'none';
        return;
    }
    
    // Guardar equipoId en el formulario
    document.getElementById('equipoId').value = equipoId;
    
    // Cargar nombre del equipo para mostrar
    cargarNombreEquipo(equipoId);
    
    // Manejar envío del formulario
    const form = document.getElementById('formRegistroJugador');
    const btn = document.getElementById('btnRegistro');
    const btnText = document.getElementById('btnText');
    const loading = document.getElementById('loading');
    const msg = document.getElementById('msg');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar contraseñas
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;
        
        if (password !== passwordConfirm) {
            mostrarMensaje('Las contraseñas no coinciden', 'error');
            return;
        }
        
        // Mostrar loading
        btn.disabled = true;
        btnText.style.display = 'none';
        loading.style.display = 'block';
        msg.style.display = 'none';
        
        const data = {
            nombre: document.getElementById('nombre').value.trim(),
            apellido: document.getElementById('apellido').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            dni: document.getElementById('dni').value.trim(),
            cuitCuil: document.getElementById('cuitCuil').value.trim(),
            password: password,
            equipoId: equipoId
        };
        
        console.log('Enviando datos:', data);
        
        try {
            const response = await fetch(
                `${API_URL}?action=crearJugador` +
                `&nombre=${encodeURIComponent(data.nombre)}` +
                `&apellido=${encodeURIComponent(data.apellido)}` +
                `&email=${encodeURIComponent(data.email)}` +
                `&telefono=${encodeURIComponent(data.telefono)}` +
                `&fechaNacimiento=${encodeURIComponent(data.fechaNacimiento)}` +
                `&dni=${encodeURIComponent(data.dni)}` +
                `&cuitCuil=${encodeURIComponent(data.cuitCuil)}` +
                `&password=${encodeURIComponent(data.password)}` +
                `&avatarUrl=${encodeURIComponent(avatarUrl)}` +
                `&equipoId=${encodeURIComponent(data.equipoId)}`
            );
            
            const result = await response.json();
            console.log('Respuesta:', result);
            
            if (result.success) {
                mostrarMensaje('✅ ' + result.message + ' Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                mostrarMensaje('❌ ' + (result.error || 'Error al registrar'), 'error');
                btn.disabled = false;
                btnText.style.display = 'inline';
                loading.style.display = 'none';
            }
            
        } catch (err) {
            console.error('Error:', err);
            mostrarMensaje('❌ Error de conexión con el servidor', 'error');
            btn.disabled = false;
            btnText.style.display = 'inline';
            loading.style.display = 'none';
        }
    });
}

async function cargarNombreEquipo(equipoId) {
    const nombreEquipoDiv = document.getElementById('nombreEquipo');
    
    try {
        // Intentar con getEquipoBySlug usando el ID (también es único)
        const response = await fetchAPI('getEquipoById', { id: equipoId });
        
        if (response.success) {
            // Mostrar nombre grande e ID chico abajo
            nombreEquipoDiv.innerHTML = `
                <div style="font-size: 20px; font-weight: 700; color: var(--primary);">
                    ${response.data.nombre}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 5px; font-family: monospace;">
                    ${equipoId}
                </div>
            `;
        } else {
            // Si no encuentra, mostrar solo el ID
            nombreEquipoDiv.innerHTML = `
                <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">
                    ${equipoId}
                </div>
            `;
        }
    } catch (e) {
        // Si falla, mostrar solo el ID
        nombreEquipoDiv.innerHTML = `
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">
                ${equipoId}
            </div>
        `;
    }
}
function mostrarMensaje(texto, tipo) {
    const msg = document.getElementById('msg');
    msg.textContent = texto;
    msg.className = 'message ' + tipo;
    msg.style.display = 'block';
    
    if (tipo === 'success') {
        msg.style.background = '#dcfce7';
        msg.style.color = '#166534';
        msg.style.border = '1px solid #86efac';
    } else {
        msg.style.background = '#fee2e2';
        msg.style.color = '#991b1b';
        msg.style.border = '1px solid #fca5a5';
    }
}
// ============================================
// PÁGINA: EQUIPO (PÚBLICO)
// ============================================

function initEquipo() {
    console.log('=== INICIO EQUIPO ===');
    console.log('URL completa:', window.location.href);
    console.log('Search:', window.location.search);
    console.log('Pathname:', window.location.pathname);
    
    let slug = null;
    
    // OPCIÓN 1: URL con ?slug=vvv (formato query string)
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug');
    console.log('Slug de query params:', slug);
    
   
    
    console.log('Slug final:', slug);
    
    if (!slug || slug === '' || slug === 'equipo') {
        console.error('❌ No se encontró slug válido');
        const header = document.getElementById('equipoHeader');
        if (header) {
            header.innerHTML = '<div class="error">Error: No se pudo identificar el equipo</div>';
        }
        return;
    }
    
    console.log('✅ Slug válido:', slug);
    
    // Verificar que fetchAPI esté disponible
    if (typeof window.fetchAPI !== 'function') {
        console.error('❌ fetchAPI no está disponible');
        return;
    }
    
    cargarEquipo(slug);
}

async function cargarEquipo(slug) {
    console.log('=== cargarEquipo ===');
    console.log('Llamando con slug:', slug);
    
    const header = document.getElementById('equipoHeader');
    const quienesSomos = document.getElementById('quienesSomosContent');
    const comisionGrid = document.getElementById('comisionGrid');
    const plantelGrid = document.getElementById('plantelGrid');
    const partidosList = document.getElementById('partidosEquipoList');
    const logoImg = document.getElementById('equipoLogo');
    
    try {
        console.log('Enviando a API: action=getEquipoBySlug, slug=' + slug);
        const response = await window.fetchAPI('getEquipoBySlug', { slug: slug });
        console.log('Respuesta completa:', response);

        if (!response.success) {
            console.error('Error:', response.error);
            if (header) {
                header.innerHTML = `<div class="error">Error: ${response.error}</div>`;
            }
            return;
        }

        const equipo = response.data;
        console.log('Equipo cargado:', equipo);
        window.currentSlug = slug;
        window.currentEquipoId = equipo.id;
        window.currentEquipo = equipo; // Guardar para la galería

        // Actualizar UI - Header
        if (header) {
            header.innerHTML = `
                <h1>${equipo.nombre}</h1>
                <p>${equipo.ciudad}, ${equipo.pais}</p>
                <p>${equipo.descripcion || ''}</p>
            `;
        }

        // 🔵 MOSTRAR LOGO SI EXISTE
        if (logoImg && equipo.logoUrl) {
            logoImg.src = equipo.logoUrl;
            logoImg.style.display = 'inline-block';
        }

        // Actualizar Quienes Somos
        if (quienesSomos) {
            quienesSomos.innerHTML = `
                <p>${equipo.historia || 'Sin información disponible'}</p>
                <p><strong>Fundación:</strong> ${equipo.fechaFundacion || 'N/A'}</p>
                <p><strong>Colores:</strong> ${equipo.colores || 'N/A'}</p>
            `;
        }

        // Cargar datos adicionales si hay ID
        if (equipo.id) {
            console.log('Cargando jugadores, partidos y galería para equipo ID:', equipo.id);
            if (comisionGrid && plantelGrid) {
                await cargarJugadoresEquipo(equipo.id);
            }
            if (partidosList) {
                await cargarPartidosEquipoPublico(equipo.id);
            }
            // 🔵 CARGAR GALERÍA
            await cargarGaleriaEquipo(equipo.id);
        }

        // Configurar mapa...
        if (equipo.lat && equipo.lng) {
            window.equipoCoords = {
                lat: parseFloat(equipo.lat),
                lng: parseFloat(equipo.lng)
            };
        } else {
            window.equipoCoords = { lat: -34.6037, lng: -58.3816 };
        }
        
        const mapContainer = document.getElementById('map');
        if (mapContainer && typeof L !== 'undefined') {
            inicializarMapa();
        }

    } catch (error) {
        console.error('❌ Error en cargarEquipo:', error);
        if (header) {
            header.innerHTML = '<div class="error">Error de conexión</div>';
        }
    }
}

// 🔵 NUEVA FUNCIÓN: Cargar Galería
async function cargarGaleriaEquipo(equipoId) {
    const container = document.getElementById('galeriaCarrusel');
    const dotsContainer = document.getElementById('galeriaDots');
    const sinGaleria = document.getElementById('sinGaleria');
    const btnPrev = document.getElementById('btnPrevGaleria');
    const btnNext = document.getElementById('btnNextGaleria');
    
    if (!container) return;
    
    try {
        const response = await window.fetchAPI('getGaleria', { equipoId });
        
        if (!response.success || !response.data || response.data.length === 0) {
            container.style.display = 'none';
            dotsContainer.style.display = 'none';
            sinGaleria.style.display = 'block';
            return;
        }
        
        const imagenes = response.data;
        console.log('Galería cargada:', imagenes.length, 'imágenes');
        
        // Generar HTML del carrusel
        container.innerHTML = imagenes.map((img, index) => `
            <div class="galeria-item" style="flex: 0 0 85%; scroll-snap-align: center; 
                                              border-radius: 12px; overflow: hidden; 
                                              box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <img src="${img.url}" alt="${img.descripcion || 'Foto del equipo'}" 
                     style="width: 100%; height: 250px; object-fit: cover; display: block;">
                ${img.descripcion ? `<p style="padding: 10px; margin: 0; background: white; font-size: 14px; color: #333;">${img.descripcion}</p>` : ''}
            </div>
        `).join('');
        
        // Generar dots indicadores
        dotsContainer.innerHTML = imagenes.map((_, index) => `
            <span class="galeria-dot" onclick="irAGaleria(${index})" 
                  style="width: 10px; height: 10px; border-radius: 50%; 
                         background: ${index === 0 ? 'var(--primary, #3b82f6)' : '#cbd5e1'}; 
                         cursor: pointer; transition: all 0.3s;"></span>
        `).join('');
        
        // Mostrar botones de navegación en desktop
        if (window.innerWidth > 768) {
            btnPrev.style.display = 'block';
            btnNext.style.display = 'block';
        }
        
        // Listener para actualizar dots al scroll
        container.addEventListener('scroll', () => {
            const scrollLeft = container.scrollLeft;
            const itemWidth = container.offsetWidth * 0.85 + 12; // 85% + gap
            const activeIndex = Math.round(scrollLeft / itemWidth);
            
            document.querySelectorAll('.galeria-dot').forEach((dot, idx) => {
                dot.style.background = idx === activeIndex ? 'var(--primary, #3b82f6)' : '#cbd5e1';
                dot.style.transform = idx === activeIndex ? 'scale(1.2)' : 'scale(1)';
            });
        });
        
    } catch (error) {
        console.error('Error cargando galería:', error);
        container.style.display = 'none';
        sinGaleria.style.display = 'block';
    }
}

// 🔵 FUNCIONES GLOBALES PARA GALERÍA
window.moverGaleria = function(direccion) {
    const container = document.getElementById('galeriaCarrusel');
    const itemWidth = container.offsetWidth * 0.85 + 12;
    container.scrollBy({ left: itemWidth * direccion, behavior: 'smooth' });
};

window.irAGaleria = function(index) {
    const container = document.getElementById('galeriaCarrusel');
    const itemWidth = container.offsetWidth * 0.85 + 12;
    container.scrollTo({ left: itemWidth * index, behavior: 'smooth' });
};
async function cargarJugadoresEquipo(equipoId) {
    console.log('Cargando jugadores para equipo:', equipoId);
    
    try {
        const response = await window.fetchAPI('getJugadores', { equipoId });
        if (!response.success) {
            console.log('No se pudieron cargar jugadores:', response.error);
            return;
        }
       const jugadores = Array.isArray(response.data)
    ? response.data.filter(j =>
        j.estado && j.estado.trim() === 'Activo'
      )
    : [];
       
        
        // Comisión: roles administrativos (todos los que tienen rol y no son "Jugador" puro)
        const comision = jugadores.filter(j => j.rol && j.rol !== 'Jugador');
        
        // Plantel: jugadores puros + admins (todos excepto los que son solo rol sin datos de jugador)
        const plantel = jugadores.filter(j => 
            !j.rol ||                          // Sin rol = jugador
            j.rol === 'Jugador' ||             // Rol Jugador explícito
            (j.rol && j.rol !== 'Jugador')     // Cualquier admin también va al plantel
        );
        
        const comisionGrid = document.getElementById('comisionGrid');
        const plantelGrid = document.getElementById('plantelGrid');
        
        if (comisionGrid) {
            comisionGrid.innerHTML = comision.map(j => `
                <div class="card">
                    <h3>${j.nombre} ${j.apellido}</h3>
                    <p class="badge badge-success">${j.rol}</p>
                </div>
            `).join('') || '<p>Sin comisión registrada</p>';
        }
        
        if (plantelGrid) {
            plantelGrid.innerHTML = plantel.map(j => `
                <div class="card">
                    <h3>#${j.numeroCamiseta || '-'} ${j.nombre} ${j.apellido}</h3>
                    <p>${j.posicion || 'Jugador'}</p>
                    ${j.rol && j.rol !== 'Jugador' ? `<small style="color: var(--primary); font-weight: 600;">🛡️ ${j.rol}</small>` : ''}
                </div>
            `).join('');
        }
        // Actualizar link del botón para unirse al equipo
document.getElementById('btnUnirse').href = `registro-jugador.html?equipo=${window.currentEquipoId}`;
        
    } catch (error) {
        console.error('Error cargando jugadores:', error);
    }
}
async function cargarPartidosEquipoPublico(equipoId) {
    console.log('Cargando partidos para equipo:', equipoId);
    
    try {
        const response = await window.fetchAPI('getPartidos', { equipoId });
        if (!response.success) {
            console.log('No se pudieron cargar partidos:', response.error);
            return;
        }
        
        const partidosList = document.getElementById('partidosEquipoList');
        if (!partidosList) return;
        
        if (response.data.length === 0) {
            partidosList.innerHTML = '<p>No hay partidos programados</p>';
            return;
        }
        
        partidosList.innerHTML = response.data.map(partido => {
            const fecha = window.formatDate(partido.fecha);
            return `
                <div class="partido-card">
                    <div class="partido-info">
                        <h3>vs ${partido.rival}</h3>
                        <div class="partido-meta">
                            <span>📍 ${partido.lugar}</span>
                            <span>🕐 ${partido.hora}</span>
                        </div>
                    </div>
                    <div class="partido-fecha">
                        <div class="dia">${fecha.dia}</div>
                        <div class="mes">${fecha.mes}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando partidos:', error);
    }
}

// ============================================

function initAdmin() {
    console.log('Iniciando Admin');
    
    let currentUser = null;

    try {
        const storedUser = localStorage.getItem('arvet_user');
        if (storedUser && storedUser !== "undefined") {
            currentUser = JSON.parse(storedUser);
            console.log('Usuario cargado:', currentUser);
        }
    } catch (e) {
        console.error("Error parseando usuario:", e);
        currentUser = null;
    }

    // 🔒 Protección de sesión REAL
    if (!currentUser || currentUser.rol !== "Admin") {
        console.log('Acceso no autorizado');
        localStorage.removeItem('admin_edit_jugador');
        window.location.href = "login.html";
        return;
    }

    // Datos de usuario
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const currentDateEl = document.getElementById('currentDate');

    if (userNameEl) userNameEl.textContent = currentUser.nombre || '';
    if (userRoleEl) userRoleEl.textContent = currentUser.rol || '';
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('es-ES');
    }

    // Botón sitio público
    const btn = document.getElementById('btnVerSitio');

    if (btn) {
        const BASE_PATH = window.location.pathname.includes('/Arvet') ? '/Arvet' : '';

        if (currentUser.slug) {
            btn.addEventListener('click', function() {
                window.location.href = `${BASE_PATH}/${currentUser.slug}`;
            });

        } else if (currentUser.equipoId) {
            btn.addEventListener('click', async function() {
                try {
                    const response = await window.fetchAPI('getEquipoBySlug', { 
                        slug: currentUser.equipoId 
                    });

                    if (response.success && response.data.slug) {
                        window.location.href = `${BASE_PATH}/${response.data.slug}`;
                    } else {
                        window.location.href = `${BASE_PATH}/${currentUser.equipoId}`;
                    }

                } catch (e) {
                    window.location.href = `${BASE_PATH}/${currentUser.equipoId}`;
                }
            });
        } 
    }

    // Inicializar funciones
    cargarDashboard();
    cargarJugadoresAdmin();
}

// ============================================
// DASHBOARD
// ============================================

async function cargarDashboard() {
    const statJugadores = document.getElementById('statJugadores');
    const statPartidos = document.getElementById('statPartidos');
    const statRecaudacion = document.getElementById('statRecaudacion');
    const statDeuda = document.getElementById('statDeuda');

    if (statJugadores) statJugadores.textContent = '25';
    if (statPartidos) statPartidos.textContent = '4';
    if (statRecaudacion) statRecaudacion.textContent = '$450.000';
    if (statDeuda) statDeuda.textContent = '$125.000';
}

// ============================================
// JUGADORES ADMIN CON APROBAR / PENDIENTE / ELIMINAR
// ============================================

async function cargarJugadoresAdmin() {
    console.log('=== cargarJugadoresAdmin ===');
    
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    
    if (!currentUser.equipoId) {
        console.log('❌ No hay equipoId');
        return;
    }
    
    try {
        const response = await window.fetchAPI('getJugadores', {
            equipoId: currentUser.equipoId
        });

        console.log('Respuesta jugadores:', response);

        if (response.success) {
            const container = document.getElementById('listaJugadores');
            
            if (!container) {
                console.error('❌ No existe #listaJugadores en el DOM');
                return;
            }

            if (response.data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No hay jugadores registrados</p>';
                return;
            }

            container.innerHTML = response.data.map(j => {
                const estado = j.estado || 'Pendiente';
                const isActivo = estado === 'Activo';
                
                const badgeClass = isActivo ? 'badge-success' : 'badge-warning';
                const badgeText = isActivo ? 'Activo' : 'Pendiente';

                const btnEstado = isActivo 
                    ? `<button class="btn-action btn-warning" onclick="cambiarEstadoJugador('${j.id}', 'Pendiente')">Pasar a Pendiente</button>`
                    : `<button class="btn-action btn-success" onclick="cambiarEstadoJugador('${j.id}', 'Activo')">Aprobar</button>`;

                return `
                    <div class="list-item">
                        <div class="list-item-info">
                            <h4>#${j.numeroCamiseta || '-'} ${j.nombre} ${j.apellido || ''}</h4>
                            <p>
                                <span class="badge ${badgeClass}">${badgeText}</span>
                                ${j.posicion ? `• ${j.posicion}` : ''}
                                ${j.email ? `• ${j.email}` : ''}
                            </p>
                        </div>
                        <div class="list-item-actions">
    <button class="btn-action btn-primary" onclick="editarJugador('${j.id}')">Ver / Editar</button>
    ${btnEstado}
    <button class="btn-action btn-delete" onclick="eliminarJugador('${j.id}')">Eliminar</button>
</div>
                    </div>
                `;
            }).join('');
            
            console.log('✅ Jugadores renderizados:', response.data.length);
        }

    } catch (error) {
        console.error('❌ Error cargando jugadores admin:', error);
    }
}

// ============================================
// FUNCIONES GLOBALES
// ============================================

window.nuevoJugador = function() {
    alert('Función para crear nuevo jugador');
}

window.editarJugador = function(id) {
    localStorage.setItem('admin_edit_jugador', id);
    window.location.href = 'panel-jugador.html';

   
}

window.logout = function() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('arvet_user');
        localStorage.removeItem('arvet_login_time');
        window.location.href = 'login.html';
    }
}

window.cambiarEstadoJugador = async function(id, nuevoEstado) {
    const response = await window.fetchAPI('updateEstadoJugador', {
        id: id,
        estado: nuevoEstado
    });

    if (response.success) {
        cargarJugadoresAdmin();
    } else {
        alert('Error: ' + response.error);
    }
}

window.eliminarJugador = async function(id) {
    if (!confirm('¿Seguro que querés eliminar este jugador?')) return;

    const response = await window.fetchAPI('deleteJugador', {
        id: id
    });

    if (response.success) {
        cargarJugadoresAdmin();
    } else {
        alert('Error: ' + response.error);
    }
}

// ============================================
// MAPA (LEAFLET)
// ============================================

let mapaCreado = false;
let mapInstance = null;

function inicializarMapa() {
    console.log('=== inicializarMapa ===');
    
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet no está cargado');
        return;
    }
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.log('❌ No existe contenedor #map');
        return;
    }
    
    if (mapaCreado && mapInstance) {
        console.log('Actualizando mapa existente...');
        if (window.equipoCoords) {
            const lat = parseFloat(window.equipoCoords.lat);
            const lng = parseFloat(window.equipoCoords.lng);
            mapInstance.setView([lat, lng], 15);
            
            mapInstance.eachLayer(layer => {
                if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
            });
            
            L.marker([lat, lng]).addTo(mapInstance)
                .bindPopup("📍 Ubicación del equipo")
                .openPopup();
        }
        return;
    }
    
    const lat = window.equipoCoords ? parseFloat(window.equipoCoords.lat) : -34.6037;
    const lng = window.equipoCoords ? parseFloat(window.equipoCoords.lng) : -58.3816;
    const zoom = window.equipoCoords ? 15 : 13;
    
    console.log('Creando mapa en:', lat, lng);
    
    try {
        mapInstance = L.map('map').setView([lat, lng], zoom);
        mapaCreado = true;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);
        
        L.marker([lat, lng]).addTo(mapInstance)
            .bindPopup("📍 Ubicación del equipo")
            .openPopup();
            
        console.log('✅ Mapa creado correctamente');
    } catch (error) {
        console.error('❌ Error creando mapa:', error);
    }
}

// ============================================
// ADMIN: GESTIÓN DE LOGO Y GALERÍA
// ============================================

let logoUrlActual = null;
let galeriaActual = [];

// Inicializar sección de configuración del equipo
function initConfigEquipo() {
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    if (!currentUser.equipoId) return;
    
    // Cargar logo actual
    cargarLogoActual(currentUser.equipoId);
    
    // Cargar galería actual
    cargarGaleriaAdmin(currentUser.equipoId);
    
    // Setup event listeners para logo
    const btnCambiarLogo = document.getElementById('btnCambiarLogo');
    const inputLogo = document.getElementById('inputLogo');
    const btnGuardarLogo = document.getElementById('btnGuardarLogo');
    
    if (btnCambiarLogo && inputLogo) {
        btnCambiarLogo.addEventListener('click', () => inputLogo.click());
        
        inputLogo.addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append("image", file);
            
            try {
                mostrarMensajeAdmin('Subiendo logo...', 'info');
                
                const response = await fetch("https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90", {
                    method: "POST",
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    logoUrlActual = result.data.url;
                    document.getElementById('logoPreview').src = logoUrlActual;
                    mostrarMensajeAdmin('Logo cargado. Guardá los cambios.', 'success');
                } else {
                    mostrarMensajeAdmin('Error subiendo logo', 'error');
                }
            } catch (err) {
                console.error(err);
                mostrarMensajeAdmin('Error de conexión', 'error');
            }
        });
    }
    
    if (btnGuardarLogo) {
        btnGuardarLogo.addEventListener('click', async function() {
            if (!logoUrlActual) {
                mostrarMensajeAdmin('Primero seleccioná un logo', 'error');
                return;
            }
            
            try {
                const response = await window.postAPI('updateEquipoLogo', {
                    equipoId: currentUser.equipoId,
                    logoUrl: logoUrlActual
                });
                
                if (response.success) {
                    mostrarMensajeAdmin('Logo guardado correctamente', 'success');
                } else {
                    mostrarMensajeAdmin('Error: ' + response.error, 'error');
                }
            } catch (err) {
                mostrarMensajeAdmin('Error de conexión', 'error');
            }
        });
    }
    
    // Setup para agregar fotos a galería
    const btnAgregarFoto = document.getElementById('btnAgregarFoto');
    const inputGaleria = document.getElementById('inputGaleria');
    const btnGuardarGaleria = document.getElementById('btnGuardarGaleria');
    
    if (btnAgregarFoto && inputGaleria) {
        btnAgregarFoto.addEventListener('click', () => inputGaleria.click());
        
        inputGaleria.addEventListener('change', async function() {
            const files = Array.from(this.files);
            if (files.length === 0) return;
            
            mostrarMensajeAdmin(`Subiendo ${files.length} foto(s)...`, 'info');
            
            const nuevasFotos = [];
            
            for (const file of files) {
                const formData = new FormData();
                formData.append("image", file);
                
                try {
                    const response = await fetch("https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90", {
                        method: "POST",
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        nuevasFotos.push({
                            url: result.data.url,
                            thumb: result.data.thumb?.url || result.data.url,
                            descripcion: ''
                        });
                    }
                } catch (err) {
                    console.error('Error subiendo imagen:', err);
                }
            }
            
            if (nuevasFotos.length > 0) {
                galeriaActual = [...galeriaActual, ...nuevasFotos];
                renderGaleriaAdmin();
                mostrarMensajeAdmin(`${nuevasFotos.length} foto(s) agregadas. Guardá los cambios.`, 'success');
            } else {
                mostrarMensajeAdmin('Error subiendo fotos', 'error');
            }
        });
    }
    
    if (btnGuardarGaleria) {
        btnGuardarGaleria.addEventListener('click', async function() {
            try {
                const response = await window.postAPI('updateGaleria', {
                    equipoId: currentUser.equipoId,
                    imagenes: galeriaActual
                });
                
                if (response.success) {
                    mostrarMensajeAdmin('Galería actualizada', 'success');
                } else {
                    mostrarMensajeAdmin('Error: ' + response.error, 'error');
                }
            } catch (err) {
                mostrarMensajeAdmin('Error de conexión', 'error');
            }
        });
    }
}

async function cargarLogoActual(equipoId) {
    try {
        const response = await window.fetchAPI('getEquipoById', { id: equipoId });
        if (response.success && response.data.logoUrl) {
            logoUrlActual = response.data.logoUrl;
            document.getElementById('logoPreview').src = logoUrlActual;
        }
    } catch (err) {
        console.error('Error cargando logo:', err);
    }
}

async function cargarGaleriaAdmin(equipoId) {
    try {
        const response = await window.fetchAPI('getGaleria', { equipoId });
        if (response.success && response.data) {
            galeriaActual = response.data;
            renderGaleriaAdmin();
        }
    } catch (err) {
        console.error('Error cargando galería:', err);
    }
}

function renderGaleriaAdmin() {
    const container = document.getElementById('galeriaAdminGrid');
    if (!container) return;
    
    if (galeriaActual.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px;">No hay fotos en la galería</p>';
        return;
    }
    
    container.innerHTML = galeriaActual.map((img, index) => `
        <div class="galeria-admin-item" style="position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <img src="${img.thumb || img.url}" style="width: 100%; height: 150px; object-fit: cover;">
            <input type="text" placeholder="Descripción..." value="${img.descripcion || ''}" 
                   onchange="actualizarDescGaleria(${index}, this.value)"
                   style="width: 100%; padding: 8px; border: none; border-top: 1px solid #e2e8f0; font-size: 12px;">
            <button onclick="eliminarFotoGaleria(${index})" 
                    style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; 
                           border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; 
                           font-size: 16px; line-height: 1;">×</button>
        </div>
    `).join('');
}

window.actualizarDescGaleria = function(index, descripcion) {
    galeriaActual[index].descripcion = descripcion;
};

window.eliminarFotoGaleria = function(index) {
    if (!confirm('¿Eliminar esta foto?')) return;
    galeriaActual.splice(index, 1);
    renderGaleriaAdmin();
};

function mostrarMensajeAdmin(texto, tipo) {
    const msg = document.getElementById('msgConfig');
    if (!msg) return;
    
    msg.textContent = texto;
    msg.className = 'message ' + tipo;
    msg.style.display = 'block';
    
    setTimeout(() => {
        msg.style.display = 'none';
    }, 5000);
}

// Inicializar config en admin
document.addEventListener('DOMContentLoaded', function() {
    if (getCurrentPage() === 'admin') {
        // Verificar si estamos en la sección de configuración
        const configSection = document.getElementById('configuracion');
        if (configSection && configSection.classList.contains('active')) {
            initConfigEquipo();
        }
    }
});

// ============================================
// ADMIN MOBILE - NAVEGACIÓN GLOBAL
// ============================================

window.toggleMenu = function() {
    const nav = document.getElementById('adminNav');
    const overlay = document.querySelector('.nav-overlay');
    
    if (nav && overlay) {
        nav.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

window.showSection = function(sectionId) {
    console.log('showSection ejecutado:', sectionId);
    
    // Ocultar todas las secciones
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active');
    });
    
    // Mostrar la sección pedida
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        console.log('✅ Sección activada:', sectionId);
    } else {
        console.error('❌ No existe sección:', sectionId);
    }
    
    // Actualizar título del header
    const titles = {
        'dashboard': 'Dashboard',
        'partidos': 'Partidos',
        'cuotas': 'Cuotas',
        'jugadores': 'Jugadores',
        'finanzas': 'Finanzas'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionId] || 'Admin';
    }
    
    // Cerrar menú hamburguesa
    const nav = document.getElementById('adminNav');
    const overlay = document.querySelector('.nav-overlay');
    if (nav) nav.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    
    // Actualizar item activo en el menú
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.classList.remove('active');
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${sectionId}'`)) {
            item.classList.add('active');
        }
    });
};
