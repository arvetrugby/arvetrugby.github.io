console.log('encuentros.js cargado correctamente');
window.testCarga = true;
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
// CREAR NUEVO ENCUENTRO
// ============================================

function nuevoEncuentro() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalEncuentro';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Crear Nuevo Encuentro</h2>
                <button class="btn-cerrar" onclick="cerrarModalEncuentro()">×</button>
            </div>
            
            <form id="formEncuentro" onsubmit="guardarEncuentro(event)">
                <div class="form-group">
                    <label>Nombre del encuentro *</label>
                    <input type="text" id="encNombre" required placeholder="Ej: Encuentro de Veteranos 2024">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha *</label>
                        <input type="date" id="encFecha" required>
                    </div>
                    <div class="form-group">
                        <label>Hora</label>
                        <input type="time" id="encHora">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Lugar / Cancha *</label>
                    <input type="text" id="encLugar" required placeholder="Nombre y dirección de la cancha">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo de rugby</label>
                        <select id="encTipo">
                            <option value="veteranos">Veteranos</option>
                            <option value="primera">Primera</option>
                            <option value="juveniles">Juveniles</option>
                            <option value="mixto">Mixto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Formato</label>
                        <select id="encFormato">
                            <option value="15">XV</option>
                            <option value="10">X</option>
                            <option value="7">VII</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Cupo máximo de equipos *</label>
                        <input type="number" id="encCupo" min="2" max="20" value="4" required>
                    </div>
                    <div class="form-group">
                        <label>Costo por equipo ($)</label>
                        <input type="number" id="encCosto" min="0" placeholder="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descripción / Información adicional</label>
                    <textarea id="encDescripcion" rows="3" placeholder="Reglas especiales, premios, observaciones..."></textarea>
                </div>
                
                <div class="filtros-section">
                    <h4>🎯 Filtros de invitación</h4>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
                        ¿A quiénes querés invitar? Seleccioná el nivel y los filtros geográficos.
                    </p>
                    
                    <div class="form-group">
                        <label>Nivel del encuentro *</label>
                        <select id="encNivel" required onchange="actualizarFiltrosNivel()">
                            <option value="internacional">🌍 Internacional - Todos los países</option>
                            <option value="nacional">🇦🇷 Nacional - Todo el país</option>
                            <option value="regional">📍 Regional - Provincia/Estado</option>
                            <option value="exclusivo">🔒 Exclusivo - Solo equipos seleccionados</option>
                        </select>
                    </div>
                    
                    <div id="filtrosGeograficos" style="display: none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>País</label>
                                <select id="filtroPais" onchange="cargarProvincias()">
                                    <option value="">Todos</option>
                                    <option value="AR">Argentina</option>
                                    <option value="UY">Uruguay</option>
                                    <option value="CL">Chile</option>
                                    <option value="BR">Brasil</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Provincia/Estado</label>
                                <select id="filtroProvincia">
                                    <option value="">Todas</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Ciudad específica (opcional)</label>
                            <input type="text" id="filtroCiudad" placeholder="Nombre de la ciudad">
                        </div>
                        
                        <div class="form-group">
                            <label>Distancia máxima (km)</label>
                            <input type="number" id="filtroKm" min="0" placeholder="Sin límite">
                        </div>
                    </div>
                </div>
                
                <div class="filtros-section">
                    <h4>📋 Documentación requerida</h4>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
                        Marcá lo que los jugadores deben presentar obligatoriamente.
                    </p>
                    
                    <div class="checkbox-group">
                        <label class="checkbox-item">
                            <input type="checkbox" id="reqAptoMedico" checked>
                            <span>Apto médico</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" id="reqFichaMedica">
                            <span>Ficha médica federativa</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" id="reqDNI">
                            <span>DNI</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" id="reqFichaInscripcion">
                            <span>Ficha de inscripción al torneo</span>
                        </label>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label>Formulario adicional (PDF para descargar)</label>
                        <input type="file" id="encFormulario" accept=".pdf">
                        <p style="color: #64748b; font-size: 0.8rem; margin-top: 5px;">
                            Si subís un PDF, los equipos podrán descargarlo, completarlo y volver a subirlo firmado.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 25px;">
                    <button type="button" onclick="cerrarModalEncuentro()" class="btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button type="submit" class="btn-primary" style="flex: 2;">
                        Crear encuentro
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setear fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('encFecha').min = hoy;
}

