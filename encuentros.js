let encuentroIdDesdeLink = null;
// Arriba de todo en encuentros.js

// ============================================
// ARVET - SISTEMA DE ENCUENTROS/PARTIDOS
// ============================================

// Función de mensajes propia (renombrada para evitar conflictos con app.js)
function mostrarMensajeEncuentros(texto, tipo = 'info') {
    let overlay = document.getElementById('msgOverlayEncuentros');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'msgOverlayEncuentros';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;z-index:99999;';
        overlay.innerHTML = '<div id="msgEncuentros" style="background:white;padding:25px 40px;border-radius:10px;font-size:18px;text-align:center;font-weight:bold;"></div>';
        document.body.appendChild(overlay);
    }
    
    const msg = document.getElementById('msgEncuentros');
    msg.textContent = texto;
    msg.style.background = tipo === 'success' ? '#16a34a' : tipo === 'error' ? '#dc2626' : '#1e293b';
    msg.style.color = 'white';
    
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 3000);
}

// Estado global
let encuentrosData = {
    misEncuentros: [],
    invitaciones: [],
    encuentroActivo: null
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const encuentroId = params.get('encuentroId');

    if (encuentroId) {
        if (!usuarioLogueado()) {
            mostrarPreviewEncuentro(encuentroId);
        } else {
            console.log('Link detectado:', encuentroId);
            setTimeout(() => {
                verDetalleEncuentro(encuentroId);
            }, 800);
        }
    }

    window.addEventListener('encuentrosTabChange', function(e) {
        if (e.detail === 'invitaciones') {
            cargarInvitaciones();
        }
    });

    // ============================================
    // FIX: Renderizar cuando la sección se activa
    // ============================================
    
    // Primera carga: intentar renderizar si ya está activo
    setTimeout(() => {
        const sectionEncuentros = document.getElementById('encuentros');
        if (sectionEncuentros && sectionEncuentros.classList.contains('active')) {
            renderizarMisEncuentros();
        }
    }, 100);

    // Observar cambios para renderizar cuando se active la sección
    const observer = new MutationObserver((mutations) => {
        const sectionEncuentros = document.getElementById('encuentros');
        if (sectionEncuentros && sectionEncuentros.classList.contains('active')) {
            const container = document.getElementById('listaMisEncuentros');
            // Solo si está vacío (no volver a renderizar si ya hay datos)
            if (container && container.children.length === 0 && encuentrosData.misEncuentros.length === 0) {
                console.log('Sección encuentros activada, renderizando...');
                renderizarMisEncuentros();
            }
        }
    });

    observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
    });
});
// ============================================
// NAVEGACIÓN DE TABS
// ============================================

function showEncuentrosTab(tab) {
    document.querySelectorAll('.encuentros-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#e2e8f0';
        btn.style.color = '#64748b';
    });

    const btnActivo = document.getElementById(`tabBtn${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        btnActivo.style.background = '#4f46e5';
        btnActivo.style.color = 'white';
    }

    document.querySelectorAll('#encuentros .tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const tabContent = document.getElementById(`tab-${tab}`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }

    if (tab === 'creados') {
    renderizarMisEncuentros();
} else {
    renderizarInvitaciones();

    if (encuentroIdDesdeLink) {
        console.log('Abriendo desde link:', encuentroIdDesdeLink);

        setTimeout(() => {
            verDetalleEncuentro(encuentroIdDesdeLink);
            encuentroIdDesdeLink = null;
        }, 500);
    }
}
    
}

// ============================================
// MODAL CREAR ENCUENTRO
// ============================================

function nuevoEncuentro() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalEncuentro';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>Crear Nuevo Encuentro</h2>
                <button class="btn-cerrar" onclick="cerrarModalEncuentro()">×</button>
            </div>
            
            <form id="formEncuentro" onsubmit="guardarEncuentro(event)">
                
                <div class="form-group">
                    <label>Flyer del encuentro</label>
                    <div id="flyerPreview" style="width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden;">
                        <span style="color: #94a3b8;">Vista previa del flyer</span>
                    </div>
                    <input type="file" id="inputFlyer" accept="image/*" style="display: none;">
                    <input type="hidden" id="flyerUrl" value="">
                    <button type="button" onclick="document.getElementById('inputFlyer').click()" class="btn-secondary" style="width: 100%;">
                        📤 Subir flyer
                    </button>
                    <p style="color: #64748b; font-size: 12px; margin-top: 5px;">Formato recomendado: JPG/PNG, 800x600px</p>
                </div>

                <div class="form-group">
                    <label>Nombre del encuentro *</label>
                    <input type="text" id="encNombre" required placeholder="Ej: Encuentro Argentino - Santiago 2026">
                </div>

                <!-- TIPO DE ENCUENTRO - MÚLTIPLE SELECCIÓN -->
                <div class="form-group">
                    <label>Tipo de encuentro * (podés elegir varios)</label>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="encTipo" value="Veteranos +35" style="width: 18px; height: 18px;">
                            <span>Veteranos +35</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="encTipo" value="Veteranos +50" style="width: 18px; height: 18px;">
                            <span>Veteranos +50</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="chkOtro" style="width: 18px; height: 18px;" onchange="toggleOtrosTipos()">
                            <span>Otro (agregar personalizados)</span>
                        </label>
                    </div>
                    
                    <div id="containerOtrosTipos" style="display: none; flex-direction: column; gap: 10px; margin-left: 26px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Agregá los tipos que necesites:</div>
                    </div>
                    
                    <button type="button" onclick="agregarOtroTipo()" class="btn-secondary" style="width: 100%; margin-top: 10px; display: none;" id="btnAgregarOtroTipo">
                        + Agregar otro tipo personalizado
                    </button>
                </div>

                <!-- UBICACIÓN DEL ENCUENTRO CON MAPA -->
                <div class="form-group">
                    <label>Ubicación del encuentro *</label>
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">
                        📍 Arrastrá el pin rojo para marcar exactamente dónde se juega (puede ser diferente a tu club)
                    </p>
                    
                    <!-- Mapa selector -->
                    <div id="mapaEncuentro" style="width: 100%; height: 300px; border-radius: 12px; margin-bottom: 15px; border: 2px solid #e2e8f0;"></div>
                    
                    <!-- Campos ocultos para coordenadas y ubicación -->
                    <input type="hidden" id="encLat" value="">
                    <input type="hidden" id="encLng" value="">
                    <input type="hidden" id="encPaisId" value="">
                    <input type="hidden" id="encProvinciaId" value="">
                    <input type="hidden" id="encCiudadId" value="">
                    
                    <!-- Dirección escrita (se completa automáticamente pero editable) -->
                    <label style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Dirección completa *</label>
                    <input type="text" id="encDireccion" required placeholder="Calle, número, ciudad, país..." style="margin-bottom: 10px;">
                    
                    <!-- Info de ubicación detectada -->
                    <div id="encUbicacionInfo" style="display: none; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px; font-size: 12px; color: #166534;">
                        ✅ Ubicación confirmada: <span id="encPaisNombre"></span> > <span id="encProvinciaNombre"></span> > <span id="encCiudadNombre"></span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Cupo máximo de equipos *</label>
                    <input type="number" id="encCupo" min="2" max="50" value="8" required>
                </div>

                <div class="form-group">
                    <label>Fechas y horarios *</label>
                    <div id="containerFechas" style="display: flex; flex-direction: column; gap: 15px;">
                    </div>
                    <button type="button" onclick="agregarDia()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                        + Agregar día
                    </button>
                </div>

                <div class="form-group">
                    <label>Valores / Opciones de inscripción *</label>
                    <div id="containerValores" style="display: flex; flex-direction: column; gap: 10px;">
                    </div>
                    <button type="button" onclick="agregarValor()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                        + Agregar opción de valor
                    </button>
                </div>

                <div class="form-group">
                    <label>Descripción general</label>
                    <textarea id="encDescripcion" rows="3" placeholder="Información adicional, Fechas limites y formas de pago etc.. Menú 3er tiempo, todo lo que concideres necesario"></textarea>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="cerrarModalEncuentro()" class="btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button type="submit" class="btn-primary" style="flex: 2;" id="btnGuardarEncuentro">
                        Crear encuentro
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Inicializar mapa
    setTimeout(() => initMapaEncuentro(), 100);
    
    agregarDia();
    agregarValor();
    
    document.getElementById('inputFlyer').addEventListener('change', subirFlyer);
}
function toggleOtrosTipos() {
    const chkOtro = document.getElementById('chkOtro');
    const container = document.getElementById('containerOtrosTipos');
    const btnAgregar = document.getElementById('btnAgregarOtroTipo');
    
    if (chkOtro.checked) {
        container.style.display = 'flex';
        btnAgregar.style.display = 'block';
        // Agregar el primero automáticamente si está vacío
        if (container.children.length <= 1) { // 1 porque hay el texto de ayuda
            agregarOtroTipo();
        }
    } else {
        container.style.display = 'none';
        btnAgregar.style.display = 'none';
        // Limpiar los inputs personalizados al desmarcar
        const inputs = container.querySelectorAll('.otro-tipo-input');
        inputs.forEach(input => input.parentElement.remove());
    }
}

function agregarOtroTipo() {
    const container = document.getElementById('containerOtrosTipos');
    const index = container.children.length + 1;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="otro-tipo-input" placeholder="Especificar tipo ${index}" required style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">
            ✕
        </button>
    `;
    
    container.appendChild(div);
}



