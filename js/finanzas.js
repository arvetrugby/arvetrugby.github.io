// ============================================
// FINANZAS - FRONTEND PARA ARVET
// ============================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxE-UiI85pCcUYq5LqJjN7UU7aOtXsVV_7Hyag-hYgOT4LcjGhVQaDt6js9PEQQ6E9Z/exec'; 

let finanzasData = {
    transacciones: [],
    resumen: null,
    filtros: { mes: 'todos', categoria: 'todos', tipo: 'todos' }
};

// Inicializar módulo
function initFinanzas() {
    const section = document.getElementById('finanzas');
    if (!section) return;
    
    cargarFinanzasDesdeAPI();
}

function getEquipoId() {
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    return currentUser.equipoId;
}

function cargarFinanzasDesdeAPI() {
    const equipoId = getEquipoId();
    if (!equipoId) {
        showMsg('Error: No se encontró el equipo', 'error');
        return;
    }

    document.getElementById('finanzasContent').innerHTML = '<div class="loading">Cargando finanzas...</div>';

    // Cargar transacciones y resumen en paralelo
    Promise.all([
        fetch(`${APPS_SCRIPT_URL}?action=getFinanzas&equipoId=${equipoId}`).then(r => r.json()),
        fetch(`${APPS_SCRIPT_URL}?action=getResumenFinanzas&equipoId=${equipoId}`).then(r => r.json())
    ])
    .then(([finanzas, resumen]) => {
        if (finanzas.success) {
            finanzasData.transacciones = finanzas.data;
        }
        if (resumen.success) {
            finanzasData.resumen = resumen.data;
        }
        renderizarFinanzasUI();
    })
    .catch(err => {
        console.error('Error:', err);
        showMsg('Error de conexión', 'error');
    });
}

function renderizarFinanzasUI() {
    const container = document.getElementById('finanzasContent');
    const resumen = finanzasData.resumen || { ingresos: 0, egresos: 0, balance: 0 };
    
    container.innerHTML = `
        <!-- Resumen -->
        <div class="finanzas-resumen">
            <div class="card-resumen ingresos">
                <div class="resumen-icono">📥</div>
                <div class="resumen-info">
                    <span class="resumen-label">Ingresos</span>
                    <span class="resumen-monto">$${formatearMonto(resumen.ingresos)}</span>
                </div>
            </div>
            <div class="card-resumen egresos">
                <div class="resumen-icono">📤</div>
                <div class="resumen-info">
                    <span class="resumen-label">Egresos</span>
                    <span class="resumen-monto">$${formatearMonto(resumen.egresos)}</span>
                </div>
            </div>
            <div class="card-resumen balance ${resumen.balance >= 0 ? 'positivo' : 'negativo'}">
                <div class="resumen-icono">${resumen.balance >= 0 ? '💰' : '⚠️'}</div>
                <div class="resumen-info">
                    <span class="resumen-label">Balance</span>
                    <span class="resumen-monto">$${formatearMonto(Math.abs(resumen.balance))}</span>
                </div>
            </div>
        </div>

        <!-- Acciones -->
        <div class="finanzas-acciones">
            <button class="btn-accion-finanza" onclick="nuevaTransaccion('ingreso')">
                <span>➕</span> Ingreso
            </button>
            <button class="btn-accion-finanza" onclick="nuevaTransaccion('egreso')">
                <span>➖</span> Egreso
            </button>
            <button class="btn-accion-finanza" onclick="verCuotasJugadores()">
                <span>👥</span> Cuotas
            </button>
            <button class="btn-accion-finanza" onclick="exportarFinanzas()">
                <span>📊</span> Exportar
            </button>
        </div>

        <!-- Filtros -->
        <div class="finanzas-filtros">
            <select id="filtroMes" onchange="filtrarTransacciones()">
                <option value="todos">Todos los meses</option>
            </select>
            <select id="filtroTipo" onchange="filtrarTransacciones()">
                <option value="todos">Todos los tipos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
            </select>
            <select id="filtroCategoria" onchange="filtrarTransacciones()">
                <option value="todos">Todas las categorías</option>
                <option value="cuota">Cuotas</option>
                <option value="sponsor">Sponsors</option>
                <option value="evento">Eventos</option>
                <option value="equipamiento">Equipamiento</option>
                <option value="alquiler">Alquiler</option>
                <option value="viaje">Viajes</option>
                <option value="seguro">Seguros</option>
                <option value="otro">Otros</option>
            </select>
        </div>

        <!-- Lista de Cards -->
        <div class="finanzas-cards" id="listaTransacciones">
            ${renderizarCards()}
        </div>
    `;
    
    cargarMesesDisponibles();
}
function cargarMesesDisponibles() {
    const meses = [...new Set(finanzasData.transacciones.map(t => t.fecha.slice(0, 7)))].sort().reverse();
    const select = document.getElementById('filtroMes');
    if (select && meses.length > 0) {
        select.innerHTML = '<option value="todos">Todos los meses</option>' + 
            meses.map(m => `<option value="${m}">${formatearMes(m)}</option>`).join('');
    }
}

