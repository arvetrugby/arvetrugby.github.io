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

window.cambiarRolJugador = async function(jugadorId, nuevoRol) {
    if (!confirm(`¿Cambiar rol a "${nuevoRol}"?`)) return;
    
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'asignarRolComision',
                jugadorId: jugadorId,
                rol: nuevoRol,
                equipoId: currentUser.equipoId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMsg('Nuevo rol?, ok', 'success');
            // Recargar lista de jugadores
            cargarJugadoresAdmin();
        } else {
            alert('Error: ' + (result.error || 'No se pudo cambiar el rol'));
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión');
    }
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
    // Mostrar loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('progressBar');
    const loadingText = document.getElementById('loadingText');
    
    // Simular progreso
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
        
        // Cambiar texto según progreso
        if (progress > 30 && progress < 60) {
            loadingText.textContent = 'Buscando equipos...';
        } else if (progress > 60) {
            loadingText.textContent = 'Preparando todo...';
        }
    }, 200);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        loadingText.textContent = '¡Listo!';
        
        setTimeout(() => {
            loadingScreen.classList.add('loading-hidden');
            // Eliminar del DOM después de la transición
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 300);
    }, 3000);
    
const input = document.getElementById("searchInput");
if(input){
    input.addEventListener("input", buscarEquipos);
}
    console.log('Ejecutando initIndex');

    if (document.getElementById('equiposSlider')) {
        cargarEquiposInicio();
        activarDragEquipos();
    }

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
        <div class="pais-card-slider" 
             style="background-image: url('${pais.logoUrl}');"
             onclick="filtrarPorPais('${pais.id}')">
          <div class="pais-overlay"></div>
          <div class="pais-nombre-fondo">${pais.nombre}</div>
          <div class="pais-equipos">${pais.cantidadEquipos} equipos</div>
        </div>
      `).join('');
    }
  } catch (error) {
    container.innerHTML = '<p>Error al cargar países</p>';
  }
}
async function buscarEquipos() {

    const termino = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResults');

    if (!termino) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<div class="loading">Buscando...</div>';

    try {

        const response = await window.fetchAPI('buscar', { termino });

        if (response.success && response.data.equipos && response.data.equipos.length > 0) {

            container.innerHTML = response.data.equipos.map(e => `

<div class="equipo-card-busqueda"
     onclick="window.location.href='equipo.html?slug=${e.slug}'">

    <div class="equipo-logo"
         style="background:${e.colorPrimario || '#334155'}">

        <img class="equipo-logo-img" src="${e.logoUrl ? e.logoUrl : 'images/default-team.png'}" alt="${e.nombre}">

    </div>

    <div class="equipo-info">

        <h3>${e.nombre}</h3>

        <p>${e.pais || ''}</p>

        <span>
        ${(e.provincia || '')} ${(e.ciudad ? ' - ' + e.ciudad : '')}
        </span>

    </div>

</div>