let mapaEncuentro, markerEncuentro;

function initMapaEncuentro() {
    // Coordenadas por defecto (Argentina/Buenos Aires) o usar la del club si está disponible
    const defaultLat = -34.6037;
    const defaultLng = -58.3816;
    
    // Crear mapa
    mapaEncuentro = L.map('mapaEncuentro').setView([defaultLat, defaultLng], 13);
    
    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapaEncuentro);
    
    // Crear marker draggable
    markerEncuentro = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(mapaEncuentro);
    
    // Evento cuando se arrastra el marker
    markerEncuentro.on('dragend', async function() {
        const pos = markerEncuentro.getLatLng();
        await actualizarUbicacionEncuentro(pos.lat, pos.lng);
    });
    
    // Click en el mapa para mover el marker
    mapaEncuentro.on('click', async function(e) {
        markerEncuentro.setLatLng(e.latlng);
        await actualizarUbicacionEncuentro(e.latlng.lat, e.latlng.lng);
    });
    
    // Geolocalización del usuario (opcional)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                mapaEncuentro.setView([lat, lng], 13);
                markerEncuentro.setLatLng([lat, lng]);
                actualizarUbicacionEncuentro(lat, lng);
            },
            () => {
                // Si falla, usar default
                actualizarUbicacionEncuentro(defaultLat, defaultLng);
            }
        );
    } else {
        actualizarUbicacionEncuentro(defaultLat, defaultLng);
    }
}

// Función para obtener datos de ubicación desde coordenadas (reverse geocoding)
async function actualizarUbicacionEncuentro(lat, lng) {
    document.getElementById('encLat').value = lat;
    document.getElementById('encLng').value = lng;
    
    try {
        // Usar OpenStreetMap Nominatim para reverse geocoding (gratuito)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            
            // Completar dirección
            const direccionParts = [];
            if (addr.road) direccionParts.push(addr.road);
            if (addr.house_number) direccionParts.push(addr.house_number);
            if (addr.suburb) direccionParts.push(addr.suburb);
            if (addr.city || addr.town || addr.village) direccionParts.push(addr.city || addr.town || addr.village);
            
            const direccionCompleta = direccionParts.join(', ') || data.display_name || '';
            document.getElementById('encDireccion').value = direccionCompleta;
            
            // Guardar IDs de ubicación (simplificado - en producción deberías mapear a tus IDs reales)
            document.getElementById('encPaisId').value = addr.country_code || '';
            document.getElementById('encProvinciaId').value = addr.state || addr.province || '';
            document.getElementById('encCiudadId').value = addr.city || addr.town || addr.village || '';
            
            // Mostrar info
            document.getElementById('encPaisNombre').textContent = addr.country || 'Desconocido';
            document.getElementById('encProvinciaNombre').textContent = addr.state || addr.province || '';
            document.getElementById('encCiudadNombre').textContent = addr.city || addr.town || addr.village || '';
            document.getElementById('encUbicacionInfo').style.display = 'block';
        }
    } catch (err) {
        console.error('Error obteniendo ubicación:', err);
        // Dejar los campos para que el usuario complete manualmente
    }
}
// ============================================
// FECHAS DINÁMICAS
// ============================================

