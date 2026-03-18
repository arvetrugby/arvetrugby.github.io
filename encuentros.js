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
    cargarEncuentros();

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
                    
                    <!-- Opciones predefinidas -->
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
                    
                    <!-- Container para tipos personalizados ilimitados -->
                    <div id="containerOtrosTipos" style="display: none; flex-direction: column; gap: 10px; margin-left: 26px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Agregá los tipos que necesites:</div>
                        <!-- Se agregan dinámicamente -->
                    </div>
                    
                    <button type="button" onclick="agregarOtroTipo()" class="btn-secondary" style="width: 100%; margin-top: 10px; display: none;" id="btnAgregarOtroTipo">
                        + Agregar otro tipo personalizado
                    </button>
                </div>

                <div class="form-group">
                    <label>Lugar / Cancha *</label>
                    <input type="text" id="encLugar" required placeholder="Nombre y dirección de la cancha">
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
                    <textarea id="encDescripcion" rows="3" placeholder="Información adicional, reglas especiales, premios..."></textarea>
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
    
    // Recolectar tipos seleccionados (MÚLTIPLE SELECCIÓN)
    const tiposSeleccionados = [];
    
    // Checkboxes predefinidos
    document.querySelectorAll('input[name="encTipo"]:checked').forEach(cb => {
        tiposSeleccionados.push(cb.value);
    });
    
    // Otros tipos personalizados
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
    
    // Guardar como string separado por comas
    const tipoFinal = tiposSeleccionados.join(', ');
    
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
        mostrarMensajeEncuentros('Debes agregar al menos una fecha', 'error');
        return;
    }
    
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
    const encuentro = {
        equipoCreadorId: usuario.equipoId,
        creadorNombre: usuario.equipoNombre,
        nombre: document.getElementById('encNombre').value,
        flyerUrl: document.getElementById('flyerUrl').value || '',
        fechasJSON: JSON.stringify(fechas),
        valoresJSON: JSON.stringify(valores),
        cupoMaximo: parseInt(document.getElementById('encCupo').value),
        lugar: document.getElementById('encLugar').value,
        tipo: tipoFinal,  // ← AHORA SOPORTA MÚLTIPLES TIPOS: "Veteranos +35, Senior, Otro"
        descripcion: document.getElementById('encDescripcion').value,
        estado: 'publicado'
    };
    
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
        mostrarMensajeEncuentros('Encuentro creado correctamente', 'success');
        renderizarMisEncuentros();
    })
    .catch(err => {
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
            
            const primeraFecha = fechas.length > 0 ? fechas[0] : null;
            const fechaTexto = primeraFecha ? formatearFecha(primeraFecha.dia) : 'Sin fecha';
            const horaTexto = primeraFecha && primeraFecha.horarios.length > 0 
                ? `• ${primeraFecha.horarios[0].hora}hs` 
                : '';

            const estadoClass = `estado-${enc.estado || 'publicado'}`;
            const estadoTexto = enc.estado === 'publicado' ? 'Publicado' : 
                               enc.estado === 'borrador' ? 'Borrador' : 
                               enc.estado === 'cancelado' ? 'Cancelado' : enc.estado;

            return `
                <div class="encuentro-card" style="border-left: 4px solid #4f46e5; margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div class="encuentro-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <div class="encuentro-titulo" style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 5px;">
                                ${enc.nombre}
                            </div>
                            <span class="encuentro-estado ${estadoClass}" style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${enc.estado === 'publicado' ? '#dcfce7' : '#fee2e2'}; color: ${enc.estado === 'publicado' ? '#166534' : '#991b1b'};">
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

                    <div class="encuentro-meta" style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
                        <span>📅 ${fechaTexto} ${horaTexto}</span>
                        <span>📍 ${enc.lugar}</span>
                        ${valores.length > 0 ? `<span>💰 Desde $${Math.min(...valores.map(v => v.precio))}</span>` : ''}
                    </div>

                    ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

                    ${enc.flyerUrl ? `
                        <div style="margin-bottom: 15px;">
                            <img src="${enc.flyerUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover;" alt="Flyer">
                        </div>
                    ` : ''}

                    <div class="acciones-encuentro" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
                            Ver detalle
                        </button>
                        <button onclick="editarEncuentro('${enc.id}')" class="btn-editar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #f1f5f9; color: #475569; cursor: pointer; font-weight: 500;">
                            Editar
                        </button>
                        ${enc.estado !== 'cancelado' ? `
                            <button onclick="cancelarEncuentro('${enc.id}')" class="btn-rechazar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #fee2e2; color: #991b1b; cursor: pointer; font-weight: 500;">
                                Cancelar
                            </button>
                        ` : ''}
                        <button onclick="invitarEquipos('${enc.id}')" class="btn-aceptar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #4f46e5; color: white; cursor: pointer; font-weight: 500;">
                            + Invitar equipos
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error cargando encuentros:', err);
        mostrarMensajeEncuentros('Error de conexión al cargar encuentros', 'error');
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
        const response = await fetch(`${API_URL}?action=getEncuentrosParaInvitar&equipoId=${usuario.equipoId}`);
        const result = await response.json();
        
        if (!result.success) {
            mostrarMensajeEncuentros('Error al cargar invitaciones', 'error');
            return;
        }
        
        const encuentros = result.data || [];
        
        if (badge) {
            if (encuentros.length > 0) {
                badge.textContent = encuentros.length;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }

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
            
            const primeraFecha = fechas.length > 0 ? fechas[0] : null;
            const fechaTexto = primeraFecha ? formatearFecha(primeraFecha.dia) : 'Sin fecha';
            const horaTexto = primeraFecha && primeraFecha.horarios.length > 0 
                ? `• ${primeraFecha.horarios[0].hora}hs` 
                : '';

            return `
                <div class="encuentro-card invitacion-pendiente" style="border-left: 4px solid #f59e0b; margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div class="encuentro-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <div class="encuentro-titulo" style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 5px;">
                                ${enc.nombre}
                            </div>
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #fef3c7; color: #92400e;">
                                Invitación disponible
                            </span>
                            ${enc.tipo ? enc.tipo.split(', ').map(t => `
                                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-left: 5px; margin-bottom: 5px;">
                                    ${t}
                                </span>
                            `).join('') : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #f1f5f9; color: #64748b; margin-left: 8px;">Sin tipo</span>'}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 4px;">
                                Organiza:
                            </div>
                            <div style="font-weight: 600; color: #1e293b;">
                                ${enc.creadorNombre || 'Equipo desconocido'}
                            </div>
                        </div>
                    </div>

                    <div class="encuentro-meta" style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
                        <span>📅 ${fechaTexto} ${horaTexto}</span>
                        <span>📍 ${enc.lugar}</span>
                        ${valores.length > 0 ? `<span>💰 Desde $${Math.min(...valores.map(v => v.precio))}</span>` : ''}
                    </div>

                    ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

                    ${enc.flyerUrl ? `
                        <div style="margin-bottom: 15px;">
                            <img src="${enc.flyerUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover;" alt="Flyer">
                        </div>
                    ` : ''}

                    <div class="acciones-encuentro" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="verDetalleEncuentro('${enc.id}')" class="btn-ver" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">
                            Ver detalle
                        </button>
                        <button onclick="interesarEncuentro('${enc.id}')" class="btn-aceptar" style="padding: 8px 16px; border-radius: 6px; border: none; background: #4f46e5; color: white; cursor: pointer; font-weight: 500;">
                            Me interesa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error cargando invitaciones:', err);
        mostrarMensajeEncuentros('Error de conexión', 'error');
    }
}
// ============================================
// FUNCIONES DE ACCIÓN (ASYNC - USAN API)
// ============================================

async function obtenerEncuentroPorId(id) {
    try {
        const response = await fetch(`${API_URL}?action=getEncuentroById&id=${id}`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (err) {
        console.error('Error obteniendo encuentro:', err);
        return null;
    }
}

async function actualizarEncuentro(encuentro) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateEncuentro',
                ...encuentro
            })
        });
        const result = await response.json();
        if (result.success) {
            mostrarMensajeEncuentros('Encuentro actualizado', 'success');
        }
        return result.success;
    } catch (err) {
        mostrarMensajeEncuentros('Error al actualizar', 'error');
        return false;
    }
}