function cerrarModalEncuentro() {
    const modal = document.getElementById('modalEncuentro');
    if (modal) modal.remove();
}

function actualizarFiltrosNivel() {
    const nivel = document.getElementById('encNivel').value;
    const filtrosDiv = document.getElementById('filtrosGeograficos');
    
    if (nivel === 'internacional') {
        filtrosDiv.style.display = 'none';
    } else {
        filtrosDiv.style.display = 'block';
    }
}

function cargarProvincias() {
    const pais = document.getElementById('filtroPais').value;
    const selectProv = document.getElementById('filtroProvincia');
    
    const provincias = {
        'AR': ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán'],
        'UY': ['Montevideo', 'Canelones', 'Maldonado'],
        'CL': ['Santiago', 'Valparaíso', 'Concepción'],
        'BR': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais']
    };
    
    selectProv.innerHTML = '<option value="">Todas</option>';
    
    if (provincias[pais]) {
        provincias[pais].forEach(prov => {
            selectProv.innerHTML += `<option value="${prov}">${prov}</option>`;
        });
    }
}

// ============================================
// GUARDAR ENCUENTRO
// ============================================

function guardarEncuentro(e) {
    e.preventDefault();
    
    const encuentro = {
        id: 'enc_' + Date.now(),
        creadorId: obtenerUsuarioActual().id,
        creadorNombre: obtenerUsuarioActual().equipoNombre,
        nombre: document.getElementById('encNombre').value,
        fecha: document.getElementById('encFecha').value,
        hora: document.getElementById('encHora').value,
        lugar: document.getElementById('encLugar').value,
        tipo: document.getElementById('encTipo').value,
        formato: document.getElementById('encFormato').value,
        cupoMaximo: parseInt(document.getElementById('encCupo').value),
        costo: parseFloat(document.getElementById('encCosto').value) || 0,
        descripcion: document.getElementById('encDescripcion').value,
        nivel: document.getElementById('encNivel').value,
        filtros: {
            pais: document.getElementById('filtroPais').value,
            provincia: document.getElementById('filtroProvincia').value,
            ciudad: document.getElementById('filtroCiudad').value,
            km: document.getElementById('filtroKm').value
        },
        documentacion: {
            aptoMedico: document.getElementById('reqAptoMedico').checked,
            fichaMedica: document.getElementById('reqFichaMedica').checked,
            dni: document.getElementById('reqDNI').checked,
            fichaInscripcion: document.getElementById('reqFichaInscripcion').checked,
            formularioAdicional: document.getElementById('encFormulario').files[0] || null
        },
        estado: 'publicado',
        equipos: [], // Equipos que aceptaron
        invitacionesPendientes: [], // Equipos invitados que no respondieron
        fechaCreacion: new Date().toISOString()
    };
    
    // Guardar en localStorage (simulando API)
    let encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]');
    encuentros.push(encuentro);
    localStorage.setItem('arveta_encuentros', JSON.stringify(encuentros));
    
    // Enviar invitaciones según filtros
    enviarInvitaciones(encuentro);
    
    cerrarModalEncuentro();
    mostrarMensaje('Encuentro creado y publicado', 'success');
    cargarEncuentros();
}