function agregarDia() {
    const container = document.getElementById('containerFechas');
    const index = container.children.length;
    
    const diaDiv = document.createElement('div');
    diaDiv.className = 'dia-item';
    diaDiv.style.cssText = 'background: #f8fafc; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0;';
    diaDiv.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="date" class="dia-fecha" required style="flex: 1;">
            <button type="button" onclick="this.closest('.dia-item').remove()" class="btn-rechazar" style="padding: 8px 12px; font-size: 12px;">
                ✕
            </button>
        </div>
        <div class="horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;">
        </div>
        <button type="button" onclick="agregarHorario(this)" class="btn-secondary" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px;">
            + Agregar horario
        </button>
    `;
    
    container.appendChild(diaDiv);
    agregarHorario(diaDiv.querySelector('button[onclick="agregarHorario(this)"]'));
}

function agregarHorario(btn) {
    const horariosContainer = btn.previousElementSibling;
    
    const horarioDiv = document.createElement('div');
    horarioDiv.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    horarioDiv.innerHTML = `
        <input type="time" class="horario-hora" required style="width: 100px;">
        <input type="text" class="horario-desc" placeholder="Descripción (ej: Acreditación)" required style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">
            ✕
        </button>
    `;
    
    horariosContainer.appendChild(horarioDiv);
}

// ============================================
// VALORES DINÁMICOS
// ============================================

function agregarValor() {
    const container = document.getElementById('containerValores');
    
    const valorDiv = document.createElement('div');
    valorDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;';
    valorDiv.innerHTML = `
        <input type="text" class="valor-titulo" placeholder="Título (ej: Completo)" required style="flex: 1;">
        <input type="number" class="valor-precio" placeholder="$" min="0" required style="width: 100px;">
        <input type="text" class="valor-desc" placeholder="Descripción opcional" style="flex: 2;">
        <button type="button" onclick="this.parentElement.remove()" class="btn-rechazar" style="padding: 6px 10px; font-size: 12px;">
            ✕
        </button>
    `;
    
    container.appendChild(valorDiv);
}

// ============================================
// SUBIR FLYER A IMGBB
// ============================================

async function subirFlyer() {
    const input = document.getElementById('inputFlyer');
    const file = input.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        mostrarMensajeEncuentros('El archivo debe ser una imagen', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('flyerPreview').innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    };
    reader.readAsDataURL(file);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const btnGuardar = document.getElementById('btnGuardarEncuentro');
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Subiendo flyer...';
        
        const response = await fetch('https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const url = result.data.url || result.data.display_url;
            document.getElementById('flyerUrl').value = url;
            document.getElementById('flyerPreview').innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            mostrarMensajeEncuentros('Flyer subido correctamente', 'success');
        } else {
            mostrarMensajeEncuentros('Error al subir flyer', 'error');
        }
    } catch (err) {
        mostrarMensajeEncuentros('Error de conexión', 'error');
    } finally {
        const btnGuardar = document.getElementById('btnGuardarEncuentro');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Crear encuentro';
        }
    }
}

function guardarEncuentro(e) {
    e.preventDefault();
    
    // 🔥 PREVENIR DOBLE SUBMIT
    const btnGuardar = document.getElementById('btnGuardarEncuentro');
    if (btnGuardar.disabled) return; // Ya se envió, ignorar
    
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Creando encuentro...';
    btnGuardar.style.opacity = '0.7';
    btnGuardar.style.cursor = 'not-allowed';
    
    
    // Validar ubicación
    if (!document.getElementById('encLat').value || !document.getElementById('encLng').value) {
        mostrarMensajeEncuentros('⚠️ Por favor marcá la ubicación en el mapa', 'error');
        return;
    }
    
    // Recolectar tipos seleccionados
    const tiposSeleccionados = [];
    document.querySelectorAll('input[name="encTipo"]:checked').forEach(cb => {
        tiposSeleccionados.push(cb.value);
    });
    
    const otrosInputs = document.querySelectorAll('.otro-tipo-input');
    otrosInputs.forEach(input => {
        if (input.value.trim()) {
            tiposSeleccionados.push(input.value.trim());
        }
    });
    
    if (tiposSeleccionados.length === 0) {
        mostrarMensajeEncuentros('Debes seleccionar al menos un tipo de encuentro', 'error');
        return;
    }
    
    const tipoFinal = tiposSeleccionados.join(', ');
    
    // Fechas
    const fechas = [];
    document.querySelectorAll('.dia-item').forEach(dia => {
        const fechaInput = dia.querySelector('.dia-fecha');
        if (!fechaInput.value) return;
        
        const horarios = [];
        dia.querySelectorAll('.horarios-container > div').forEach(h => {
            const hora = h.querySelector('.horario-hora').value;
            const desc = h.querySelector('.horario-desc').value;
            if (hora && desc) {
                horarios.push({ hora, desc });
            }
        });
        
        // Cambiar ESTO:
fechas.push({
    dia: fechaInput.value,  // ← Solo la fecha, sin hora
    horarios: horarios
});
    });
    
    if (fechas.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una fecha', 'error');
        return;
    }
    
    // Valores
    const valores = [];
    document.querySelectorAll('#containerValores > div').forEach(v => {
        const titulo = v.querySelector('.valor-titulo').value;
        const precio = v.querySelector('.valor-precio').value;
        const desc = v.querySelector('.valor-desc').value;
        if (titulo && precio) {
            valores.push({
                titulo,
                precio: parseFloat(precio),
                desc: desc || ''
            });
        }
    });
    
    if (valores.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una opción de valor', 'error');
        return;
    }
    
    const usuario = obtenerUsuarioActual();
    const params = new URLSearchParams({
        action: 'crearEncuentro',
        equipoCreadorId: usuario.equipoId,
        creadorNombre: usuario.equipoNombre,
        nombre: document.getElementById('encNombre').value,
        flyerUrl: document.getElementById('flyerUrl').value || '',
        fechasJSON: JSON.stringify(fechas),
        valoresJSON: JSON.stringify(valores),
        cupoMaximo: parseInt(document.getElementById('encCupo').value),
        lugar: document.getElementById('encDireccion').value,
        lat: document.getElementById('encLat').value,
        lng: document.getElementById('encLng').value,
        paisId: document.getElementById('encPaisId').value,
        provinciaId: document.getElementById('encProvinciaId').value,
        ciudadId: document.getElementById('encCiudadId').value,
        tipo: tipoFinal,
        descripcion: document.getElementById('encDescripcion').value,
        estado: 'publicado'
    });
    
    fetch(`${API_URL}?${params.toString()}`)
    .then(response => response.json())
   .then(result => {
        // Restaurar botón
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Crear encuentro';
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
        
        if (result.success) {
            cerrarModalEncuentro();
            mostrarMensajeEncuentros('Encuentro creado correctamente', 'success');
            renderizarMisEncuentros();
        } else {
            mostrarMensajeEncuentros(result.error || 'Error al crear encuentro', 'error');
        }
    })
    .catch(err => {
         btnGuardar.disabled = false;
        btnGuardar.textContent = 'Crear encuentro';
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
        
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error al crear encuentro', 'error');
    });
}
// ============================================
// RENDERIZAR MIS ENCUENTROS (desde API)
// ============================================
async function renderizarMisEncuentros() {
    const container = document.getElementById('listaMisEncuentros');
    const empty = document.getElementById('emptyCreados');

    if (!container) return;

    const usuario = obtenerUsuarioActual();
    
    try {
        const response = await fetch(`${API_URL}?action=getEncuentros&equipoId=${usuario.equipoId}`);
        const result = await response.json();
        
        if (!result.success) {
            mostrarMensajeEncuentros('Error al cargar encuentros', 'error');
            return;
        }
        
        const encuentros = result.data || [];
        
        // 🔥 ORDENAR: Último creado primero
        encuentros.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        if (encuentros.length === 0) {
            container.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        container.innerHTML = encuentros.map(enc => {
            let fechas = [];
            let valores = [];
            try {
                fechas = JSON.parse(enc.fechasJSON || '[]');
                valores = JSON.parse(enc.valoresJSON || '[]');
            } catch(e) {
                console.error('Error parseando JSON:', e);
            }
            
            const equiposConfirmados = 0;
            const plazasLibres = enc.cupoMaximo - equiposConfirmados;
            
            const fechasHTML = fechas.map(f => {
                const horariosHTML = f.horarios.map(h => `
                    <span style="display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 5px;">
                        ${h.hora}hs - ${h.desc}
                    </span>
                `).join('');
                
                return `
                    <div style="margin-bottom: 8px;">
                        <strong>📅 ${formatearFecha(f.dia)}</strong>
                        <div style="margin-top: 4px; margin-left: 24px;">
                            ${horariosHTML}
                        </div>
                    </div>
                `;
            }).join('');

            const mapaHTML = (enc.lat && enc.lng) ? `
                <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0;">
                    <iframe 
                        width="100%" 
                        height="150" 
                        frameborder="0" 
                        scrolling="no" 
                        marginheight="0" 
                        marginwidth="0" 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=${enc.lng-0.01}%2C${enc.lat-0.01}%2C${enc.lng+0.01}%2C${enc.lat+0.01}&layer=mapnik&marker=${enc.lat}%2C${enc.lng}" 
                        style="border: 0;">
                    </iframe>
                    <div style="background: #f8fafc; padding: 8px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📍 ${enc.direccion || 'Ubicación marcada'}</span>
                        <a href="https://www.google.com/maps?q=${enc.lat},${enc.lng}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 500;">
                            Abrir mapa →
                        </a>
                    </div>
                </div>
            ` : `<div style="color: #64748b; margin: 10px 0;">📍 ${enc.direccion || 'Sin ubicación'}</div>`;

            const estadoClass = `estado-${enc.estado || 'publicado'}`;
            const estadoTexto = enc.estado === 'publicado' ? 'Publicado' : 
                               enc.estado === 'borrador' ? 'Borrador' : 
                               enc.estado === 'cancelado' ? 'Cancelado' : enc.estado;

            // 🔥 BOTONES SEGÚN ESTADO
            const botonesHTML = enc.estado === 'cancelado' ? `
                <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
                    Ver detalle
                </button>
                <span style="color: #991b1b; font-weight: 600; padding: 8px 16px;">CANCELADO</span>
            ` : `
                <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
                    Ver detalle
                </button>
                <button onclick="editarEncuentro('${enc.id}')" class="btn-editar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #f1f5f9; color: #475569; cursor: pointer; font-weight: 500;">
                    Editar
                </button>
                <button onclick="cancelarEncuentro('${enc.id}')" class="btn-rechazar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #fee2e2; color: #991b1b; cursor: pointer; font-weight: 500;">
                    Cancelar
                </button>
                <button onclick="compartirEncuentro('${enc.id}')" class="btn-compartir" style="padding: 8px 16px; border-radius: 6px; border: none; background: #22c55e; color: white; cursor: pointer; font-weight: 500;">
                    Compartir
                </button>
            `;

            return `
                <div class="encuentro-card" style="${enc.estado === 'cancelado' ? 'opacity: 0.7; background: #f9fafb;' : ''}">
                    <div class="encuentro-header">
                        <div>
                            <div class="encuentro-titulo" style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 5px; line-height: 1.2;">
                                ${enc.nombre}
                            </div>
                            <span class="encuentro-estado ${estadoClass}" style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${enc.estado === 'publicado' ? '#dcfce7' : enc.estado === 'cancelado' ? '#fee2e2' : '#f1f5f9'}; color: ${enc.estado === 'publicado' ? '#166534' : enc.estado === 'cancelado' ? '#991b1b' : '#64748b'};">
                                ${estadoTexto}
                            </span>
                            ${enc.tipo ? enc.tipo.split(', ').map(t => `
                                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-left: 5px; margin-bottom: 5px;">
                                    ${t}
                                </span>
                            `).join('') : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #f1f5f9; color: #64748b; margin-left: 8px;">Sin tipo</span>'}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #4f46e5;">
                                ${equiposConfirmados}/${enc.cupoMaximo}
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b;">
                                ${plazasLibres > 0 ? plazasLibres + ' plaza' + (plazasLibres > 1 ? 's' : '') + ' libre' + (plazasLibres > 1 ? 's' : '') : 'Completo'}
                            </div>
                        </div>
                    </div>

                    <div class="encuentro-meta" style="margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
                        ${fechasHTML}
                        ${valores.length > 0 ? `<div style="margin-top: 5px;"><strong>💰 Valores:</strong><br>${valores.map(v => `• ${v.titulo}: $${parseFloat(v.precio).toLocaleString('es-AR')}${v.desc ? ` (${v.desc})` : ''}`).join('<br>')}</div>` : ''}
                    </div>

                    ${mapaHTML}

                    ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

                    ${enc.flyerUrl ? `
                        <div style="margin-bottom: 15px;">
                            <img src="${enc.flyerUrl}" style="max-width: 300px; border-radius: 8px; object-fit: cover;" alt="Flyer">
                        </div>
                    ` : ''}

                    <div class="acciones-encuentro" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${botonesHTML}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error cargando encuentros:', err);
        mostrarMensajeEncuentros('Error de conexión al cargar encuentros', 'error');
    }
}