`).join('');

        } else {

            container.innerHTML = '<p>No se encontraron equipos</p>';

        }

    } catch (error) {

        console.error(error);
        container.innerHTML = '<p>Error en la búsqueda</p>';

    }
}

async function cargarEquiposInicio(){
    const slider = document.getElementById("equiposSlider");
    if(!slider) return;

    slider.innerHTML = '<div class="loading">Cargando equipos...</div>';

    try{
        const response = await window.fetchAPI("getEquipos");
        console.log("Datos de getEquipos:", response.data);

        if(response.success){
            slider.innerHTML = response.data.map(e => `
                <div class="equipo-card-slider"
                     onclick="window.location.href='equipo.html?slug=${e.slug}'">
                    <div class="gold-particles"></div>
                    <div class="gold-particles2"></div>
                    <div class="gold-particles3"></div>
                    <div class="equipo-logo"
                         style="background:${e.colorPrimario || '#334155'}">
                        <img src="${e.logoUrl || ''}" alt="${e.nombre}">
                    </div>
                    <p class="equipo-ubicacion">
                        ${e.ciudad ? e.ciudad + ' - ' : ''}${e.provincia ? e.provincia + ' - ' : ''}${e.pais || ''}
                    </p>
                    <p class="equipo-nombre">${e.nombre}</p>
                    
                    <!-- Badge de jugadores -->
                    <div class="jugadores-badge">
                        <span class="jugadores-icono">👤</span>
                        <span class="jugadores-numero">${e.cantidadJugadores || 0}</span>
                        <span class="jugadores-texto">jugadores</span>
                    </div>
                </div>
            `).join('');
        }
    } catch(error){
        console.error(error);
        slider.innerHTML = '<p>Error cargando equipos</p>';
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
function activarDragEquipos(){

    const slider = document.getElementById("equiposSlider");

    if(!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener("mousedown", (e) => {
        isDown = true;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener("mouseleave", () => {
        isDown = false;
    });

    slider.addEventListener("mouseup", () => {
        isDown = false;
    });

    slider.addEventListener("mousemove", (e) => {

        if(!isDown) return;

        e.preventDefault();

        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;

        slider.scrollLeft = scrollLeft - walk;

    });

}
// ============================================
// PÁGINA: REGISTRO
// ============================================

function initRegistro() {
    // Inicializar mapa selector (nuevo)
    initMapaSelector();
    
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

        // Validar que marcó ubicación en el mapa (nuevo)
        if (!document.getElementById('lat').value || !document.getElementById('lng').value) {
            showMessage('⚠️ Por favor marcá la ubicación de tu club en el mapa arrastrando el pin rojo', 'error');
            setLoading(false);
            return;
        }
    
        // Validar que se detectó el país (nuevo)
        if (!document.getElementById('paisId').value) {
            showMessage('⚠️ No se pudo detectar el país. Intentá mover el pin a otra ubicación más cercana a una ciudad', 'error');
            setLoading(false);
            return;
        }
    // NUEVO: Validar contraseñas coincidan
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    console.log(password, password.length);
    if (password !== passwordConfirm) {
        showMessage('⚠️ Las contraseñas no coinciden', 'error');
        setLoading(false);
        return;
    }
    
    if (password.length < 6) {
        showMessage('⚠️ La contraseña debe tener al menos 6 caracteres', 'error');
        setLoading(false);
        return;
    }

    const data = {
        nombre: document.getElementById('nombre').value.trim(),
        paisId: document.getElementById('paisId').value.trim(),
        provinciaId: document.getElementById('provinciaId').value.trim(),
        ciudadId: document.getElementById('ciudadId').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        adminNombre: document.getElementById('adminNombre').value.trim(),
        adminApellido: document.getElementById('adminApellido').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),  // ← NUEVO
        email: document.getElementById('email').value.trim(),
        password: password  // ← Usamos la variable validada
    };
       

        try {
            const response = await fetch(
                `${API_URL}?action=crearEquipo` +
                `&nombre=${encodeURIComponent(data.nombre)}` +
                `&paisId=${encodeURIComponent(data.paisId)}` +
                `&provinciaId=${encodeURIComponent(data.provinciaId)}` +
                `&ciudadId=${encodeURIComponent(data.ciudadId)}` +
                `&direccion=${encodeURIComponent(data.direccion)}` +
                `&lat=${encodeURIComponent(data.lat)}` +           // ← NUEVO
                `&lng=${encodeURIComponent(data.lng)}` +           // ← NUEVO
                `&adminNombre=${encodeURIComponent(data.adminNombre)}` +
                `&adminApellido=${encodeURIComponent(data.adminApellido)}` +
                `&telefono=${encodeURIComponent(data.telefono)}` +  // ← NUEVO
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
                const rolesAdmin = ['Admin', 'Capitán', 'Manager', 'Sub Capitán', 'Sub Manager', 'Tesorero'];

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
            const rolesAdmin = [
                'Admin', 
                'Capitán', 
                'Manager',
                'Sub Capitán',
                'Sub Manager', 
                'Tesorero'
            ];
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
    const esAdmin = urlParams.get('admin') === '1';
    
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
                `&equipoId=${encodeURIComponent(data.equipoId)}` +
                `&estado=${esAdmin ? 'Activo' : 'Pendiente'}`
            );
            
            const result = await response.json();
            console.log('Respuesta:', result);
            
            if (result.success) {
                mostrarMensaje('✅ ' + result.message + ' Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = esAdmin ? 'admin.html' : 'login.html';
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
// PÁGINA: EQUIPO (PÚBLICO) - JS COMPLETO
// ============================================

// ----- INICIO -----
function initEquipo() {
    console.log('=== INICIO EQUIPO ===');
    
   // 🔥 VERIFICAR SESIÓN Y ACTUALIZAR NAV
    actualizarNavUsuario();
    
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    console.log('Slug:', slug);

    if (!slug || slug === '' || slug === 'equipo') {
        console.error('❌ No se encontró slug válido');
        const header = document.getElementById('equipoHeader');
        if (header) header.innerHTML = '<div class="error">Error: No se pudo identificar el equipo</div>';
        return;
    }

    if (typeof window.fetchAPI !== 'function') {
        console.error('❌ fetchAPI no está disponible');
        return;
    }

    cargarEquipo(slug);
}
function actualizarNavUsuario() {
    const loginLink = document.getElementById('navLogin');
    if (!loginLink) return;
    
    const user = localStorage.getItem('arvet_user');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            
            // Cambiar a modo "usuario logueado"
            loginLink.textContent = `👤 ${userData.nombre}`;
            loginLink.href = '#'; // o 'admin.html' si querés que lleve al panel
            loginLink.className = 'btn-user'; // clase diferente para estilos
            
            // Opcional: click para ir al panel admin o desloguear
            loginLink.onclick = function(e) {
                e.preventDefault();
                // Toggle menú de usuario
                mostrarMenuUsuario(userData);
            };
            
        } catch(e) {
            // Si hay error, dejar como login normal
        }
    }
}

function mostrarMenuUsuario(userData) {
    // Crear menú desplegable simple
    const existente = document.getElementById('menuUsuario');
    if (existente) {
        existente.remove();
        return;
    }
    
    // Obtener el botón que abrió el menú (asumiendo que tiene id="btnUsuario" o similar)
    // Si no tenés referencia al botón, podés pasar el evento o usar otro selector
    const btnUsuario = document.getElementById('btnUsuario') || document.querySelector('[onclick*="mostrarMenuUsuario"]');
    
    const menu = document.createElement('div');
    menu.id = 'menuUsuario';
    
    // Calcular posición respecto al viewport si existe el botón
    let topPos = '60px';
    let rightPos = '20px';
    
    if (btnUsuario) {
        const rect = btnUsuario.getBoundingClientRect();
        topPos = (rect.bottom + 8) + 'px'; // 8px de margen debajo del botón
        rightPos = (window.innerWidth - rect.right) + 'px';
    }
    
    menu.innerHTML = `
        <div style="position: fixed; top: ${topPos}; right: ${rightPos}; background: #ffffffa6; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 16px; min-width: 180px; z-index: 9999;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #292a2a;">${userData.nombre} ${userData.apellido || ''}</p>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #292a2a; text-transform: uppercase;">${userData.rol}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;">
            <a href="admin.html" style="display: block; padding: 8px 0; color: #292a2a; text-decoration: none; font-size: 14px;"> Panel Admin</a>
            <a href="#" onclick="logout(); return false;" style="display: block; padding: 8px 0; color: #292a2a; text-decoration: none; font-size: 14px;"> Cerrar sesión</a>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarMenu(e) {
            if (!menu.contains(e.target) && (!btnUsuario || !btnUsuario.contains(e.target))) {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            }
        });
    }, 100);
}
// ----- CARGAR EQUIPO -----
async function cargarEquipo(slug) {
    console.log('=== cargarEquipo ===');
    
    const header = document.getElementById('equipoHeader');
    const quienesSomos = document.getElementById('quienesSomosContent');
    const comisionGrid = document.getElementById('comisionGrid');
    const plantelGrid = document.getElementById('plantelGrid');
    const partidosList = document.getElementById('partidosEquipoList');
    const logoImg = document.getElementById('equipoLogo');

    try {
        const response = await window.fetchAPI('getEquipoBySlug', { slug });
        if (!response.success) {
            console.error('Error:', response.error);
            if (header) header.innerHTML = `<div class="error">Error: ${response.error}</div>`;
            return;
        }

        const equipo = response.data;
        console.log('Equipo cargado:', equipo);

        window.currentSlug = slug;
        window.currentEquipoId = equipo.id;
        window.currentEquipo = equipo; // para galería y botones

        // ----- APLICAR COLOR DE EQUIPO INMEDIATAMENTE -----
        if (equipo.colorPrimario) {
            const root = document.documentElement;
            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1,3),16);
                const g = parseInt(hex.slice(3,5),16);
                const b = parseInt(hex.slice(5,7),16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            const baseColor = equipo.colorPrimario;
            root.style.setProperty('--equipo-color', baseColor);
            root.style.setProperty('--equipo-color-rgba', hexToRgba(baseColor,0.92));
            root.style.setProperty('--equipo-hero-start', hexToRgba(baseColor,0.95));
            root.style.setProperty('--equipo-hero-mid', hexToRgba(baseColor,0.85));
            root.style.setProperty('--equipo-hero-end', hexToRgba(baseColor,0.98));
            console.log('🎨 Color aplicado:', baseColor);
        }

        // ----- ACTUALIZAR HEADER -----
        if (header) {
            header.innerHTML = `
                <p>${equipo.nombre}</p>
                <p>${equipo.ciudad} | ${equipo.provincia}</p>
                <p>${equipo.pais}</p>
                <p>${equipo.descripcion || ''}</p>
            `;
        }

        // ----- LOGO -----
        if (logoImg && equipo.logoUrl) {
            logoImg.src = equipo.logoUrl;
            logoImg.style.display = 'inline-block';
        }

        // ----- QUIÉNES SOMOS -----
        if (quienesSomos) {
            quienesSomos.innerHTML = `
                <p>${equipo.historia || 'Sin información disponible'}</p>
                <p><strong>Fundación:</strong> ${equipo.fechaFundacion || 'N/A'}</p>
                <p><strong>Instagram:</strong> ${equipo.colores || 'N/A'}</p>
            `;
        }

        // ----- MAPA -----
        window.equipoCoords = equipo.lat && equipo.lng
            ? { lat: parseFloat(equipo.lat), lng: parseFloat(equipo.lng) }
            : { lat: -34.6037, lng: -58.3816 };

        const mapContainer = document.getElementById('map');
        if (mapContainer && typeof L !== 'undefined') inicializarMapa();

        // ----- CARGA DE DATOS PARALIZADOS -----
        const tareas = [];

        if (comisionGrid && plantelGrid) tareas.push(cargarJugadoresEquipo(equipo.id));
        if (partidosList) tareas.push(cargarPartidosEquipoPublico(equipo.id));
        if (equipo.galeria) cargarGaleriaEquipo(equipo.galeria); // no await

        await Promise.all(tareas);

        // ----- BOTÓN UNIRSE -----
        const btnUnirse = document.getElementById('btnUnirse');
        if (btnUnirse) btnUnirse.href = `registro-jugador.html?equipo=${window.currentEquipoId}`;

    } catch (error) {
        console.error('❌ Error en cargarEquipo:', error);
        if (header) header.innerHTML = '<div class="error">Error de conexión</div>';
    }
}