function renderizarCards() {
    const filtradas = filtrarTransaccionesData();
    
    if (filtradas.length === 0) {
        return '<div class="sin-resultados">No hay transacciones registradas</div>';
    }

    return filtradas.map(t => `
        <div class="finanza-card ${t.tipo}">
            <div class="card-header">
                <span class="card-icono">${t.tipo === 'ingreso' ? '📥' : '📤'}</span>
                <span class="card-fecha">${formatearFecha(t.fecha)}</span>
                <span class="card-estado badge-estado ${t.estado}">
                    ${t.estado === 'pagado' ? '✓' : '⏳'} ${t.estado}
                </span>
            </div>
            <div class="card-body">
                <h4 class="card-concepto">${t.concepto}</h4>
                <span class="card-categoria badge-categoria ${t.categoria}">${t.categoria}</span>
            </div>
            <div class="card-footer">
                <span class="card-monto ${t.tipo}">$${formatearMonto(t.monto)}</span>
                <div class="card-acciones">
                    <button onclick="editarTransaccion('${t.id}')" class="btn-icon" title="Editar">✏️</button>
                    <button onclick="eliminarTransaccion('${t.id}')" class="btn-icon" title="Eliminar">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}
function filtrarTransaccionesData() {
    const mes = document.getElementById('filtroMes')?.value || 'todos';
    const tipo = document.getElementById('filtroTipo')?.value || 'todos';
    const categoria = document.getElementById('filtroCategoria')?.value || 'todos';

    return finanzasData.transacciones.filter(t => {
        const matchMes = mes === 'todos' || t.fecha.startsWith(mes);
        const matchTipo = tipo === 'todos' || t.tipo === tipo;
        const matchCat = categoria === 'todos' || t.categoria === categoria;
        return matchMes && matchTipo && matchCat;
    });
}

function filtrarTransacciones() {
    const lista = document.getElementById('listaTransacciones');
    if (lista) lista.innerHTML = renderizarTransacciones();
}

// Modal nueva transacción
function nuevaTransaccion(tipo) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${tipo === 'ingreso' ? '➕ Nuevo Ingreso' : '➖ Nuevo Egreso'}</h3>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-cerrar">×</button>
            </div>
            <form onsubmit="guardarTransaccion(event, '${tipo}')" class="form-finanza">
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha</label>
                        <input type="date" name="fecha" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Monto ($)</label>
                        <input type="number" name="monto" required min="0" step="0.01" placeholder="0.00">
                    </div>
                </div>
                <div class="form-group">
                    <label>Concepto</label>
                    <input type="text" name="concepto" required placeholder="Descripción">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="categoria" required onchange="toggleJugador(this.value)">
                            ${tipo === 'ingreso' ? `
                                <option value="cuota">Cuota Jugador</option>
                                <option value="sponsor">Sponsor</option>
                                <option value="evento">Evento</option>
                                <option value="donacion">Donación</option>
                            ` : `
                                <option value="equipamiento">Equipamiento</option>
                                <option value="alquiler">Alquiler</option>
                                <option value="viaje">Viaje</option>
                                <option value="seguro">Seguro</option>
                                <option value="arbitraje">Arbitraje</option>
                            `}
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Método de Pago</label>
                        <select name="metodoPago">
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="mercadopago">MercadoPago</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" id="campoJugador" style="display: ${tipo === 'ingreso' ? 'block' : 'none'}">
                    <label>Jugador (si es cuota)</label>
                    <select name="jugadorId" id="selectJugador">
                        <option value="">-- Seleccionar --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">
                        <option value="pagado">Pagado</option>
                        <option value="pendiente">Pendiente</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secundario">Cancelar</button>
                    <button type="submit" class="btn-primario">Guardar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Cargar jugadores si es ingreso
    if (tipo === 'ingreso') {
        cargarJugadoresSelect();
    }
}

function toggleJugador(categoria) {
    const campo = document.getElementById('campoJugador');
    if (campo) {
        campo.style.display = categoria === 'cuota' ? 'block' : 'none';
    }
}

function cargarJugadoresSelect() {
    const equipoId = getEquipoId();
    fetch(`${APPS_SCRIPT_URL}?action=getJugadores&equipoId=${equipoId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('selectJugador');
                if (select) {
                    select.innerHTML = '<option value="">-- Seleccionar --</option>' +
                        data.data.map(j => `<option value="${j.id}">${j.nombre} ${j.apellido}</option>`).join('');
                }
            }
        });
}