// COMPARTIR ENCUENTRO

async function compartirEncuentro(id) {
    try {
        // Obtener datos del encuentro
        const response = await fetch(`${API_URL}?action=getEncuentroById&id=${id}`);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            mostrarMensajeEncuentros('Error al cargar datos del encuentro', 'error');
            return;
        }
        
        const enc = result.data;
        
        // Parsear fechas
        let fechas = [];
        try {
            fechas = JSON.parse(enc.fechasJSON || '[]');
        } catch(e) {
            console.error('Error parseando fechas:', e);
        }
        
        // Formatear fechas y horarios
        const fechasTexto = fechas.map(f => {
            const fechaFormateada = formatearFecha(f.dia);
            const horariosTexto = f.horarios.map(h => `   ${h.hora}hs - ${h.desc}`).join('\n');
            return `📅 ${fechaFormateada}\n${horariosTexto}`;
        }).join('\n\n');
        
        // Construir el mensaje
        const linkEncuentro = `https://arvetrugby.github.io/Arvet/preview.html?action=getEncuentroById&id=${id}`;
        
        let mensaje = `🏉 *${enc.nombre}*\n\n`;
        mensaje += `${fechasTexto}\n\n`;
        mensaje += `📍 ${enc.lugar || 'Ubicación a confirmar'}\n`;
        mensaje += `👥 Cupo: ${enc.cupoMaximo} equipos\n`;
        mensaje += `🏉 Organiza: ${enc.creadorNombre || 'Equipo organizador'}\n`;
        
        if (enc.descripcion) {
            mensaje += `\n📝 ${enc.descripcion.substring(0, 100)}${enc.descripcion.length > 100 ? '...' : ''}\n`;
        }
        
        if (enc.flyerUrl) {
            mensaje += `\n🖼️ ${enc.flyerUrl}\n`;
        }
        
        mensaje += `\n🔗 ${linkEncuentro}`;
        
        // Copiar al portapapeles
        await navigator.clipboard.writeText(mensaje);
        
        mostrarMensajeEncuentros('✅ Mensaje copiado. Pegalo en WhatsApp!', 'success');
        
    } catch (err) {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error al preparar el encuentro', 'error');
    }
}
// ============================================
// RENDERIZAR INVITACIONES (encuentros de otros equipos)
// ============================================