// ----- GALERÍA -----
function cargarGaleriaEquipo(galeria) {
    const container = document.getElementById('galeriaCarrusel');
    const dotsContainer = document.getElementById('galeriaDots');
    const sinGaleria = document.getElementById('sinGaleria');

    if (!container) return;
    
    // Sin fotos: ocultar todo, mostrar mensaje
    if (!galeria || galeria.length === 0) {
        container.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        if (sinGaleria) sinGaleria.style.display = 'block';
        return;
    }

    // ✅ CON FOTOS: mostrar container (quitar display:none), ocultar mensaje
    container.style.display = ''; // ← VACÍO: vuelve al CSS original
    if (sinGaleria) sinGaleria.style.display = 'none';

    container.innerHTML = galeria.map(url => {
        const rotacion = (Math.random()*10-5).toFixed(2);
        return `
            <div class="galeria-item">
                <img src="${url}" loading="lazy" onclick="verFoto('${url}')">
            </div>
        `;
    }).join('');

    if (dotsContainer) {
        dotsContainer.style.display = 'flex';
        dotsContainer.innerHTML = galeria.map((_, idx) => `
            <span class="galeria-dot" onclick="irAGaleria(${idx})"
                style="width:10px;height:10px;border-radius:50%;
                       background:${idx===0?'var(--primary,#3b82f6)':'#cbd5e1'};
                       cursor:pointer;transition:all 0.3s;">
            </span>
        `).join('');
    }

    if (window.innerWidth > 768) {
        const btnPrev = document.getElementById('btnPrevGaleria');
        const btnNext = document.getElementById('btnNextGaleria');
        if (btnPrev) btnPrev.style.display='block';
        if (btnNext) btnNext.style.display='block';
    }

    container.addEventListener('scroll', () => {
        const scrollLeft = container.scrollLeft;
        const itemWidth = container.offsetWidth*0.85+12;
        const activeIndex = Math.round(scrollLeft/itemWidth);
        document.querySelectorAll('.galeria-dot').forEach((dot,idx)=>{
            dot.style.background = idx===activeIndex?'var(--primary,#3b82f6)':'#cbd5e1';
            dot.style.transform = idx===activeIndex?'scale(1.2)':'scale(1)';
        });
    });
}
window.moverGaleria = function(direccion){
    const container = document.getElementById('galeriaCarrusel');
    const itemWidth = container.offsetWidth*0.85+12;
    container.scrollBy({left:itemWidth*direccion,behavior:'smooth'});
};

window.irAGaleria = function(index){
    const container = document.getElementById('galeriaCarrusel');
    const itemWidth = container.offsetWidth*0.85+12;
    container.scrollTo({left:itemWidth*index,behavior:'smooth'});
};