async function editarEncuentro(encuentroId) {
    const encuentro = await obtenerEncuentroPorId(encuentroId);
    if (!encuentro) {
        mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
        return;
    }

    const usuario = obtenerUsuarioActual();
    if (encuentro.equipoCreadorId !== usuario.equipoId) {
        mostrarMensajeEncuentros('Solo el creador puede editar este encuentro', 'error');
        return;
    }

    mostrarMensajeEncuentros('Función de edición en desarrollo', 'info');
}

async function cancelarEncuentro(encuentroId) {
    const encuentro = await obtenerEncuentroPorId(encuentroId);
    if (!encuentro) {
        mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
        return;
    }

    const usuario = obtenerUsuarioActual();
    if (encuentro.equipoCreadorId !== usuario.equipoId) {
        mostrarMensajeEncuentros('Solo el creador puede cancelar', 'error');
        return;
    }

    if (!confirm('¿Seguro que querés cancelar este encuentro? Se notificará a todos los equipos invitados.')) {
        return;
    }

    encuentro.estado = 'cancelado';
    const actualizado = await actualizarEncuentro(encuentro);
    
    if (actualizado) {
        mostrarMensajeEncuentros('Encuentro cancelado', 'info');
        renderizarMisEncuentros();
    }
}

async function verDetalleEncuentro(encuentroId) {
    const encuentro = await obtenerEncuentroPorId(encuentroId);
    if (!encuentro) {
        mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
        return;
    }

    mostrarMensajeEncuentros('Vista detallada en desarrollo', 'info');
}

function invitarEquipos(encuentroId) {
    mostrarMensajeEncuentros('Función de invitar equipos en desarrollo', 'info');
}

function interesarEncuentro(encuentroId) {
    mostrarMensajeEncuentros('Interés registrado. El organizador será notificado.', 'success');
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
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
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