async function renderizarInvitaciones() {
  const container = document.getElementById('listaInvitaciones');
  const empty = document.getElementById('emptyInvitaciones');
  const badge = document.getElementById('badgeInvitaciones');

  if (!container) return;

  const usuario = obtenerUsuarioActual();
  
  try {
    // 🔥 Cargar TRES listas en paralelo
    const [respuestaAceptados, respuestaPendientes, respuestaRechazados] = await Promise.all([
      fetch(`${API_URL}?action=getEncuentrosAceptados&equipoId=${usuario.equipoId}`).then(r => r.json()),
      fetch(`${API_URL}?action=getEncuentrosParaInvitar&equipoId=${usuario.equipoId}`).then(r => r.json()),
      fetch(`${API_URL}?action=getEncuentrosRechazados&equipoId=${usuario.equipoId}`).then(r => r.json())
    ]);
    
    const aceptados = respuestaAceptados.success ? respuestaAceptados.data : [];
    const todosPendientes = respuestaPendientes.success ? respuestaPendientes.data : [];
    const rechazados = respuestaRechazados.success ? respuestaRechazados.data : [];
    
    // Filtrar pendientes: excluir los que ya respondimos (aceptados o rechazados)
    const idsRespondidos = new Set([
      ...aceptados.map(a => a.id),
      ...rechazados.map(r => r.id)
    ]);
    const pendientes = todosPendientes.filter(p => !idsRespondidos.has(p.id));

    // Actualizar badge (solo pendientes)
    if (badge) {
      if (pendientes.length > 0) {
        badge.textContent = pendientes.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }

    // Si no hay nada, mostrar empty state
    if (aceptados.length === 0 && pendientes.length === 0 && rechazados.length === 0) {
      container.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    // HTML de ACEPTADOS
    const aceptadosHTML = aceptados.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #059669; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #059669; border-radius: 50%;"></span>
          Invitaciones aceptadas (${aceptados.length})
        </h3>
        ${aceptados.map(enc => generarCardEncuentro(enc, 'aceptado')).join('')}
      </div>
    ` : '';

    // 🔥 HTML de RECHAZADOS (NUEVO)
    const rechazadosHTML = rechazados.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #991b1b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #991b1b; border-radius: 50%;"></span>
          Invitaciones rechazadas (${rechazados.length})
        </h3>
        ${rechazados.map(enc => generarCardEncuentro(enc, 'rechazado')).join('')}
      </div>
    ` : '';

    // HTML de PENDIENTES
    const pendientesHTML = pendientes.length > 0 ? `
      <div>
        <h3 style="color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
          Invitaciones pendientes (${pendientes.length})
        </h3>
        ${pendientes.map(enc => generarCardEncuentro(enc, 'pendiente')).join('')}
      </div>
    ` : '';

    // Orden: Aceptados → Rechazados → Pendientes
    container.innerHTML = aceptadosHTML + rechazadosHTML + pendientesHTML;
        
  } catch (err) {
    console.error('Error cargando invitaciones:', err);
    mostrarMensajeEncuentros('Error de conexión', 'error');
  }
}

// Función auxiliar para generar el HTML de una card
function generarCardEncuentro(enc, estado) {
  let fechas = [];
  let valores = [];
  try {
    fechas = JSON.parse(enc.fechasJSON || '[]');
    valores = JSON.parse(enc.valoresJSON || '[]');
  } catch(e) {
    console.error('Error parseando JSON:', e);
  }
  
  const fechasHTML = fechas.map(f => {
    const horariosHTML = f.horarios.map(h => `
      <span style="display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 5px;">
        ${h.hora}hs - ${h.desc}
      </span>
    `).join('');
    
    return `
      <div style="margin-bottom: 8px;">
        <strong>📅 ${formatearFecha(f.dia)}</strong>
        <div style="margin-top: 4px; margin-left: 24px;">
          ${horariosHTML}
        </div>
      </div>
    `;
  }).join('');

  const mapaHTML = (enc.lat && enc.lng) ? `
    <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0;">
      <iframe 
        width="100%" 
        height="150" 
        frameborder="0" 
        scrolling="no" 
        marginheight="0" 
        marginwidth="0" 
        src="https://www.openstreetmap.org/export/embed.html?bbox=${enc.lng-0.01}%2C${enc.lat-0.01}%2C${enc.lng+0.01}%2C${enc.lat+0.01}&layer=mapnik&marker=${enc.lat}%2C${enc.lng}" 
        style="border: 0;">
      </iframe>
      <div style="background: #f8fafc; padding: 8px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span>📍 ${enc.lugar || 'Ubicación marcada'}</span>
        <a href="https://www.google.com/maps?q=${enc.lat},${enc.lng}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 500;">
          Abrir mapa →
        </a>
      </div>
    </div>
  ` : `<div style="color: #64748b; margin: 10px 0;">📍 ${enc.lugar || 'Sin ubicación'}</div>`;

  // 🔥 BOTONES SEGÚN ESTADO (con case para 'rechazado')
  const botonesHTML = estado === 'aceptado' ? `
    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
      <span style="display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">
        ✓ Aceptado
      </span>
      <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
        Ver detalle
      </button>
      ${enc.telefonoOrganizador ? `
        <a href="https://wa.me/${String(enc.telefonoOrganizador).replace(/[^0-9]/g, '')}" 
           target="_blank" 
           style="display: inline-flex; align-items: center; gap: 6px; background: #25D366; color: white; padding: 8px 14px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="white">
            <path d="M16 .4C7.2.4.4 7.2.4 16c0 2.8.7 5.5 2.1 7.9L.4 32l8.3-2.1c2.3 1.3 4.9 2 7.6 2 8.8 0 15.6-6.8 15.6-15.6S24.8.4 16 .4zm0 28.6c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.9 1.2 1.3-4.8-.3-.5C3.6 20.7 3 18.4 3 16 3 8.8 8.8 3 16 3s13 5.8 13 13-5.8 13-13 13zm7.2-9.8c-.4-.2-2.3-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.5-.2.3-.4.3-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.9-1.8-2.2-.2-.3 0-.5.2-.7.2-.2.4-.4.6-.6.2-.2.3-.4.4-.6.1-.2 0-.4 0-.6 0-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.3 3.3c.2.2 2.2 3.4 5.4 4.7.8.3 1.4.5 1.9.6.8.2 1.5.2 2 .1.6-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.1-.4-.2-.8-.4z"/>
          </svg>
          WhatsApp Organizador
        </a>
      ` : ''}
    </div>
  ` : estado === 'rechazado' ? `
    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
      <span style="display: inline-flex; align-items: center; gap: 6px; background: #fee2e2; color: #991b1b; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">
        ✕ Rechazado
      </span>
      <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
        Ver detalle
      </button>
    </div>
  ` : `
    <div class="acciones-encuentro" style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
        Ver detalle
      </button>
      <button onclick="aceptarInvitacion('${enc.id}')" class="btn-aceptar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #4f46e5; color: white; cursor: pointer; font-weight: 500;">
        Aceptar invitación
      </button>
      <button onclick="rechazarInvitacion('${enc.id}')" class="btn-rechazar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #fee2e2; color: #991b1b; cursor: pointer; font-weight: 500;">
        Rechazar
      </button>
    </div>
  `;

  // Badge según estado
  const badgeEstado = estado === 'aceptado' ? 
    `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #d1fae5; color: #065f46; margin-left: 5px;">Aceptado</span>` :
    estado === 'rechazado' ?
    `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #fee2e2; color: #991b1b; margin-left: 5px;">Rechazado</span>` :
    `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #fef3c7; color: #92400e; margin-left: 5px;">Invitación disponible</span>`;

  // Borde según estado
  const borderStyle = estado === 'aceptado' ? 'border-left: 4px solid #10b981;' : 
                      estado === 'rechazado' ? 'border-left: 4px solid #ef4444; opacity: 0.85;' : 
                      '';

  return `
    <div class="encuentro-card ${estado === 'aceptado' ? 'invitacion-aceptada' : estado === 'rechazado' ? 'invitacion-rechazada' : 'invitacion-pendiente'}" style="${borderStyle}">
      <div class="encuentro-header">
        <div>
          <div class="encuentro-titulo" style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 5px;">
            ${enc.nombre}
          </div>
          ${badgeEstado}
          ${enc.tipo ? enc.tipo.split(', ').map(t => `
            <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-left: 5px; margin-bottom: 5px;">
              ${t}
            </span>
          `).join('') : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #f1f5f9; color: #64748b; margin-left: 8px;">Sin tipo</span>'}
        </div>
        
        <div style="text-align: right; min-width: 80px; flex-shrink: 0;">
          <div style="font-size: 1.5rem; font-weight: 800; color: #4f46e5;">
            0/${enc.cupoMaximo}
          </div>
          <div style="font-size: 0.8rem; color: #64748b; white-space: nowrap;">
            ${enc.cupoMaximo} plazas
          </div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Organiza
          </div>
          <div style="font-size: 0.9rem; color: #1e293b; font-weight: 600;">
            ${enc.creadorNombre || 'Equipo desconocido'}
          </div>
        </div>
      </div>
      
      <div class="encuentro-meta" style="margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
        ${fechasHTML}
        ${valores.length > 0 ? `<div style="margin-top: 5px;"><strong>💰 Valores:</strong><br>${valores.map(v => `• ${v.titulo}: $${parseFloat(v.precio).toLocaleString('es-AR')}${v.desc ? ` (${v.desc})` : ''}`).join('<br>')}</div>` : ''}
      </div>

      ${mapaHTML}

      ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

      ${enc.flyerUrl ? `
        <div style="margin-bottom: 15px;">
          <img src="${enc.flyerUrl}" style="max-width: 300px; border-radius: 8px; object-fit: cover;" alt="Flyer">
        </div>
      ` : ''}

      ${botonesHTML}
    </div>
  `;
}
async function aceptarInvitacion(encuentroId) {
  const usuario = obtenerUsuarioActual();
  
  // Usar GET en lugar de POST (evita problemas de CORS)
  const params = new URLSearchParams({
    action: 'responderEncuentro',
    encuentroId: encuentroId,
    equipoId: usuario.equipoId,
    estado: 'aceptado'
  });
  
  const url = `${API_URL}?${params.toString()}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    console.log('Result:', result);
    
    if (result.success) {
      mostrarMensajeEncuentros('¡Invitación aceptada!', 'success');
      setTimeout(() => renderizarInvitaciones(), 300);
    } else {
      mostrarMensajeEncuentros(result.error || 'Error al aceptar', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    mostrarMensajeEncuentros('Error de conexión', 'error');
  }
}

async function rechazarInvitacion(encuentroId) {
  if (!confirm('¿Seguro que querés rechazar esta invitación?')) return;
  
  const usuario = obtenerUsuarioActual();
  
  // 🔥 USAR GET en lugar de POST (igual que aceptarInvitacion)
  const params = new URLSearchParams({
    action: 'responderEncuentro',
    encuentroId: encuentroId,
    equipoId: usuario.equipoId,
    estado: 'rechazado'
  });
  
  const url = `${API_URL}?${params.toString()}`;
  console.log('URL rechazar:', url);  // Para debuggear
  
  try {
    const response = await fetch(url);  // ← GET, no POST
    const result = await response.json();
    
    if (result.success) {
      mostrarMensajeEncuentros('Invitación rechazada', 'info');
      setTimeout(() => renderizarInvitaciones(), 300);
    } else {
      mostrarMensajeEncuentros(result.error || 'Error al rechazar', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    mostrarMensajeEncuentros('Error de conexión', 'error');
  }
}


// ============================================
// FUNCIONES AUXILIARES
// ============================================

function obtenerUsuarioActual() {
    const usuarioDefault = {
        "id": "usr_123",
        "nombre": "Admin",
        "equipoId": "eq_tigres", 
        "equipoNombre": "Tigres RC",
        "rol": "admin"
    };
    
    const stored = localStorage.getItem('arvet_user');  
    return stored ? JSON.parse(stored) : usuarioDefault;
}
function formatearFecha(fechaStr) {
    // Siempre trabajar con strings, nunca con Date objects
    const partes = fechaStr.split('T')[0].split('-'); // Quitar la hora si existe
    const año = partes[0];
    const mes = parseInt(partes[1]);
    const dia = parseInt(partes[2]);
    
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    
    // Crear fecha solo para obtener el día de la semana (en UTC)
    const fechaUTC = new Date(Date.UTC(parseInt(año), mes - 1, dia));
    const nombreDia = dias[fechaUTC.getUTCDay()];
    const nombreMes = meses[mes - 1];
    
    return `${nombreDia} ${dia} ${nombreMes}`;
}

function cargarEncuentros() {
    renderizarMisEncuentros();
}

function cargarInvitaciones() {
    renderizarInvitaciones();
}

function cerrarModalEncuentro() {
    const modal = document.getElementById('modalEncuentro');
    if (modal) {
        modal.remove();
    }
}
// ============================================
// VER DETALLE CON LISTADO DE EQUIPOS
// ============================================

async function verDetalleEncuentro(encuentroId) {
    try {
        const [respEncuentro, respDetalle] = await Promise.all([
            fetch(`${API_URL}?action=getEncuentroById&id=${encuentroId}`).then(r => r.json()),
            fetch(`${API_URL}?action=getDetalleEncuentroCompleto&encuentroId=${encuentroId}`).then(r => r.json())
        ]);
        
        if (!respEncuentro.success) {
            mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
            return;
        }
        
        const enc = respEncuentro.data;
        const detalle = respDetalle.success ? respDetalle.data : { aceptados: [], rechazados: [], pendientes: [] };
        
        let fechas = [];
        let valores = [];
        try {
            fechas = JSON.parse(enc.fechasJSON || '[]');
            valores = JSON.parse(enc.valoresJSON || '[]');
        } catch(e) {
            console.error('Error parseando JSON:', e);
        }
        
        const fechasHTML = fechas.map(f => {
            const horariosHTML = f.horarios.map(h => `
                <span style="display: inline-block; background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-size: 0.9rem; margin-right: 5px; margin-bottom: 5px;">
                    ${h.hora}hs - ${h.desc}
                </span>
            `).join('');
            
            return `
                <div style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <strong style="color: #1e293b; font-size: 1.1rem;">📅 ${formatearFecha(f.dia)}</strong>
                    <div style="margin-top: 8px;">
                        ${horariosHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Lista de aceptados
        const listaAceptados = detalle.aceptados.length > 0 ? detalle.aceptados.map(eq => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <img src="${eq.logoUrl || 'https://i.ibb.co/Y7BMDcjt/logo-generico.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #166534;">${eq.nombre}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
                </div>
                ${eq.telefonoContacto ? `
                    <a href="https://wa.me/${String(eq.telefonoContacto).replace(/[^0-9]/g, '')}" target="_blank" style="background: #25D366; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem;">
                        WhatsApp
                    </a>
                ` : ''}
                <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">✓ Aceptado</span>
            </div>
        `).join('') : '<p style="color: #64748b; font-style: italic;">Ningún equipo ha aceptado aún</p>';

        // Lista de rechazados
        const listaRechazados = detalle.rechazados.length > 0 ? detalle.rechazados.map(eq => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; opacity: 0.8;">
                <img src="${eq.logoUrl || 'https://i.ibb.co/Y7BMDcjt/logo-generico.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #991b1b;">${eq.nombre}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
                </div>
                <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">✕ Rechazado</span>
            </div>
        `).join('') : '<p style="color: #64748b; font-style: italic;">Ningún equipo ha rechazado</p>';

        // Lista de pendientes
        const listaPendientes = detalle.pendientes.length > 0 ? detalle.pendientes.map(eq => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <img src="${eq.logoUrl || 'https://i.ibb.co/Y7BMDcjt/logo-generico.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #92400e;">${eq.nombre}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
                </div>
                <span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">⏳ Pendiente</span>
            </div>
        `).join('') : '<p style="color: #64748b; font-style: italic;">No hay equipos pendientes</p>';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalDetalleEncuentro';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>${enc.nombre}</h2>
                    <button class="btn-cerrar" onclick="document.getElementById('modalDetalleEncuentro').remove()">×</button>
                </div>
                
                <div style="padding: 20px;">
                    ${enc.flyerUrl ? `
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${enc.flyerUrl}" style="max-width: 100%; max-height: 300px; border-radius: 12px;" alt="Flyer">
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 0.9rem;">📍 Ubicación</h4>
                            <p style="margin: 0; color: #1e293b; font-weight: 500;">${enc.lugar || 'No especificada'}</p>
                            ${enc.lat && enc.lng ? `
                                <a href="https://www.google.com/maps?q=${enc.lat},${enc.lng}" target="_blank" style="color: #4f46e5; font-size: 0.9rem;">Ver en mapa →</a>
                            ` : ''}
                        </div>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 0.9rem;">👥 Cupo</h4>
                            <p style="margin: 0; color: #1e293b; font-weight: 500; font-size: 1.5rem;">
                                ${detalle.cantidadAceptados || 0}/${enc.cupoMaximo} equipos
                            </p>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">
                                ${(enc.cupoMaximo - (detalle.cantidadAceptados || 0))} plazas disponibles
                            </p>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">📅 Fechas y horarios</h4>
                        ${fechasHTML}
                    </div>

                    ${valores.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">💰 Valores</h4>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${valores.map(v => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                                        <div>
                                            <span style="font-weight: 600; color: #166534;">${v.titulo}</span>
                                            ${v.desc ? `<span style="color: #64748b; font-size: 0.9rem; margin-left: 8px;">(${v.desc})</span>` : ''}
                                        </div>
                                        <span style="font-weight: 700; color: #166534; font-size: 1.1rem;">
                                            $${parseFloat(v.precio).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${enc.descripcion ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 12px;">
                            <h4 style="color: #64748b; font-size: 0.9rem; margin: 0 0 10px 0;">📝 Descripción</h4>
                            <p style="margin: 0; color: #1e293b; line-height: 1.6;">${enc.descripcion}</p>
                        </div>
                    ` : ''}

                    <div style="margin-top: 30px;">
                        <h3 style="color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span>👥</span> Equipos invitados
                            <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">
                                (${detalle.totalEquipos || 0} equipos en total)
                            </span>
                        </h3>
                        
                        <!-- ACEPTADOS -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #166534; font-size: 0.9rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%;"></span>
                                Aceptados (${detalle.cantidadAceptados || 0})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${listaAceptados}
                            </div>
                        </div>

                        <!-- RECHAZADOS -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #991b1b; font-size: 0.9rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
                                Rechazados (${detalle.cantidadRechazados || 0})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${listaRechazados}
                            </div>
                        </div>

                        <!-- PENDIENTES -->
                        <div>
                            <h4 style="color: #92400e; font-size: 0.9rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
                                Pendientes (${detalle.cantidadPendientes || 0})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${listaPendientes}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (err) {
        console.error('Error cargando detalle:', err);
        mostrarMensajeEncuentros('Error al cargar detalle del encuentro', 'error');
    }
}

// ============================================
// EDITAR ENCUENTRO
// ============================================

async function editarEncuentro(encuentroId) {
    try {
        const response = await fetch(`${API_URL}?action=getEncuentroById&id=${encuentroId}`);
        const result = await response.json();
        
        if (!result.success) {
            mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
            return;
        }
        
        const enc = result.data;
        const usuario = obtenerUsuarioActual();
        
        // Verificar que sea el creador
        const encCheck = await fetch(`${API_URL}?action=getEncuentros&equipoId=${usuario.equipoId}`).then(r => r.json());
        const esCreador = encCheck.data && encCheck.data.some(e => e.id === encuentroId);
        
        if (!esCreador) {
            mostrarMensajeEncuentros('Solo el creador puede editar este encuentro', 'error');
            return;
        }

        // Parsear JSONs
        let fechas = [];
        let valores = [];
        try {
            fechas = JSON.parse(enc.fechasJSON || '[]');
            valores = JSON.parse(enc.valoresJSON || '[]');
        } catch(e) {
            console.error('Error parseando JSON:', e);
        }

        // Parsear tipos (viene como string "Veteranos +35, Otro tipo")
        const tiposArray = enc.tipo ? enc.tipo.split(', ').map(t => t.trim()) : [];
        const tiposPredefinidos = ['Veteranos +35', 'Veteranos +50'];
        const tiposSeleccionados = tiposArray.filter(t => tiposPredefinidos.includes(t));
        const tiposPersonalizados = tiposArray.filter(t => !tiposPredefinidos.includes(t));

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalEditarEncuentro';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Editar Encuentro</h2>
                    <button class="btn-cerrar" onclick="document.getElementById('modalEditarEncuentro').remove()">×</button>
                </div>
                
                <form id="formEditarEncuentro" onsubmit="guardarEdicionEncuentro(event, '${encuentroId}')">
                    
                    <div class="form-group">
                        <label>Flyer del encuentro</label>
                        <div id="editFlyerPreview" style="width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden;">
                            ${enc.flyerUrl ? `<img src="${enc.flyerUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="color: #94a3b8;">Sin flyer</span>'}
                        </div>
                        <input type="file" id="editInputFlyer" accept="image/*" style="display: none;">
                        <input type="hidden" id="editFlyerUrl" value="${enc.flyerUrl || ''}">
                        <button type="button" onclick="document.getElementById('editInputFlyer').click()" class="btn-secondary" style="width: 100%;">
                            📤 Cambiar flyer
                        </button>
                    </div>

                    <div class="form-group">
                        <label>Nombre del encuentro *</label>
                        <input type="text" id="editNombre" required value="${enc.nombre || ''}">
                    </div>

                    <!-- TIPO DE ENCUENTRO - MÚLTIPLE SELECCIÓN -->
                    <div class="form-group">
                        <label>Tipo de encuentro * (podés elegir varios)</label>
                        
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="editTipo" value="Veteranos +35" ${tiposSeleccionados.includes('Veteranos +35') ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <span>Veteranos +35</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="editTipo" value="Veteranos +50" ${tiposSeleccionados.includes('Veteranos +50') ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <span>Veteranos +50</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="editChkOtro" ${tiposPersonalizados.length > 0 ? 'checked' : ''} style="width: 18px; height: 18px;" onchange="toggleEditOtrosTipos()">
                                <span>Otro (agregar personalizados)</span>
                            </label>
                        </div>
                        
                        <div id="editContainerOtrosTipos" style="display: ${tiposPersonalizados.length > 0 ? 'flex' : 'none'}; flex-direction: column; gap: 10px; margin-left: 26px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Tipos personalizados:</div>
                            ${tiposPersonalizados.map((tipo, index) => `
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <input type="text" class="editOtro-tipo-input" value="${tipo}" placeholder="Tipo personalizado ${index + 1}" style="flex: 1;">
                                    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">✕</button>
                                </div>
                            `).join('')}
                        </div>
                        
                        <button type="button" onclick="agregarEditOtroTipo()" class="btn-secondary" style="width: 100%; margin-top: 10px; display: ${tiposPersonalizados.length > 0 ? 'block' : 'none'};" id="editBtnAgregarOtroTipo">
                            + Agregar otro tipo personalizado
                        </button>
                    </div>

                    <!-- UBICACIÓN CON MAPA -->
                    <div class="form-group">
                        <label>Ubicación del encuentro *</label>
                        <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">
                            📍 Arrastrá el pin rojo para marcar exactamente dónde se juega
                        </p>
                        
                        <div id="editMapaEncuentro" style="width: 100%; height: 300px; border-radius: 12px; margin-bottom: 15px; border: 2px solid #e2e8f0;"></div>
                        
                        <input type="hidden" id="editLat" value="${enc.lat || ''}">
                        <input type="hidden" id="editLng" value="${enc.lng || ''}">
                        <input type="hidden" id="editPaisId" value="${enc.paisId || ''}">
                        <input type="hidden" id="editProvinciaId" value="${enc.provinciaId || ''}">
                        <input type="hidden" id="editCiudadId" value="${enc.ciudadId || ''}">
                        
                        <label style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Dirección completa *</label>
                        <input type="text" id="editDireccion" required value="${enc.lugar || ''}" style="margin-bottom: 10px;">
                    </div>

                    <div class="form-group">
                        <label>Cupo máximo de equipos *</label>
                        <input type="number" id="editCupo" min="2" max="50" required value="${enc.cupoMaximo || 8}">
                    </div>

                    <!-- FECHAS DINÁMICAS -->
                    <div class="form-group">
                        <label>Fechas y horarios *</label>
                        <div id="editContainerFechas" style="display: flex; flex-direction: column; gap: 15px;">
                            ${fechas.length > 0 ? fechas.map((f, diaIndex) => `
                                <div class="edit-dia-item" style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0;">
                                    <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                                        <input type="date" class="edit-dia-fecha" required value="${f.dia}" style="flex: 1;">
                                        <button type="button" onclick="this.closest('.edit-dia-item').remove()" class="btn-rechazar" style="padding: 8px 12px; font-size: 12px;">✕</button>
                                    </div>
                                    <div class="edit-horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;">
                                        ${f.horarios && f.horarios.length > 0 ? f.horarios.map(h => `
                                            <div style="display: flex; gap: 8px; align-items: center;">
                                                <input type="time" class="edit-horario-hora" required value="${h.hora}" style="width: 100px;">
                                                <input type="text" class="edit-horario-desc" placeholder="Descripción" required value="${h.desc}" style="flex: 1;">
                                                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">✕</button>
                                            </div>
                                        `).join('') : ''}
                                    </div>
                                    <button type="button" onclick="agregarEditHorario(this)" class="btn-secondary" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px;">
                                        + Agregar horario
                                    </button>
                                </div>
                            `).join('') : ''}
                        </div>
                        <button type="button" onclick="agregarEditDia()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                            + Agregar día
                        </button>
                    </div>

                    <!-- VALORES DINÁMICOS -->
                    <div class="form-group">
                        <label>Valores / Opciones de inscripción *</label>
                        <div id="editContainerValores" style="display: flex; flex-direction: column; gap: 10px;">
                            ${valores.length > 0 ? valores.map(v => `
                                <div style="display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;">
                                    <input type="text" class="edit-valor-titulo" placeholder="Título" required value="${v.titulo}" style="flex: 1;">
                                    <input type="number" class="edit-valor-precio" placeholder="$" min="0" required value="${v.precio}" style="width: 100px;">
                                    <input type="text" class="edit-valor-desc" placeholder="Descripción opcional" value="${v.desc || ''}" style="flex: 2;">
                                    <button type="button" onclick="this.parentElement.remove()" class="btn-rechazar" style="padding: 6px 10px; font-size: 12px;">✕</button>
                                </div>
                            `).join('') : ''}
                        </div>
                        <button type="button" onclick="agregarEditValor()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                            + Agregar opción de valor
                        </button>
                    </div>

                    <div class="form-group">
                        <label>Descripción general</label>
                        <textarea id="editDescripcion" rows="3">${enc.descripcion || ''}</textarea>
                    </div>

                    <div style="display: flex; gap: 15px; margin-top: 25px;">
                        <button type="button" onclick="document.getElementById('modalEditarEncuentro').remove()" class="btn-secondary" style="flex: 1;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn-primary" style="flex: 2;" id="btnGuardarEdicion">
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Inicializar mapa con coordenadas existentes
        setTimeout(() => initEditMapaEncuentro(enc.lat, enc.lng), 100);
        
        // Handler para flyer
        document.getElementById('editInputFlyer').addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('editFlyerPreview').innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            };
            reader.readAsDataURL(file);
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                const btn = document.getElementById('btnGuardarEdicion');
                btn.disabled = true;
                btn.textContent = 'Subiendo...';
                
                const response = await fetch('https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (result.success) {
                    document.getElementById('editFlyerUrl').value = result.data.url;
                    mostrarMensajeEncuentros('Flyer actualizado', 'success');
                }
            } catch (err) {
                mostrarMensajeEncuentros('Error al subir flyer', 'error');
            } finally {
                const btn = document.getElementById('btnGuardarEdicion');
                btn.disabled = false;
                btn.textContent = 'Guardar cambios';
            }
        });
        
    } catch (err) {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error al cargar encuentro', 'error');
    }
}

async function guardarEdicionEncuentro(e, encuentroId) {
    e.preventDefault();
    
    // Validar ubicación
    const lat = document.getElementById('editLat')?.value;
    const lng = document.getElementById('editLng')?.value;
    
    if (!lat || !lng) {
        mostrarMensajeEncuentros('⚠️ Por favor marcá la ubicación en el mapa', 'error');
        return;
    }
    
    // Recolectar tipos
    const tiposSeleccionados = [];
    document.querySelectorAll('input[name="editTipo"]:checked').forEach(cb => {
        tiposSeleccionados.push(cb.value);
    });
    document.querySelectorAll('.editOtro-tipo-input').forEach(input => {
        if (input.value.trim()) tiposSeleccionados.push(input.value.trim());
    });
    
    if (tiposSeleccionados.length === 0) {
        mostrarMensajeEncuentros('Debes seleccionar al menos un tipo de encuentro', 'error');
        return;
    }
    
    // Recolectar fechas
    const fechas = [];
    document.querySelectorAll('.edit-dia-item').forEach(dia => {
        const fechaInput = dia.querySelector('.edit-dia-fecha');
        if (!fechaInput?.value) return;
        
        const horarios = [];
        dia.querySelectorAll('.edit-horarios-container > div').forEach(h => {
            const hora = h.querySelector('.edit-horario-hora')?.value;
            const desc = h.querySelector('.edit-horario-desc')?.value;
            if (hora && desc) horarios.push({ hora, desc });
        });
        
        // Cambiar ESTO:
fechas.push({
    dia: fechaInput.value,  // ← Solo la fecha, sin hora
    horarios: horarios
});
    });
    
    if (fechas.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una fecha', 'error');
        return;
    }
    
    // Recolectar valores
    const valores = [];
    document.querySelectorAll('#editContainerValores > div').forEach(v => {
        const titulo = v.querySelector('.edit-valor-titulo')?.value;
        const precio = v.querySelector('.edit-valor-precio')?.value;
        const desc = v.querySelector('.edit-valor-desc')?.value || '';
        if (titulo && precio) valores.push({ titulo, precio: parseFloat(precio), desc });
    });
    
    if (valores.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una opción de valor', 'error');
        return;
    }
    
    const usuario = obtenerUsuarioActual();
    
    // ENVIAR POR GET (codificando los JSON)
    const params = new URLSearchParams({
        action: 'actualizarEncuentro',
        id: encuentroId,
        equipoId: usuario.equipoId,
        nombre: document.getElementById('editNombre')?.value || '',
        flyerUrl: document.getElementById('editFlyerUrl')?.value || '',
        fechasJSON: encodeURIComponent(JSON.stringify(fechas)),
        valoresJSON: encodeURIComponent(JSON.stringify(valores)),
        cupoMaximo: document.getElementById('editCupo')?.value || 8,
        lugar: document.getElementById('editDireccion')?.value || '',
        lat: lat,
        lng: lng,
        paisId: document.getElementById('editPaisId')?.value || '',
        provinciaId: document.getElementById('editProvinciaId')?.value || '',
        ciudadId: document.getElementById('editCiudadId')?.value || '',
        tipo: tiposSeleccionados.join(', '),
        descripcion: document.getElementById('editDescripcion')?.value || ''
    });
    
    try {
        const url = `${API_URL}?${params.toString()}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('modalEditarEncuentro')?.remove();
            mostrarMensajeEncuentros('Encuentro actualizado correctamente', 'success');
            renderizarMisEncuentros();
        } else {
            mostrarMensajeEncuentros(result.error || 'Error al actualizar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error de conexión', 'error');
    }
}
// ============================================
// FUNCIONES AUXILIARES EDITAR
// ============================================
function toggleEditOtrosTipos() {
    const chkOtro = document.getElementById('editChkOtro');
    const container = document.getElementById('editContainerOtrosTipos');
    const btnAgregar = document.getElementById('editBtnAgregarOtroTipo');
    
    if (chkOtro.checked) {
        container.style.display = 'flex';
        btnAgregar.style.display = 'block';
        if (container.children.length <= 1) {
            agregarEditOtroTipo();
        }
    } else {
        container.style.display = 'none';
        btnAgregar.style.display = 'none';
        container.querySelectorAll('.editOtro-tipo-input').forEach(input => input.parentElement.remove());
    }
}

function agregarEditOtroTipo() {
    const container = document.getElementById('editContainerOtrosTipos');
    const index = container.querySelectorAll('.editOtro-tipo-input').length + 1;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="editOtro-tipo-input" placeholder="Especificar tipo ${index}" style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">✕</button>
    `;
    
    container.appendChild(div);
}

function initEditMapaEncuentro(latExistente, lngExistente) {
    const lat = parseFloat(latExistente) || -34.6037;
    const lng = parseFloat(lngExistente) || -58.3816;
    
    const mapa = L.map('editMapaEncuentro').setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);
    
    const marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(mapa);
    
    marker.on('dragend', async function() {
        const pos = marker.getLatLng();
        await actualizarEditUbicacion(pos.lat, pos.lng);
    });
    
    mapa.on('click', async function(e) {
        marker.setLatLng(e.latlng);
        await actualizarEditUbicacion(e.latlng.lat, e.latlng.lng);
    });
}

async function actualizarEditUbicacion(lat, lng) {
    document.getElementById('editLat').value = lat;
    document.getElementById('editLng').value = lng;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            const direccionParts = [];
            if (addr.road) direccionParts.push(addr.road);
            if (addr.house_number) direccionParts.push(addr.house_number);
            if (addr.suburb) direccionParts.push(addr.suburb);
            if (addr.city || addr.town || addr.village) direccionParts.push(addr.city || addr.town || addr.village);
            
            const direccionCompleta = direccionParts.join(', ') || data.display_name || '';
            document.getElementById('editDireccion').value = direccionCompleta;
            
            document.getElementById('editPaisId').value = addr.country_code || '';
            document.getElementById('editProvinciaId').value = addr.state || addr.province || '';
            document.getElementById('editCiudadId').value = addr.city || addr.town || addr.village || '';
        }
    } catch (err) {
        console.error('Error obteniendo ubicación:', err);
    }
}

function agregarEditDia() {
    const container = document.getElementById('editContainerFechas');
    
    const diaDiv = document.createElement('div');
    diaDiv.className = 'edit-dia-item';
    diaDiv.style.cssText = 'background: #f8fafc; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0;';
    diaDiv.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="date" class="edit-dia-fecha" required style="flex: 1;">
            <button type="button" onclick="this.closest('.edit-dia-item').remove()" class="btn-rechazar" style="padding: 8px 12px; font-size: 12px;">✕</button>
        </div>
        <div class="edit-horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;">
        </div>
        <button type="button" onclick="agregarEditHorario(this)" class="btn-secondary" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px;">
            + Agregar horario
        </button>
    `;
    
    container.appendChild(diaDiv);
    agregarEditHorario(diaDiv.querySelector('button[onclick="agregarEditHorario(this)"]'));
}

function agregarEditHorario(btn) {
    const horariosContainer = btn.previousElementSibling;
    
    const horarioDiv = document.createElement('div');
    horarioDiv.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    horarioDiv.innerHTML = `
        <input type="time" class="edit-horario-hora" required style="width: 100px;">
        <input type="text" class="edit-horario-desc" placeholder="Descripción (ej: Acreditación)" required style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">✕</button>
    `;
    
    horariosContainer.appendChild(horarioDiv);
}

function agregarEditValor() {
    const container = document.getElementById('editContainerValores');
    
    const valorDiv = document.createElement('div');
    valorDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;';
    valorDiv.innerHTML = `
        <input type="text" class="edit-valor-titulo" placeholder="Título (ej: Completo)" required style="flex: 1;">
        <input type="number" class="edit-valor-precio" placeholder="$" min="0" required style="width: 100px;">
        <input type="text" class="edit-valor-desc" placeholder="Descripción opcional" style="flex: 2;">
        <button type="button" onclick="this.parentElement.remove()" class="btn-rechazar" style="padding: 6px 10px; font-size: 12px;">✕</button>
    `;
    
    container.appendChild(valorDiv);
}
// ============================================
// CANCELAR ENCUENTRO
// ============================================

async function cancelarEncuentro(encuentroId) {
    if (!confirm('¿Seguro que querés cancelar este encuentro?\n\nEl encuentro seguirá visible pero marcado como cancelado.')) {
        return;
    }
    
    const usuario = obtenerUsuarioActual();
    
    // Usar GET en lugar de POST
    const params = new URLSearchParams({
        action: 'cancelarEncuentro',
        encuentroId: encuentroId,
        equipoId: usuario.equipoId
    });
    
    const url = `${API_URL}?${params.toString()}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            mostrarMensajeEncuentros('Encuentro cancelado', 'success');
            renderizarMisEncuentros();
        } else {
            mostrarMensajeEncuentros(result.error || 'Error al cancelar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error de conexión', 'error');
    }
}
function compartirEncuentro(id) {
    const url = `https://arvetrugby.github.io/Arvet/preview.html?action=getEncuentroById&id=${id}`;
    navigator.clipboard.writeText(url)
        .then(() => mostrarMensajeEncuentros('Link copiado al portapapeles', 'success'))
        .catch(err => mostrarMensajeEncuentros('No se pudo copiar el link', 'error'));
}