// ----- JUGADORES -----
async function cargarJugadoresEquipo(equipoId) {
    console.log('Cargando jugadores equipo:', equipoId);
    
    // Verificar si hay usuario logueado
    const user = localStorage.getItem('arvet_user');
    const isLogueado = !!user;
    let userData = null;
    if (isLogueado) {
        try {
            userData = JSON.parse(user);
        } catch(e) {}
    }
    
    try {
        const response = await window.fetchAPI('getJugadores', { equipoId });
        if (!response.success) return;

        const jugadores = Array.isArray(response.data)
            ? response.data.filter(j => j.estado && j.estado.trim() === 'Activo')
            : [];

        const comision = jugadores.filter(j => j.rol && j.rol !== 'Jugador');
        const plantel = jugadores.filter(j => !j.rol || j.rol === 'Jugador' || (j.rol && j.rol !== 'Jugador'));

        const comisionGrid = document.getElementById('comisionGrid');
        const plantelGrid = document.getElementById('plantelGrid');

        // Función para calcular edad desde YYYY-MM-DD
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento || String(fechaNacimiento).trim() === '') return null;
    
    const str = String(fechaNacimiento).trim();
    
    // Parsear YYYY-MM-DD
    if (str.includes('-')) {
        const [año, mes, dia] = str.split('-');
        const hoy = new Date();
        let edad = hoy.getFullYear() - parseInt(año);
        const mesActual = hoy.getMonth() + 1;
        const diaActual = hoy.getDate();
        
        if (mesActual < parseInt(mes) || (mesActual === parseInt(mes) && diaActual < parseInt(dia))) {
            edad--;
        }
        return edad > 0 ? edad : null;
    }
    
    return null;
}

// Función para formatear fecha YYYY-MM-DD → DD/MM/YYYY
function formatearFecha(fecha) {
    if (!fecha || String(fecha).trim() === '') return null;
    
    const str = String(fecha).trim();
    
    // Si viene como YYYY-MM-DD
    if (str.includes('-')) {
        const [año, mes, dia] = str.split('-');
        return `${dia}/${mes}/${año}`;
    }
    
    return null;
}
        // Función para generar tarjeta de jugador
        function tarjetaJugador(j) {
    console.log('>>> Jugador:', j.nombre, 'Fecha raw:', j.fechaNacimiento);
    
    const edad = calcularEdad(j.fechaNacimiento);
    const fechaFormateada = formatearFecha(j.fechaNacimiento);
    
    console.log('>>> Resultado:', { fechaFormateada, edad });
            
            const datosPrivados = isLogueado ? `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        ${fechaFormateada ? `
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">
                Nac: ${fechaFormateada} ${edad ? `(${edad} años)` : ''}
            </p>
        ` : ''}
        ${j.telefono ? `
            <a href="https://wa.me/${String(j.telefono).replace(/\D/g, '')}" 
               target="_blank"
               style="display: inline-flex; align-items: center; gap: 6px; 
                      margin-top: 6px; padding: 6px 12px; background: #22c55e; 
                      color: white; border-radius: 20px; font-size: 12px; 
                      text-decoration: none; font-weight: 500;">
                WhatsApp
            </a>
        ` : ''}
        ${j.email ? `
            <p style="margin: 4px 0; font-size: 12px; color: #64748b; word-break: break-all;">
                ${j.email}
            </p>
        ` : ''}
    </div>
` : '';
            
            return `
                <div class="card" style="text-align: center; position: relative;">
                    <img src="${j.avatarUrl || 'https://i.ibb.co/4pDNDk1/avatar1.png'}" 
                         style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; 
                                border: 3px solid var(--equipo-color, #3b82f6); margin-bottom: 12px; margin-top: 12px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 16px;">${j.nombre} ${j.apellido || ''}</h3>
                    ${j.rol && j.rol !== 'Jugador' ? `
                        <p class="badge badge-success" style="display: inline-block; margin: 0 0 8px 0;">
                            ${j.rol}
                        </p>
                    ` : ''}
                    ${j.posicion ? `<p style="margin: 0; font-size: 13px; color: #64748b;">${j.posicion}</p>` : ''}
                    ${datosPrivados}
                </div>
            `;
        }

        if (comisionGrid) {
            comisionGrid.innerHTML = comision.map(tarjetaJugador).join('') || 
                '<p style="text-align:center;color:#64748b;">Sin comisión registrada</p>';
        }

        if (plantelGrid) {
            plantelGrid.innerHTML = plantel.map(tarjetaJugador).join('') || 
                '<p style="text-align:center;color:#64748b;">Sin jugadores en el plantel</p>';
        }
        
    } catch (e) {
        console.error('Error cargando jugadores:', e);
    }
}