function enviarInvitaciones(encuentro) {
    // Simulación: buscar equipos que cumplan filtros y enviarles invitación
    const equipos = JSON.parse(localStorage.getItem('arveta_equipos') || '[]');
    
    const equiposFiltrados = equipos.filter(eq => {
        if (eq.id === encuentro.creadorId) return false; // No invitar al creador
        
        // Aplicar filtros según nivel
        switch(encuentro.nivel) {
            case 'internacional':
                return true;
            case 'nacional':
                return eq.pais === encuentro.filtros.pais || !encuentro.filtros.pais;
            case 'regional':
                return eq.provincia === encuentro.filtros.provincia;
            case 'exclusivo':
                return false; // Se invita manualmente después
            default:
                return true;
        }
    });
    
    // Crear invitaciones
    const invitaciones = equiposFiltrados.map(eq => ({
        id: 'inv_' + Date.now() + '_' + eq.id,
        encuentroId: encuentro.id,
        equipoId: eq.id,
        equipoNombre: eq.nombre,
        estado: 'pendiente',
        fechaEnvio: new Date().toISOString(),
        visto: false
    }));
    
    // Guardar invitaciones
    let todasInvitaciones = JSON.parse(localStorage.getItem('arveta_invitaciones') || '[]');
    todasInvitaciones = todasInvitaciones.concat(invitaciones);
    localStorage.setItem('arveta_invitaciones', JSON.stringify(todasInvitaciones));
    
    // Actualizar encuentro con invitaciones pendientes
    encuentro.invitacionesPendientes = invitaciones.map(i => i.equipoId);
    actualizarEncuentro(encuentro);
}

// ============================================
// RENDERIZAR MIS ENCUENTROS
// ============================================

function renderizarMisEncuentros() {
    const container = document.getElementById('listaMisEncuentros');
    const empty = document.getElementById('emptyCreados');
    
    const usuario = obtenerUsuarioActual();
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]')
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
    if (enc.documentacion.aptoMedico) docs.push('Apto médico');
    if (enc.documentacion.fichaMedica) docs.push('Ficha médica federativa');
    if (enc.documentacion.dni) docs.push('DNI');
    if (enc.documentacion.fichaInscripcion) docs.push('Ficha de inscripción');
    if (enc.documentacion.formularioAdicional) docs.push('Formulario adicional');
    
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
    const invitaciones = JSON.parse(localStorage.getItem('arveta_invitaciones') || '[]')
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
    const invitaciones = JSON.parse(localStorage.getItem('arveta_invitaciones') || '[]');
    const invIndex = invitaciones.findIndex(i => i.id === invitacionId);
    
    if (invIndex === -1) return;
    
    const invitacion = invitaciones[invIndex];
    invitacion.estado = 'aceptada';
    invitacion.fechaRespuesta = new Date().toISOString();
    
    localStorage.setItem('arveta_invitaciones', JSON.stringify(invitaciones));
    
    // Agregar equipo al encuentro
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]');
    const encIndex = encuentros.findIndex(e => e.id === invitacion.encuentroId);
    
    if (encIndex !== -1) {
        const usuario = obtenerUsuarioActual();
        encuentros[encIndex].equipos.push({
            id: usuario.id,
            nombre: usuario.equipoNombre,
            fechaAceptacion: new Date().toISOString(),
            jugadoresConfirmados: 0,
            jugadores: [] // Array de jugadores que confirmaron
        });
        
        // Sacar de invitaciones pendientes
        encuentros[encIndex].invitacionesPendientes = encuentros[encIndex].invitacionesPendientes
            .filter(id => id !== usuario.id);
        
        localStorage.setItem('arveta_encuentros', JSON.stringify(encuentros));
        
        // Notificar a jugadores del equipo
        notificarJugadoresDeEquipo(encuentros[encIndex]);
    }
    
    mostrarMensaje('Invitación aceptada. Se notificó a tu plantel.', 'success');
    renderizarInvitaciones();
}