function guardarTransaccion(e, tipo) {
    e.preventDefault();
    const form = e.target;
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    
    const datos = {
        action: 'crearTransaccion',
        equipoId: getEquipoId(),
        tipo: tipo,
        fecha: form.fecha.value,
        monto: parseFloat(form.monto.value),
        concepto: form.concepto.value,
        categoria: form.categoria.value,
        estado: form.estado.value,
        jugadorId: form.jugadorId?.value || '',
        metodoPago: form.metodoPago.value,
        creadoPor: currentUser.id
    };
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(datos)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.querySelector('.modal-overlay.active')?.remove();
            showMsg('Transacción guardada', 'success');
            cargarFinanzasDesdeAPI(); // Recargar
        } else {
            showMsg('Error: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error:', err);
        showMsg('Error de conexión', 'error');
    });
}

function editarTransaccion(id) {
    const t = finanzasData.transacciones.find(x => x.id === id);
    if (!t) return;
    
    // Similar a nuevaTransaccion pero precargando datos
    // (implementar si lo necesitás)
    console.log('Editar:', t);
}

function eliminarTransaccion(id) {
    if (!confirm('¿Eliminar esta transacción?')) return;
    
    const currentUser = JSON.parse(localStorage.getItem('arvet_user') || '{}');
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'eliminarTransaccion',
            id: id,
            equipoId: getEquipoId(),
            adminId: currentUser.id
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showMsg('Eliminado', 'success');
            cargarFinanzasDesdeAPI();
        } else {
            showMsg('Error: ' + data.error, 'error');
        }
    });
}

function verCuotasJugadores() {
    const resumen = finanzasData.resumen;
    if (!resumen || !resumen.cuotasPorJugador) {
        showMsg('No hay datos de cuotas', 'info');
        return;
    }
    
    // Mostrar modal con resumen
    console.log('Cuotas:', resumen.cuotasPorJugador);
}

function exportarFinanzas() {
    const csv = [
        ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto', 'Estado', 'Método'].join(','),
        ...finanzasData.transacciones.map(t => [
            t.fecha, t.tipo, t.categoria, `"${t.concepto}"`, t.monto, t.estado, t.metodoPago
        ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finanzas_${getEquipoId()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Utilidades
function formatearMonto(monto) {
    return monto.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatearMes(mes) {
    const [anio, mesNum] = mes.split('-');
    const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${nombres[parseInt(mesNum) - 1]} ${anio}`;
}

// Inicializar cuando se muestra la sección
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'finanzas' && mutation.target.classList.contains('active')) {
                initFinanzas();
            }
        });
    });
    
    const finanzasSection = document.getElementById('finanzas');
    if (finanzasSection) {
        observer.observe(finanzasSection, { attributes: true, attributeFilter: ['class'] });
    }
});
