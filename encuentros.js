// Función de mensajes propia para encuentros.js
function mostrarMensaje(texto, tipo = 'info') {
    // Crear overlay si no existe
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
// ============================================
// ARVET - SISTEMA DE ENCUENTROS/PARTIDOS
// ============================================

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
    // Cargar datos del localStorage o API
    cargarEncuentros();

    // Escuchar cambios de pestaña
    window.addEventListener('encuentrosTabChange', function(e) {
        if (e.detail === 'invitaciones') {
            cargarInvitaciones();
        }
    });
});

// ============================================
// NAVEGACIÓN DE TABS
// ============================================

function showEncuentrosTab(tab) {
    // Actualizar botones
    document.querySelectorAll('.encuentros-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#e2e8f0';
        btn.style.color = '#64748b';
    });

    const btnActivo = document.getElementById(`tabBtn${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    btnActivo.classList.add('active');
    btnActivo.style.background = '#4f46e5';
    btnActivo.style.color = 'white';

    // Mostrar contenido
    document.querySelectorAll('#encuentros .tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`tab-${tab}`).style.display = 'block';

    // Cargar datos según tab
    if (tab === 'creados') {
        renderizarMisEncuentros();
    } else {
        renderizarInvitaciones();
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
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Crear Nuevo Encuentro</h2>
                <button class="btn-cerrar" onclick="cerrarModalEncuentro()">×</button>
            </div>
            
            <form id="formEncuentro" onsubmit="guardarEncuentro(event)">
                
                <!-- FLYER -->
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

                <!-- NOMBRE -->
                <div class="form-group">
                    <label>Nombre del encuentro *</label>
                    <input type="text" id="encNombre" required placeholder="Ej: Encuentro de Veteranos 2024">
                </div>

                <!-- TIPO DE RUGBY -->
                <div class="form-group">
                    <label>Tipo de encuentro *</label>
                    <select id="encTipo" required onchange="toggleOtroTipo(this.value)">
                        <option value="">Seleccionar...</option>
                        <option value="Veteranos +35">Veteranos +35</option>
                        <option value="Veteranos +50">Veteranos +50</option>
                        <option value="otro">Otro (especificar)</option>
                    </select>
                    <input type="text" id="encTipoOtro" style="display: none; margin-top: 10px;" placeholder="Especificar tipo de encuentro">
                </div>

                <!-- LUGAR -->
                <div class="form-group">
                    <label>Lugar / Cancha *</label>
                    <input type="text" id="encLugar" required placeholder="Nombre y dirección de la cancha">
                </div>

                <!-- CUPO -->
                <div class="form-group">
                    <label>Cupo máximo de equipos *</label>
                    <input type="number" id="encCupo" min="2" max="50" value="8" required>
                </div>

                <!-- FECHAS DINÁMICAS -->
                <div class="form-group">
                    <label>Fechas y horarios *</label>
                    <div id="containerFechas" style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- Las fechas se agregan dinámicamente -->
                    </div>
                    <button type="button" onclick="agregarDia()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                        + Agregar día
                    </button>
                </div>

                <!-- VALORES DINÁMICOS -->
                <div class="form-group">
                    <label>Valores / Opciones de inscripción *</label>
                    <div id="containerValores" style="display: flex; flex-direction: column; gap: 10px;">
                        <!-- Los valores se agregan dinámicamente -->
                    </div>
                    <button type="button" onclick="agregarValor()" class="btn-secondary" style="margin-top: 15px; width: 100%;">
                        + Agregar opción de valor
                    </button>
                </div>

                <!-- DESCRIPCIÓN GENERAL -->
                <div class="form-group">
                    <label>Descripción general</label>
                    <textarea id="encDescripcion" rows="3" placeholder="Información adicional, reglas especiales, premios..."></textarea>
                </div>

                <!-- BOTONES -->
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
    
    // Inicializar con un día y un valor por defecto
    agregarDia();
    agregarValor();
    
    // Event listener para subir flyer
    document.getElementById('inputFlyer').addEventListener('change', subirFlyer);
}

function toggleOtroTipo(valor) {
    const inputOtro = document.getElementById('encTipoOtro');
    inputOtro.style.display = valor === 'otro' ? 'block' : 'none';
    if (valor !== 'otro') inputOtro.value = '';
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
            <!-- Horarios se agregan aquí -->
        </div>
        <button type="button" onclick="agregarHorario(this)" class="btn-secondary" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px;">
            + Agregar horario
        </button>
    `;
    
    container.appendChild(diaDiv);
    
    // Agregar un horario por defecto
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
    
    // Validar
    if (!file.type.startsWith('image/')) {
        mostrarMensaje('El archivo debe ser una imagen', 'error');
        return;
    }
    
    // Mostrar preview local mientras sube
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('flyerPreview').innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    };
    reader.readAsDataURL(file);
    
    // Subir a imgbb (misma API key que usás en panel-jugador)
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
            mostrarMensaje('Flyer subido correctamente', 'success');
        } else {
            mostrarMensaje('Error al subir flyer', 'error');
        }
    } catch (err) {
        mostrarMensaje('Error de conexión', 'error');
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
    
    // Obtener tipo
    let tipo = document.getElementById('encTipo').value;
    if (tipo === 'otro') {
        tipo = document.getElementById('encTipoOtro').value || 'Otro';
    }
    
    // Recolectar fechas
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
        
        fechas.push({
            dia: fechaInput.value,
            horarios: horarios
        });
    });
    
    if (fechas.length === 0) {
        mostrarMensaje('Debes agregar al menos una fecha', 'error');
        return;
    }
    
    // Recolectar valores
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
        mostrarMensaje('Debes agregar al menos una opción de valor', 'error');
        return;
    }
    
    // Crear objeto encuentro
    const usuario = obtenerUsuarioActual();
    const encuentro = {
        equipoCreadorId: usuario.equipoId,
        creadorNombre: usuario.equipoNombre,
        nombre: document.getElementById('encNombre').value,
        flyerUrl: document.getElementById('flyerUrl').value || '',
        fechasJSON: JSON.stringify(fechas),
        valoresJSON: JSON.stringify(valores),
        cupoMaximo: parseInt(document.getElementById('encCupo').value),
        lugar: document.getElementById('encLugar').value,
        tipo: tipo,
        descripcion: document.getElementById('encDescripcion').value,
        estado: 'publicado'
    };
    
    // Enviar a Apps Script
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'crearEncuentro',
            ...encuentro
        })
    })
    .then(() => {
        cerrarModalEncuentro();
        mostrarMensaje('Encuentro creado correctamente', 'success');
        renderizarMisEncuentros();
    })
    .catch(err => {
        console.error('Error:', err);
        mostrarMensaje('Error al crear encuentro', 'error');
    });
}
// ============================================
// RENDERIZAR MIS ENCUENTROS
// ============================================