function rechazarInvitacion(invitacionId) {
    if (!confirm('¿Seguro que querés rechazar esta invitación?')) return;
    
    const invitaciones = JSON.parse(localStorage.getItem('arveta_invitaciones') || '[]');
    const invIndex = invitaciones.findIndex(i => i.id === invitacionId);
    
    if (invIndex === -1) return;
    
    invitaciones[invIndex].estado = 'rechazada';
    invitaciones[invIndex].fechaRespuesta = new Date().toISOString();
    
    localStorage.setItem('arveta_invitaciones', JSON.stringify(invitaciones));
    
    mostrarMensaje('Invitación rechazada', 'info');
    renderizarInvitaciones();
}

function notificarJugadoresDeEquipo(encuentro) {
    // Simulación: agregar notificación a cada jugador del equipo
    const jugadores = JSON.parse(localStorage.getItem('arveta_jugadores') || '[]')
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
    
    let todasNotis = JSON.parse(localStorage.getItem('arveta_notificaciones') || '[]');
    todasNotis = todasNotis.concat(notificaciones);
    localStorage.setItem('arveta_notificaciones', JSON.stringify(todasNotis));
}

// ============================================
// VISTA DE JUGADORES (para panel de jugadores)
// ============================================

// Esta función se usa cuando un jugador entra a su panel
function obtenerEncuentrosParaJugador(jugadorId) {
    const usuario = obtenerUsuarioActual();
    
    // Encuentros donde su equipo participa
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]')
        .filter(e => e.equipos && e.equipos.some(eq => eq.id === usuario.equipoId));
    
    return encuentros.map(enc => {
        const equipoEnEncuentro = enc.equipos.find(eq => eq.id === usuario.equipoId);
        const yoConfirmado = equipoEnEncuentro.jugadores && 
            equipoEnEncuentro.jugadores.some(j => j.id === jugadorId);
        
        return {
            ...enc,
            miEstado: yoConfirmado ? 'confirmado' : 'pendiente',
            documentosSubidos: obtenerDocumentosJugador(jugadorId, enc.id)
        };
    });
}

function confirmarParticipacionJugador(encuentroId, jugadorId) {
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]');
    const encIndex = encuentros.findIndex(e => e.id === encuentroId);
    
    if (encIndex === -1) return;
    
    const equipo = encuentros[encIndex].equipos.find(eq => eq.id === obtenerUsuarioActual().equipoId);
    if (!equipo) return;
    
    if (!equipo.jugadores) equipo.jugadores = [];
    
    equipo.jugadores.push({
        id: jugadorId,
        fechaConfirmacion: new Date().toISOString(),
        documentos: []
    });
    
    equipo.jugadoresConfirmados = equipo.jugadores.length;
    
    localStorage.setItem('arveta_encuentros', JSON.stringify(encuentros));
    
    mostrarMensaje('Participación confirmada', 'success');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function obtenerUsuarioActual() {
    // Simulación - en producción viene del login/token
    return JSON.parse(localStorage.getItem('arveta_usuario') || '{
        "id": "usr_123",
        "nombre": "Admin",
        "equipoId": "eq_tigres",
        "equipoNombre": "Tigres RC",
        "rol": "admin"
    }');
}

function obtenerEncuentroPorId(id) {
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]');
    return encuentros.find(e => e.id === id);
}

function actualizarEncuentro(encuentro) {
    const encuentros = JSON.parse(localStorage.getItem('arveta_encuentros') || '[]');
    const index = encuentros.findIndex(e => e.id === encuentro.id);
    if (index !== -1) {
        encuentros[index] = encuentro;
        localStorage.setItem('arveta_encuentros', JSON.stringify(encuentros));
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
    
    // Abrir modal con datos pre-cargados (similar a nuevoEncuentro pero editando)
    // ... implementar según necesites
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
    // ... implementar notificación
    
    mostrarMensaje('Encuentro cancelado', 'info');
    renderizarMisEncuentros();
}

function verDetalleEncuentro(encuentroId) {
    const encuentro = obtenerEncuentroPorId(encuentroId);
    if (!encuentro) return;
    
    // Modal con detalle completo
    // ... implementar vista detallada
}