// ----- PARTIDOS -----
async function cargarPartidosEquipoPublico(equipoId){
    console.log('Cargando partidos equipo:',equipoId);
    try{
        const response = await window.fetchAPI('getPartidos',{equipoId});
        if(!response.success) return;
        const partidosList = document.getElementById('partidosEquipoList');
        if(!partidosList) return;
        if(response.data.length===0){
            partidosList.innerHTML='<p>No hay partidos programados</p>';
            return;
        }
        partidosList.innerHTML = response.data.map(partido=>{
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
    }catch(e){console.error('Error cargando partidos:',e);}
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

  // 🔒 Protección de sesión - Admin, Capitán y Manager tienen acceso
const rolesAdminPermitidos = ['Admin', 'Capitán', 'Manager', 'Sub Capitán', 'Sub Manager', 'Tesorero'];
if (!currentUser || !rolesAdminPermitidos.includes(currentUser.rol)) {
    console.log('Acceso no autorizado - Rol:', currentUser?.rol);
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
    showSection('configuracion');
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
            localStorage.setItem('jugadores_cache', JSON.stringify(response.data));
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
    <div class="list-item" style="display: flex; flex-direction: column; gap: 12px; padding: 15px;">
        
        <!-- Fila superior: Avatar + Info -->
        <div style="display: flex; align-items: center; gap: 12px;">
            <!-- Imagen de perfil -->
            <img src="${j.avatarUrl || 'https://i.ibb.co/4pDNDk1/avatar1.png'}" 
                 alt="${j.nombre}" 
                 style="width: 55px; height: 55px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary, #3b82f6); flex-shrink: 0;">
            
            <!-- Info del jugador -->
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0 0 4px 0; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${j.nombre} ${j.apellido || ''}</h4>
                <p style="margin: 0; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="badge ${badgeClass}" style="font-size: 10px; padding: 2px 8px;">${badgeText}</span>
                    ${j.posicion ? `<span style="white-space: nowrap;">${j.posicion}</span>` : ''}
                    ${j.rol && j.rol !== 'Jugador' ? `<span style="color: var(--primary); font-weight: 600; white-space: nowrap;">${j.rol}</span>` : ''}
                </p>
            </div>
        </div>
        
        <!-- Email en línea separada (si existe) -->
        ${j.email ? `<p style="margin: 0; font-size: 12px; color: #94a3b8; word-break: break-all;">${j.email}</p>` : ''}
        
        <!-- Botones de acción principales -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-action btn-primary" onclick="editarJugador('${j.id}')" style="flex: 1; min-width: 80px; font-size: 12px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                Ver / Editar
            </button>
            ${btnEstado.replace('btn-action', 'btn-action').replace('>', ` style="flex: 1; min-width: 80px; font-size: 12px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">`)}
            <button class="btn-action btn-delete" onclick="eliminarJugador('${j.id}')" style="flex: 1; min-width: 80px; font-size: 12px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; background: #ef4444; color: white;">
                Eliminar
            </button>
        </div>
        
        <!-- Botones de Rol - TODOS MISMO TAMAÑO -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <button onclick="cambiarRolJugador('${j.id}', 'Jugador')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Jugador' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Jugador
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Capitán')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Capitán' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Capitán
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Sub Capitán')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Sub Capitán' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Sub Capitán
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Manager')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Manager' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Manager
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Sub Manager')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Sub Manager' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Sub Manager
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Tesorero')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Tesorero' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Tesorero
            </button>
            <button onclick="cambiarRolJugador('${j.id}', 'Admin')"
                    style="font-size: 11px; padding: 10px 6px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; min-height: 36px; width: 100%; ${j.rol === 'Admin' ? 'background: #22c55e; color: white;' : 'background: #f1f5f9; color: #475569;'}">
                 Admin
            </button>
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
// EDITAR JUGADOR DESDE ADMIN
// ============================================

function editarJugador(id) {

    const jugadores = JSON.parse(localStorage.getItem('jugadores_cache') || '[]');

    const jugador = jugadores.find(j => j.id == id);

    if (jugador) {
        localStorage.setItem('admin_edit_jugador', JSON.stringify(jugador));
    } else {
        localStorage.setItem('admin_edit_jugador', id);
    }

    window.location.href = "jugador.html";
}
// ============================================
// FUNCIONES GLOBALES
// ============================================

window.nuevoJugador = function() {
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    window.location.href = `registro-jugador.html?equipo=${currentUser.equipoId}&admin=1`;
}

window.editarJugador = function(id) {
    localStorage.setItem('admin_edit_jugador', id);
    window.location.href = 'panel-jugador.html';

   
}

window.logout = function() {
    if (confirm('¿Cerrar sesión?')) {
        if (!esAdmin) {
    localStorage.removeItem('arvet_user');
}
        localStorage.removeItem('arvet_login_time');
        window.location.href = esAdmin ? 'admin.html' : 'login.html';
    }
}

window.cambiarEstadoJugador = async function(id, nuevoEstado) {
    const response = await window.fetchAPI('updateEstadoJugador', {
        id: id,
        estado: nuevoEstado
    });

    if (response.success) {
        showMsg('Actualizado...', 'info');
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
        showMsg('Eliminado...', 'info');
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

    const lat = window.equipoCoords ? parseFloat(window.equipoCoords.lat) : -34.6037;
    const lng = window.equipoCoords ? parseFloat(window.equipoCoords.lng) : -58.3816;
    const zoom = window.equipoCoords ? 13 : 12;

    // Icono personalizado con el logo del equipo
const colorEquipo = getComputedStyle(document.documentElement)
.getPropertyValue('--equipo-color').trim() || "#2563eb";

const equipoIcon = L.divIcon({
    className: "markerWrapper",
    html: `
        <div class="markerPin" style="background:${colorEquipo}">
            <img src="${document.getElementById("equipoLogo").src}">
        </div>
    `,
    iconSize: [44,60],
    iconAnchor: [22,60],
    popupAnchor: [0,-50]
});

    if (mapaCreado && mapInstance) {
        console.log('Actualizando mapa existente...');

        mapInstance.setView([lat, lng], 15);

        // eliminar marcadores viejos
        mapInstance.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                mapInstance.removeLayer(layer);
            }
        });

        const marker = L.marker([lat, lng], { icon: equipoIcon })
        .addTo(mapInstance)
        .bindPopup(`
            <div class="popupEquipo">
                <img src="${document.getElementById("equipoLogo").src}" class="popupLogo">
                <strong>Ubicación del equipo</strong>
                Cancha del club
            </div>
        `);

        

        return;
    }

    console.log('Creando mapa en:', lat, lng);

    try {

        mapInstance = L.map('map').setView([lat, lng], zoom);
        mapaCreado = true;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        const marker = L.marker([lat, lng], { icon: equipoIcon })
        .addTo(mapInstance)
        .bindPopup(`
            <div class="popupEquipo">
                <img src="${document.getElementById("equipoLogo").src}" class="popupLogo">
                <strong>Ubicación del equipo</strong>
                Cancha del club
            </div>
        `);

    

        console.log('✅ Mapa creado correctamente');

    } catch (error) {
        console.error('❌ Error creando mapa:', error);
    }
}
// ============================================
// ADMIN: CONFIGURACIÓN BÁSICA
// ============================================
function initConfigEquipo() {
    console.log('=== initConfigEquipo ===');
    
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    if (!currentUser.equipoId) {
        console.error('No hay equipoId');
        return;
    }
    
    const logoPreview = document.getElementById('logoPreview');
    const btnCambiarLogo = document.getElementById('btnCambiarLogo');
    const inputLogo = document.getElementById('inputLogo');
    const btnGuardarLogo = document.getElementById('btnGuardarLogo');
    const msgConfig = document.getElementById('msgConfig');
    const colorInput = document.getElementById('colorPrimario');
const colorPreview = document.getElementById('colorPreview');
    const colorContainer = document.getElementById('color-picker');
const btnGuardarColor = document.getElementById('btnGuardarColor');
    
    if (!btnCambiarLogo || !inputLogo) {
        console.log('No están los elementos del logo');
        return;
    }
    
    // Mostrar mensaje helper
    window.showMsg = function(text, type) {
    const overlay = document.getElementById("msgOverlay");
    const msgConfig = document.getElementById("msgConfig");

    if (!msgConfig || !overlay) return;

    msgConfig.textContent = text;
    msgConfig.className = 'message ' + type;

    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 5000);
}
    
    // 1. Cargar logo actual (mismo patrón que panel-jugador)
    async function cargarLogoExistente() {
        try {
            const response = await fetch(`${API_URL}?action=getEquipoById&id=${currentUser.equipoId}`);
            const data = await response.json();
            
            if (data.success) {
                const equipo = data.data;
                
                // 🔵 CARGAR LOGO (mismo patrón que avatar en panel-jugador)
                if (equipo.logoUrl) {
                    logoPreview.src = equipo.logoUrl;
                    console.log('✅ Logo cargado:', equipo.logoUrl);
                } else {
                    logoPreview.src = 'https://i.ibb.co/xxxxx/logo-default.png ';
                    console.log('ℹ️ No hay logo, mostrando default');
                }
            }
        } catch (err) {
            console.error('Error cargando logo:', err);
            logoPreview.src = 'https://i.ibb.co/xxxxx/logo-default.png ';
        }
    }
    cargarLogoExistente();
    
    // 2. Seleccionar nuevo logo (subir a ImgBB)
    btnCambiarLogo.addEventListener('click', () => {
    inputLogo.value = "";
    inputLogo.click();
});
    
       inputLogo.addEventListener('change', async function() {
        const file = this.files[0];
        if (!file) return;
        
        showMsg('Subiendo...', 'info');
        
        const formData = new FormData();
        formData.append("image", file);
        
        try {
            // 1. Subir a ImgBB
            const response = await fetch("https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90", {
                method: "POST",
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                const imageUrl = result.data.url;
                logoPreview.src = imageUrl;
                
                // 2. GUARDAR AUTOMÁTICAMENTE (tu código del botón)
                showMsg('Guardando...', 'info');
                
                const saveResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'updateEquipo',
                        id: currentUser.equipoId,
                        logoUrl: imageUrl
                    })
                });
                
                const saveResult = await saveResponse.json();
                
                if (saveResult.success) {
                    showMsg('✅ Logo actualizado', 'success');
                } else {
                    showMsg('❌ Error: ' + saveResult.error, 'error');
                }
            } else {
                showMsg('❌ Error al subir imagen', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('❌ Error de conexión', 'error');
        }
    });
    
// ============================================
// COLOR PICKER SIEMPRE VISIBLE (inline)
// ============================================

let pickr = null;

// Inicializar Pickr en modo inline (siempre abierto)
function initPickr(defaultColor) {
    if (!colorContainer) {
        console.error('No existe #color-picker');
        return;
    }
    
    // 🔥 CENTRAR EL CONTENEDOR
    colorContainer.style.cssText = `
        width: 280px;
        max-width: 100%;
        margin: 0 auto;
        position: relative;
    `;
    
    // Destruir instancia anterior si existe
    if (pickr) {
        pickr.destroyAndRemove();
    }
    
    pickr = Pickr.create({
        el: '#color-picker',
        theme: 'classic',
        default: defaultColor,
        inline: true,
        showAlways: true,
        autoReposition: false,
        swatches: [
            '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
            '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
            '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#334155'
        ],
        components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
                hex: true,
                rgba: false,
                hsla: false,
                hsva: false,
                cmyk: false,
                input: true,
                clear: false,
                save: false
            }
        }
    });
    
    // Forzar el color inicial después de crear
    pickr.setColor(defaultColor);
    
    // 🔥 CENTRAR EL PICKR DESPUÉS DE CREARLO
    setTimeout(() => {
        const pickrApp = colorContainer.querySelector('.pcr-app');
        if (pickrApp) {
            pickrApp.style.cssText = `
                position: relative !important;
                left: auto !important;
                top: auto !important;
                margin: 0 auto !important;
                transform: none !important;
            `;
        }
    }, 10);
    
    // Cuando cambia el color
    pickr.on('change', (color) => {
        const hex = color.toHEXA().toString();
        colorInput.value = hex;
        colorPreview.textContent = hex;
    });
}