function renderizarMisEncuentros() {
    const container = document.getElementById('listaMisEncuentros');
    const empty = document.getElementById('emptyCreados');

    const usuario = obtenerUsuarioActual();
    const encuentros = JSON.parse(localStorage.getItem('arvet_encuentros') || '[]')
        .filter(e => e.creadorId === usuario.id)
        .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

    if (encuentros.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    container.innerHTML = encuentros.map(enc => {
        const nivelClass = `nivel-${enc.nivel}`;
        const estadoClass = `estado-${enc.estado}`;

        const equiposConfirmados = enc.equipos ? enc.equipos.length : 0;
        const plazasLibres = enc.cupoMaximo - equiposConfirmados;

        return `
            <div class="encuentro-card">
                <div class="encuentro-header">
                    <div>
                        <div class="encuentro-titulo">${enc.nombre}</div>
                        <span class="nivel-tag ${nivelClass}">${enc.nivel}</span>
                        <span class="encuentro-estado ${estadoClass}">${enc.estado}</span>
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

                <div class="encuentro-meta">
                    <span>📅 ${formatearFecha(enc.fecha)} ${enc.hora ? '• ' + enc.hora + 'hs' : ''}</span>
                    <span>📍 ${enc.lugar}</span>
                    <span>🏉 ${enc.tipo} ${enc.formato}</span>
                    ${enc.costo > 0 ? `<span>💰 $${enc.costo} por equipo</span>` : ''}
                </div>

                ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px;">${enc.descripcion}</p>` : ''}

                ${renderizarEquiposParticipantes(enc)}

                ${renderizarDocumentacionRequerida(enc)}

                <div class="acciones-encuentro">
                    <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver">
                        Ver detalle
                    </button>
                    <button onclick="editarEncuentro('${enc.id}')" class="btn-editar">
                        Editar
                    </button>
                    ${enc.estado !== 'cancelado' ? `
                        <button onclick="cancelarEncuentro('${enc.id}')" class="btn-rechazar">
                            Cancelar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderizarEquiposParticipantes(enc) {
    if (!enc.equipos || enc.equipos.length === 0) {
        return '<p style="color: #94a3b8; font-style: italic;">Sin equipos confirmados todavía</p>';
    }

    const equiposHTML = enc.equipos.map(eq => `
        <div class="equipo-item">
            <div>
                <div class="equipo-nombre">${eq.nombre}</div>
                <div style="font-size: 0.8rem; color: #64748b;">
                    ${eq.jugadoresConfirmados || 0} jugadores confirmados
                </div>
            </div>
            <span class="equipo-estado aceptado">Confirmado</span>
        </div>
    `).join('');

    return `
        <div class="equipos-participantes">
            <h4 style="margin-top: 0; color: #374151;">Equipos confirmados</h4>
            ${equiposHTML}
        </div>
    `;
}

function renderizarDocumentacionRequerida(enc) {
    const docs = [];
    if (enc.documentacion?.aptoMedico) docs.push('Apto médico');
    if (enc.documentacion?.fichaMedica) docs.push('Ficha médica federativa');
    if (enc.documentacion?.dni) docs.push('DNI');
    if (enc.documentacion?.fichaInscripcion) docs.push('Ficha de inscripción');
    if (enc.documentacion?.formularioAdicional) docs.push('Formulario adicional');

    if (docs.length === 0) return '';

    return `
        <div class="documentacion-requerida">
            <h4 style="margin-top: 0; color: #92400e;">📋 Documentación obligatoria</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                ${docs.map(d => `<li>${d}</li>`).join('')}
            </ul>
        </div>
    `;
}

// ============================================
// RENDERIZAR INVITACIONES RECIBIDAS
// ============================================

function renderizarInvitaciones() {
    const container = document.getElementById('listaInvitaciones');
    const empty = document.getElementById('emptyInvitaciones');
    const badge = document.getElementById('badgeInvitaciones');

    const usuario = obtenerUsuarioActual();

    // Obtener invitaciones para este equipo
    const invitaciones = JSON.parse(localStorage.getItem('arvet_invitaciones') || '[]')
        .filter(i => i.equipoId === usuario.id && i.estado === 'pendiente')
        .sort((a, b) => new Date(b.fechaEnvio) - new Date(a.fechaEnvio));

    // Actualizar badge
    if (invitaciones.length > 0) {
        badge.textContent = invitaciones.length;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }

    if (invitaciones.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    container.innerHTML = invitaciones.map(inv => {
        const encuentro = obtenerEncuentroPorId(inv.encuentroId);
        if (!encuentro) return '';

        const nivelClass = `nivel-${encuentro.nivel}`;

        return `
            <div class="encuentro-card invitacion-pendiente">
                <div class="encuentro-header">
                    <div>
                        <div class="encuentro-titulo">${encuentro.nombre}</div>
                        <span class="nivel-tag ${nivelClass}">${encuentro.nivel}</span>
                        <span class="encuentro-estado estado-borrador">Invitación pendiente</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: #64748b;">
                            De: <strong>${encuentro.creadorNombre}</strong>
                        </div>
                    </div>
                </div>

                <div class="encuentro-meta">
                    <span>📅 ${formatearFecha(encuentro.fecha)} ${encuentro.hora ? '• ' + encuentro.hora + 'hs' : ''}</span>
                    <span>📍 ${encuentro.lugar}</span>
                    <span>🏉 ${encuentro.tipo} ${encuentro.formato}</span>
                </div>

                ${encuentro.descripcion ? `<p style="color: #64748b; margin-bottom: 15px;">${encuentro.descripcion}</p>` : ''}

                ${renderizarDocumentacionRequerida(encuentro)}

                <div class="acciones-encuentro">
                    <button onclick="aceptarInvitacion('${inv.id}')" class="btn-aceptar">
                        Aceptar invitación
                    </button>
                    <button onclick="rechazarInvitacion('${inv.id}')" class="btn-rechazar">
                        Rechazar
                    </button>
                    <button onclick="verDetalleEncuentro('${encuentro.id}')" class="btn-ver">
                        Ver más
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// ACCIONES DE INVITACIONES
// ============================================

function aceptarInvitacion(invitacionId) {
    const invitaciones = JSON.parse(localStorage.getItem('arvet_invitaciones') || '[]');
    const invIndex = invitaciones.findIndex(i => i.id === invitacionId);

    if (invIndex === -1) return;

    const invitacion = invitaciones[invIndex];
    invitacion.estado = 'aceptada';
    invitacion.fechaRespuesta = new Date().toISOString();

    localStorage.setItem('arvet_invitaciones', JSON.stringify(invitaciones));

    // Agregar equipo al encuentro
    const encuentros = JSON.parse(localStorage.getItem('arvet_encuentros') || '[]');
    const encIndex = encuentros.findIndex(e => e.id === invitacion.encuentroId);

    if (encIndex !== -1) {
        const usuario = obtenerUsuarioActual();
        encuentros[encIndex].equipos.push({
            id: usuario.id,
            nombre: usuario.equipoNombre,
            fechaAceptacion: new Date().toISOString(),
            jugadoresConfirmados: 0,
            jugadores: []
        });

        // Sacar de invitaciones pendientes
        encuentros[encIndex].invitacionesPendientes = encuentros[encIndex].invitacionesPendientes
            .filter(id => id !== usuario.id);

        localStorage.setItem('arvet_encuentros', JSON.stringify(encuentros));

        // Notificar a jugadores del equipo
        notificarJugadoresDeEquipo(encuentros[encIndex]);
    }

    mostrarMensaje('Invitación aceptada. Se notificó a tu plantel.', 'success');
    renderizarInvitaciones();
}

function rechazarInvitacion(invitacionId) {
    if (!confirm('¿Seguro que querés rechazar esta invitación?')) return;

    const invitaciones = JSON.parse(localStorage.getItem('arvet_invitaciones') || '[]');
    const invIndex = invitaciones.findIndex(i => i.id === invitacionId);

    if (invIndex === -1) return;

    invitaciones[invIndex].estado = 'rechazada';
    invitaciones[invIndex].fechaRespuesta = new Date().toISOString();

    localStorage.setItem('arvet_invitaciones', JSON.stringify(invitaciones));

    mostrarMensaje('Invitación rechazada', 'info');
    renderizarInvitaciones();
}

function notificarJugadoresDeEquipo(encuentro) {
    // Simulación: agregar notificación a cada jugador del equipo
    const jugadores = JSON.parse(localStorage.getItem('arvet_jugadores') || '[]')
        .filter(j => j.equipoId === obtenerUsuarioActual().id);

    const notificaciones = jugadores.map(j => ({
        id: 'not_' + Date.now() + '_' + j.id,
        jugadorId: j.id,
        tipo: 'nuevo_encuentro',
        titulo: 'Nuevo encuentro confirmado',
        mensaje: `El equipo se sumó a: ${encuentro.nombre}`,
        encuentroId: encuentro.id,
        fecha: new Date().toISOString(),
        leida: false
    }));

    let todasNotis = JSON.parse(localStorage.getItem('arvet_notificaciones') || '[]');
    todasNotis = todasNotis.concat(notificaciones);
    localStorage.setItem('arvet_notificaciones', JSON.stringify(todasNotis));
}

// ============================================
// EDICIÓN Y CANCELACIÓN
// ============================================

function editarEncuentro(encuentroId) {
    const encuentro = obtenerEncuentroPorId(encuentroId);
    if (!encuentro) return;

    // Solo el creador puede editar
    const usuario = obtenerUsuarioActual();
    if (encuentro.creadorId !== usuario.id) {
        mostrarMensaje('Solo el creador puede editar este encuentro', 'error');
        return;
    }

    // No se puede editar si ya hay equipos confirmados (solo cancelar)
    if (encuentro.equipos && encuentro.equipos.length > 0) {
        mostrarMensaje('No se puede editar: ya hay equipos confirmados', 'error');
        return;
    }

    // TODO: Implementar modal de edición
    mostrarMensaje('Función de edición en desarrollo', 'info');
}

function cancelarEncuentro(encuentroId) {
    const encuentro = obtenerEncuentroPorId(encuentroId);
    if (!encuentro) return;

    const usuario = obtenerUsuarioActual();
    if (encuentro.creadorId !== usuario.id) {
        mostrarMensaje('Solo el creador puede cancelar', 'error');
        return;
    }

    if (!confirm('¿Seguro que querés cancelar este encuentro? Se notificará a todos los equipos invitados.')) {
        return;
    }

    encuentro.estado = 'cancelado';
    actualizarEncuentro(encuentro);

    // Notificar a equipos invitados
    // TODO: Implementar notificación

    mostrarMensaje('Encuentro cancelado', 'info');
    renderizarMisEncuentros();
}

function verDetalleEncuentro(encuentroId) {
    const encuentro = obtenerEncuentroPorId(encuentroId);
    if (!encuentro) return;

    // TODO: Implementar vista detallada
    mostrarMensaje('Vista detallada en desarrollo', 'info');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function obtenerUsuarioActual() {
    // Simulación - en producción viene del login/token
    const usuarioDefault = {
        "id": "usr_123",
        "nombre": "Admin",
        "equipoId": "eq_tigres",
        "equipoNombre": "Tigres RC",
        "rol": "admin"
    };

    const stored = localStorage.getItem('arvet_usuario');
    return stored ? JSON.parse(stored) : usuarioDefault;
}

function obtenerEncuentroPorId(id) {
    const encuentros = JSON.parse(localStorage.getItem('arvet_encuentros') || '[]');
    return encuentros.find(e => e.id === id);
}

function actualizarEncuentro(encuentro) {
    const encuentros = JSON.parse(localStorage.getItem('arvet_encuentros') || '[]');
    const index = encuentros.findIndex(e => e.id === encuentro.id);
    if (index !== -1) {
        encuentros[index] = encuentro;
        localStorage.setItem('arvet_encuentros', JSON.stringify(encuentros));
    }
}

function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function mostrarMensaje(texto, tipo = 'info') {
    // Usar tu sistema de mensajes existente
    const overlay = document.getElementById('msgOverlay');
    const msg = document.getElementById('msgConfig');

    if (overlay && msg) {
        msg.textContent = texto;
        msg.className = 'message ' + tipo;
        overlay.style.display = 'flex';

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 3000);
    }
}

function cargarEncuentros() {
    renderizarMisEncuentros();
}

function cargarInvitaciones() {
    renderizarInvitaciones();
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
    
    const stored = localStorage.getItem('arvet_usuario');
    return stored ? JSON.parse(stored) : usuarioDefault;
}

// ... (resto de funciones auxiliares)

function cargarEncuentros() {
    renderizarMisEncuentros();
}

function cargarInvitaciones() {
    renderizarInvitaciones();
}

// ============================================
// CERRAR MODAL (al final de todo)
// ============================================

function cerrarModalEncuentro() {
    const modal = document.getElementById('modalEncuentro');
    if (modal) {
        modal.remove();
    }
}

async function cargarEncuentrosDesdeHoja() {
    const usuario = obtenerUsuarioActual();
    
    try {
        const response = await fetch(`${API_URL}?action=getEncuentros&equipoId=${usuario.equipoId}`);
        const data = await response.json();
        
        if (data.success) {
            // Guardar en localStorage para uso offline
            localStorage.setItem('arvet_encuentros', JSON.stringify(data.data));
            renderizarMisEncuentros();
        }
    } catch (err) {
        console.error('Error cargando encuentros:', err);
        // Fallback a localStorage
        renderizarMisEncuentros();
    }
}