// Cargar color existente e inicializar picker
async function cargarColorExistente() {
    let colorInicial = '#6366f1';
    
    try {
        const response = await fetch(`${API_URL}?action=getEquipoById&id=${currentUser.equipoId}`);
        const data = await response.json();
        
        if (data.success && data.data.colorPrimario) {
            colorInicial = data.data.colorPrimario;
            console.log('✅ Color cargado de Sheets:', colorInicial);
        } else {
            console.log('ℹ️ Usando color default:', colorInicial);
        }
    } catch (e) {
        console.log('No se pudo cargar color existente, usando default:', colorInicial);
    }
    
    // Actualizar input y preview
    colorInput.value = colorInicial;
    colorPreview.textContent = colorInicial;
    
    // Inicializar Pickr con el color (con pequeño delay para asegurar DOM)
    setTimeout(() => {
        initPickr(colorInicial);
    }, 50);
}

// Inicializar
cargarColorExistente();

// Guardar color
btnGuardarColor.addEventListener('click', async function() {
    const color = colorInput.value;
    
    showMsg('Guardando color...', 'info');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateEquipo',
                id: currentUser.equipoId,
                colorPrimario: color
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMsg('✅ Color guardado', 'success');
        } else {
            showMsg('❌ Error: ' + result.error, 'error');
        }
    } catch (err) {
        showMsg('❌ Error de conexión', 'error');
    }
});
    // ============================================
    // GALERÍA (máximo 8 fotos)
    // ============================================
    
    // Inicializar galería temporal en el objeto window para que sea global
    window.galeriaTemporal = [];
    
    const galeriaContainer = document.getElementById('galeriaAdminContainer');
    const btnAgregarFoto = document.getElementById('btnAgregarFoto');
    const inputGaleria = document.getElementById('inputGaleria');
    const btnGuardarGaleria = document.getElementById('btnGuardarGaleria');
    const galeriaMsg = document.getElementById('galeriaMsg');
    
    // Renderizar fotos en el admin (ahora es global)
    window.renderGaleriaAdmin = function() {
        if (window.galeriaTemporal.length === 0) {
            galeriaContainer.innerHTML = '<p style="color: #94a3b8; text-align: center; grid-column: 1/-1;">Sin fotos</p>';
            return;
        }
        
        galeriaContainer.innerHTML = window.galeriaTemporal.map((url, index) => `
            <div style="position: relative; border-radius: 8px; overflow: hidden;">
                <img src="${url}" style="width: 100%; height: 100px; object-fit: cover;">
                <button onclick="eliminarFotoGaleria(${index})" 
                        style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; 
                               border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;
                               font-size: 14px; line-height: 1;">×</button>
            </div>
        `).join('');
        
        galeriaMsg.textContent = `${window.galeriaTemporal.length}/8 fotos`;
    };
    
    // Cargar galería existente (mismo patrón que logo)
    async function cargarGaleriaExistente() {
        try {
            const response = await fetch(`${API_URL}?action=getEquipoById&id=${currentUser.equipoId}`);
            const data = await response.json();
            
            if (data.success && data.data.galeria) {
                window.galeriaTemporal = data.data.galeria;
                window.renderGaleriaAdmin();
                inputGaleria.value = "";
            }
        } catch (err) {
            console.log('No se pudo cargar galería existente');
        }
    }
    cargarGaleriaExistente();
    
    // Agregar fotos (subir a ImgBB)
    btnAgregarFoto.addEventListener('click', () => {
        const restantes = 8 - window.galeriaTemporal.length;
        if (restantes <= 0) {
            showMsg('Máximo 8 fotos alcanzado', 'error');
            return;
        }
        inputGaleria.click();
    });
    
    inputGaleria.addEventListener('change', async function() {
    const files = Array.from(this.files);
    const restantes = 8 - window.galeriaTemporal.length;

    if (files.length > restantes) {
        showMsg(`Solo podés agregar ${restantes} foto(s) más`, 'error');
        files.splice(restantes);
    }

    if (files.length === 0) return;

    showMsg('Subiendo fotos...', 'info');

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
                window.galeriaTemporal.push(result.data.url);
            }
        } catch (err) {
            console.error('Error subiendo foto:', err);
        }
    }

    window.renderGaleriaAdmin();
    // ✅ GUARDAR AUTOMÁTICAMENTE EN SHEETS (sin botón)
    showMsg('Guardando en el servidor...', 'info');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateEquipo',
                id: currentUser.equipoId,
                galeria: window.galeriaTemporal
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMsg('✅ Fotos guardadas exitosamente', 'success');
        } else {
            showMsg('❌ Error al guardar: ' + result.error, 'error');
        }
    } catch (err) {
        showMsg('❌ Error de conexión al guardar', 'error');
    }
});
    // ============================================
    // QUIÉNES SOMOS - Descripción, Historia, etc.
    // ============================================
    
    const descripcionInput = document.getElementById('descripcionEquipo');
    const historiaInput = document.getElementById('historiaEquipo');
    const fechaFundacionInput = document.getElementById('fechaFundacionEquipo');
    const coloresInput = document.getElementById('coloresEquipo');
    const btnGuardarQuienesSomos = document.getElementById('btnGuardarQuienesSomos');
    
    // Cargar datos existentes de "Quiénes Somos"
async function cargarQuienesSomosExistente() {
    try {
        const response = await fetch(`${API_URL}?action=getEquipoById&id=${currentUser.equipoId}`);
        const data = await response.json();

        if (data.success) {
            const equipo = data.data;

            // Buscar inputs cuando ya existe la sección
            const descripcionInput = document.getElementById('descripcionEquipo');
            const historiaInput = document.getElementById('historiaEquipo');
            const fechaFundacionInput = document.getElementById('fechaFundacionEquipo');
            const coloresInput = document.getElementById('coloresEquipo');

            if (descripcionInput) descripcionInput.value = equipo.descripcion || '';
            if (historiaInput) historiaInput.value = equipo.historia || '';
            if (fechaFundacionInput) fechaFundacionInput.value = equipo.fechaFundacion || '';
            if (coloresInput) coloresInput.value = equipo.colores || '';

            console.log('✅ Datos de Quiénes Somos cargados', equipo);
        }

    } catch (err) {
        console.error('Error cargando Quiénes Somos:', err);
    }
}


    cargarQuienesSomosExistente();
    
    // Guardar Quiénes Somos
    if (btnGuardarQuienesSomos) {
        btnGuardarQuienesSomos.addEventListener('click', async function() {
           
            showMsg('Guardando información...', 'info');
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'updateEquipo',
                        id: currentUser.equipoId,
                        descripcion: descripcionInput ? descripcionInput.value : '',
                        historia: historiaInput ? historiaInput.value : '',
                        fechaFundacion: fechaFundacionInput ? fechaFundacionInput.value : '',
                        colores: coloresInput ? coloresInput.value : ''
                    })
                    
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMsg('✅ Información guardada correctamente', 'success');
                } else {
                    showMsg('❌ Error: ' + (result.error || 'No se pudo guardar'), 'error');
                }
            } catch (err) {
                console.error(err);
                showMsg('❌ Error de conexión', 'error');
            }
        });
    }
}  // ← CIERRA initConfigEquipo

// Función global para eliminar foto (FUERA de initConfigEquipo)
window.eliminarFotoGaleria = async function(index) {

  if (!confirm('¿Eliminar esta foto?')) return;

  // 1. Eliminar del array temporal
  window.galeriaTemporal.splice(index, 1);

  // 2. Actualizar la vista
  window.renderGaleriaAdmin();

  // 3. Obtener equipoId desde localStorage (igual que en cargarJugadoresAdmin)
  const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
  const equipoId = currentUser.equipoId;

  if (!equipoId) {
    console.error('No se encontró equipoId en localStorage');
    alert('Error: No se pudo identificar el equipo');
    return;
  }

  // 4. Guardar automáticamente
  try {
    

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateEquipo',
        id: equipoId,
        galeria: window.galeriaTemporal
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Foto eliminada y guardada');
       
    } else {
      console.error('Error del servidor:', result.error);
    }

  } catch (err) {
    console.error('Error de conexión:', err);
  }
};
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

// 🔥 SOLO UNA FUNCIÓN showSection - la completa con configuración
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
        return;
    }
    
    // Actualizar título del header
    const titles = {
        'configuracion': 'Configuración',
            'jugadores': 'Jugadores',
        'dashboard': 'Dashboard',
        'partidos': 'Partidos',
        'cuotas': 'Cuotas',
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
    
    // 🔥 INICIALIZAR CONFIGURACIÓN SI ES ESA SECCIÓN
    if (sectionId === 'configuracion') {
        console.log('🔧 Inicializando configuración...');
        if (typeof initConfigEquipo === 'function') {
            initConfigEquipo();
        } else {
            console.error('❌ initConfigEquipo no está definida');
        }
    }
};
window.verFoto = function(url){

const visor = document.getElementById("visorFoto");
const img = document.getElementById("visorImg");

img.src = url;
visor.style.display="flex";

}

const visor = document.getElementById("visorFoto");

if (visor) {
    visor.onclick = function(){
        this.style.display="none";
    }
}
// ============================================
// MAPA SELECTOR DE UBICACIÓN
// ============================================

let mapSelector = null;
let markerSelector = null;

function initMapaSelector() {
    const container = document.getElementById('mapSelector');
    if (!container) return;
    
    // Centro inicial: Sudamérica
    const latInicial = -25.0;
    const lngInicial = -60.0;
    const zoomInicial = 4;
    
    mapSelector = L.map('mapSelector').setView([latInicial, lngInicial], zoomInicial);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapSelector);
    
    // Marker arrastrable
    markerSelector = L.marker([latInicial, lngInicial], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(mapSelector);
    
    // Evento: al soltar el marker
    markerSelector.on('dragend', function() {
        const pos = markerSelector.getLatLng();
        console.log('Nueva posición:', pos.lat, pos.lng);
        obtenerDatosUbicacion(pos.lat, pos.lng);
    });
    
    // Evento: click en el mapa (mover marker)
    mapSelector.on('click', function(e) {
        markerSelector.setLatLng(e.latlng);
        obtenerDatosUbicacion(e.latlng.lat, e.latlng.lng);
    });
}

async function obtenerDatosUbicacion(lat, lng) {
    // GUARDAR COORDENADAS ORIGINALES DEL PIN (sin tocar)
    const latOriginal = parseFloat(lat);
    const lngOriginal = parseFloat(lng);
    
    document.getElementById('lat').value = latOriginal;
    document.getElementById('lng').value = lngOriginal;
    
    console.log('Coords originales del pin:', latOriginal, lngOriginal);
    
    // Mostrar loading
    const displays = document.querySelectorAll('.datos-ubicacion');
    displays.forEach(d => {
        d.style.display = 'block';
        const input = d.querySelector('input[type="text"]');
        if (input) input.value = 'Buscando...';
    });
    
    try {
        // Reverse geocodificación SOLO para obtener país/provincia/ciudad
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latOriginal}&lon=${lngOriginal}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Reverse geocodificación (solo para datos):', data);
        
        if (data && data.address) {
            const address = data.address;
            
            // DICCIONARIO DE CORRECCIONES
            const correccionesProvincias = {
                'Distrito Sauce': 'Entre Ríos',
                'Distrito Federal': 'Buenos Aires',
                'Ciudad Autónoma de Buenos Aires': 'Buenos Aires',
                'CABA': 'Buenos Aires',
                'Distrito Capital': 'Córdoba',
                'Departamento Capital': 'Córdoba',
                'Gran Buenos Aires': 'Buenos Aires',
                'Partido de La Plata': 'Buenos Aires',
                'Distrito Rosario': 'Santa Fe',
                'Departamento Rosario': 'Santa Fe'
            };
            
            // EXTRAER PROVINCIA
            let provincia = address.state || 
                           address.province || 
                           address.region || 
                           address.county || '';
            
            if (correccionesProvincias[provincia]) {
                console.log(`Corrección aplicada: "${provincia}" → "${correccionesProvincias[provincia]}"`);
                provincia = correccionesProvincias[provincia];
            }
            
            // EXTRAER CIUDAD
            const ciudad = address.city || 
                          address.town || 
                          address.village || 
                          address.locality || 
                          address.municipality || 
                          address.hamlet || '';
            
            // EXTRAER PAÍS
            const pais = address.country || '';
            
            console.log('Datos extraídos:', { pais, provincia, ciudad });
            
            // Mostrar en pantalla
            document.getElementById('paisDisplay').value = pais;
            document.getElementById('provinciaDisplay').value = provincia;
            document.getElementById('ciudadDisplay').value = ciudad;
            
            // Guardar en hidden
            document.getElementById('paisId').value = pais;
            document.getElementById('provinciaId').value = provincia;
            document.getElementById('ciudadId').value = ciudad;
            
            // Sugerir dirección si está vacía (usando display_name de Nominatim)
            if (data.display_name && document.getElementById('direccion').value === '') {
                const direccionSugerida = data.display_name.split(',')[0];
                document.getElementById('direccion').placeholder = `Ej: ${direccionSugerida}`;
            }
        }
        
    } catch (error) {
        console.error('Error en reverse geocodificación:', error);
        document.getElementById('paisDisplay').value = 'Error al detectar';
        document.getElementById('provinciaDisplay').value = 'Error al detectar';
        document.getElementById('ciudadDisplay').value = 'Error al detectar';
    }
    
    // IMPORTANTE: Las coordenadas originales del pin se mantienen en los inputs hidden
    console.log('Coords finales guardadas:', document.getElementById('lat').value, document.getElementById('lng').value);
}

// ==========================================
// COMPARTIR EQUIPO
// ==========================================

function obtenerSlugActual() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || sessionStorage.getItem('arvet_slug_redirect');
}

function compartirEquipoActual() {
    const slug = obtenerSlugActual();
    
    if (!slug) {
        alert('Error: no se pudo identificar el equipo');
        return;
    }
    
    const urlLimpia = 'https://arvetrugby.github.io/Arvet/' + slug;
    const urlCorta = 'arvetrugby.github.io/Arvet/' + slug;
    
    // Actualizar el texto debajo del botón
    const urlElement = document.getElementById('urlCompartir');
    if (urlElement) {
        urlElement.textContent = urlCorta;
    }
    
    // Compartir
    const texto = 'Mirá nuestro equipo en ARVET: ' + urlLimpia;
    
    if (navigator.share) {
        navigator.share({
            title: 'ARVET Rugby',
            text: 'Mirá este equipo',
            url: urlLimpia
        });
    } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
    }
}

// Actualizar URL al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const urlElement = document.getElementById('urlCompartir');
    if (urlElement) {
        const slug = obtenerSlugActual();
        if (slug) {
            urlElement.textContent = 'arvetrugby.github.io/Arvet/' + slug;
        }
    }
});
