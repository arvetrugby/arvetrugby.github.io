// ============================================
// MÓDULO DE FINANZAS - ARVET
// ============================================

// Estado global de finanzas
let finanzasData = {
    transacciones: [],
    cuotasJugadores: [],
    balance: { ingresos: 0, egresos: 0, balance: 0 },
    filtros: { mes: 'todos', categoria: 'todos' }
};

// Inicializar módulo de finanzas
function initFinanzas() {
    const section = document.getElementById('finanzas');
    if (!section) return;

    // Cargar datos de ejemplo/demo (reemplazar con fetch real)
    cargarDatosFinanzas();
    
    // Renderizar UI
    renderizarFinanzasUI();
    
    // Configurar event listeners
    setupFinanzasEventListeners();
}

// Cargar datos (simulado - reemplazar con tu API)
function cargarDatosFinanzas() {
    // Datos de ejemplo - reemplazar con: fetch('/api/finanzas/' + equipoId)
    finanzasData.transacciones = [
        { id: 1, fecha: '2024-03-20', tipo: 'ingreso', categoria: 'cuota', concepto: 'Cuota Mensual - Juan Pérez', monto: 15000, estado: 'pagado', jugador: 'Juan Pérez' },
        { id: 2, fecha: '2024-03-18', tipo: 'egreso', categoria: 'equipamiento', concepto: 'Compra de pelotas', monto: 45000, estado: 'pagado', proveedor: 'Deportes Rugby SA' },
        { id: 3, fecha: '2024-03-15', tipo: 'ingreso', categoria: 'sponsor', concepto: 'Pago Sponsor Local', monto: 100000, estado: 'pagado', entidad: 'Cervecería Artesanal' },
        { id: 4, fecha: '2024-03-10', tipo: 'egreso', categoria: 'alquiler', concepto: 'Alquiler cancha entrenamiento', monto: 25000, estado: 'pagado' },
        { id: 5, fecha: '2024-03-05', tipo: 'ingreso', categoria: 'cuota', concepto: 'Cuota Mensual - Martín López', monto: 15000, estado: 'pendiente', jugador: 'Martín López' },
        { id: 6, fecha: '2024-03-01', tipo: 'egreso', categoria: 'viaje', concepto: 'Transporte partido visitante', monto: 35000, estado: 'pagado' },
        { id: 7, fecha: '2024-02-28', tipo: 'ingreso', categoria: 'evento', concepto: 'Asado recaudación', monto: 85000, estado: 'pagado' },
        { id: 8, fecha: '2024-02-25', tipo: 'egreso', categoria: 'seguro', concepto: 'Seguro anual jugadores', monto: 120000, estado: 'pagado' }
    ];

    // Calcular balance
    calcularBalance();
}

// Calcular totales
function calcularBalance() {
    const ingresos = finanzasData.transacciones
        .filter(t => t.tipo === 'ingreso' && t.estado === 'pagado')
        .reduce((sum, t) => sum + t.monto, 0);
    
    const egresos = finanzasData.transacciones
        .filter(t => t.tipo === 'egreso' && t.estado === 'pagado')
        .reduce((sum, t) => sum + t.monto, 0);

    finanzasData.balance = {
        ingresos: ingresos,
        egresos: egresos,
        balance: ingresos - egresos
    };
}

// Renderizar UI completa
function renderizarFinanzasUI() {
    const container = document.getElementById('finanzasContent');
    if (!container) return;

    container.innerHTML = `
        <!-- Resumen de Balance -->
        <div class="finanzas-resumen">
            <div class="card-resumen ingresos">
                <div class="resumen-icono">📥</div>
                <div class="resumen-info">
                    <span class="resumen-label">Ingresos Totales</span>
                    <span class="resumen-monto">$${formatearMonto(finanzasData.balance.ingresos)}</span>
                </div>
            </div>
            <div class="card-resumen egresos">
                <div class="resumen-icono">📤</div>
                <div class="resumen-info">
                    <span class="resumen-label">Egresos Totales</span>
                    <span class="resumen-monto">$${formatearMonto(finanzasData.balance.egresos)}</span>
                </div>
            </div>
            <div class="card-resumen balance ${finanzasData.balance.balance >= 0 ? 'positivo' : 'negativo'}">
                <div class="resumen-icono">${finanzasData.balance.balance >= 0 ? '💰' : '⚠️'}</div>
                <div class="resumen-info">
                    <span class="resumen-label">Balance</span>
                    <span class="resumen-monto">$${formatearMonto(Math.abs(finanzasData.balance.balance))}</span>
                    <span class="resumen-estado">${finanzasData.balance.balance >= 0 ? 'Superávit' : 'Déficit'}</span>
                </div>
            </div>
        </div>

        <!-- Acciones Rápidas -->
        <div class="finanzas-acciones">
            <button class="btn-accion-finanza" onclick="nuevaTransaccion('ingreso')">
                <span>➕</span> Nuevo Ingreso
            </button>
            <button class="btn-accion-finanza" onclick="nuevaTransaccion('egreso')">
                <span>➖</span> Nuevo Egreso
            </button>
            <button class="btn-accion-finanza" onclick="verCuotasJugadores()">
                <span>👥</span> Cuotas Jugadores
            </button>
            <button class="btn-accion-finanza" onclick="exportarFinanzas()">
                <span>📊</span> Exportar Excel
            </button>
        </div>

        <!-- Filtros -->
        <div class="finanzas-filtros">
            <select id="filtroMes" onchange="filtrarTransacciones()">
                <option value="todos">Todos los meses</option>
                <option value="2024-03">Marzo 2024</option>
                <option value="2024-02">Febrero 2024</option>
                <option value="2024-01">Enero 2024</option>
            </select>
            <select id="filtroCategoria" onchange="filtrarTransacciones()">
                <option value="todos">Todas las categorías</option>
                <option value="cuota">Cuotas Jugadores</option>
                <option value="sponsor">Sponsors</option>
                <option value="evento">Eventos</option>
                <option value="equipamiento">Equipamiento</option>
                <option value="alquiler">Alquileres</option>
                <option value="viaje">Viajes</option>
                <option value="seguro">Seguros</option>
            </select>
            <button class="btn-limpiar" onclick="limpiarFiltros()">Limpiar</button>
        </div>

        <!-- Lista de Transacciones -->
        <div class="finanzas-lista">
            <div class="lista-header">
                <span>Fecha</span>
                <span>Concepto</span>
                <span>Categoría</span>
                <span>Monto</span>
                <span>Estado</span>
                <span>Acciones</span>
            </div>
            <div id="listaTransacciones" class="lista-items">
                ${renderizarTransacciones()}
            </div>
        </div>

        <!-- Gráfico simple (barras CSS) -->
        <div class="finanzas-grafico">
            <h4>Resumen Mensual</h4>
            <div class="grafico-barras">
                <div class="barra-container">
                    <div class="barra ingresos" style="height: ${calcularAlturaBarra('ingresos')}px">
                        <span class="barra-valor">$${formatearMonto(finanzasData.balance.ingresos)}</span>
                    </div>
                    <span class="barra-label">Ingresos</span>
                </div>
                <div class="barra-container">
                    <div class="barra egresos" style="height: ${calcularAlturaBarra('egresos')}px">
                        <span class="barra-valor">$${formatearMonto(finanzasData.balance.egresos)}</span>
                    </div>
                    <span class="barra-label">Egresos</span>
                </div>
            </div>
        </div>
    `;
}

// Renderizar lista de transacciones
function renderizarTransacciones() {
    const filtradas = filtrarTransaccionesData();
    
    if (filtradas.length === 0) {
        return '<div class="sin-resultados">No hay transacciones registradas</div>';
    }

    return filtradas.map(t => `
        <div class="transaccion-item ${t.tipo} ${t.estado === 'pendiente' ? 'pendiente' : ''}">
            <span class="t-fecha">${formatearFecha(t.fecha)}</span>
            <span class="t-concepto">${t.concepto}</span>
            <span class="t-categoria">
                <span class="badge-categoria ${t.categoria}">${formatearCategoria(t.categoria)}</span>
            </span>
            <span class="t-monto ${t.tipo}">$${formatearMonto(t.monto)}</span>
            <span class="t-estado">
                <span class="badge-estado ${t.estado}">${t.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}</span>
            </span>
            <span class="t-acciones">
                <button onclick="editarTransaccion(${t.id})" class="btn-icon" title="Editar">✏️</button>
                <button onclick="eliminarTransaccion(${t.id})" class="btn-icon" title="Eliminar">🗑️</button>
            </span>
        </div>
    `).join('');
}

// Filtrar transacciones
function filtrarTransaccionesData() {
    const mesFiltro = document.getElementById('filtroMes')?.value || 'todos';
    const catFiltro = document.getElementById('filtroCategoria')?.value || 'todos';

    return finanzasData.transacciones.filter(t => {
        const matchMes = mesFiltro === 'todos' || t.fecha.startsWith(mesFiltro);
        const matchCat = catFiltro === 'todos' || t.categoria === catFiltro;
        return matchMes && matchCat;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// Filtrar y re-renderizar
function filtrarTransacciones() {
    const lista = document.getElementById('listaTransacciones');
    if (lista) {
        lista.innerHTML = renderizarTransacciones();
    }
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroMes').value = 'todos';
    document.getElementById('filtroCategoria').value = 'todos';
    filtrarTransacciones();
}

// Calcular altura de barras para gráfico (máx 150px)
function calcularAlturaBarra(tipo) {
    const max = Math.max(finanzasData.balance.ingresos, finanzasData.balance.egresos) || 1;
    const valor = tipo === 'ingresos' ? finanzasData.balance.ingresos : finanzasData.balance.egresos;
    return Math.max((valor / max) * 150, 20);
}

// Formateadores
function formatearMonto(monto) {
    return monto.toLocaleString('es-AR');
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatearCategoria(cat) {
    const map = {
        cuota: 'Cuota', sponsor: 'Sponsor', evento: 'Evento',
        equipamiento: 'Equipamiento', alquiler: 'Alquiler',
        viaje: 'Viaje', seguro: 'Seguro', otro: 'Otro'
    };
    return map[cat] || cat;
}

// Acciones
function nuevaTransaccion(tipo) {
    // Abrir modal o redirigir a formulario
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
                        <input type="number" name="monto" required min="0" placeholder="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Concepto</label>
                    <input type="text" name="concepto" required placeholder="Descripción del movimiento">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="categoria" required>
                            ${tipo === 'ingreso' ? `
                                <option value="cuota">Cuota Jugador</option>
                                <option value="sponsor">Sponsor</option>
                                <option value="evento">Evento/Recaudación</option>
                                <option value="donacion">Donación</option>
                                <option value="otro">Otro</option>
                            ` : `
                                <option value="equipamiento">Equipamiento</option>
                                <option value="alquiler">Alquiler Cancha</option>
                                <option value="viaje">Transporte/Viaje</option>
                                <option value="seguro">Seguro</option>
                                <option value="arbitraje">Arbitraje</option>
                                <option value="otro">Otro</option>
                            `}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select name="estado">
                            <option value="pagado">Pagado</option>
                            <option value="pendiente">Pendiente</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" id="campoJugador" style="display: ${tipo === 'ingreso' ? 'block' : 'none'}">
                    <label>Jugador (si aplica)</label>
                    <select name="jugador">
                        <option value="">-- Seleccionar --</option>
                        <!-- Cargar dinámicamente desde lista de jugadores -->
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secundario">Cancelar</button>
                    <button type="submit" class="btn-primario">Guardar ${tipo}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function guardarTransaccion(e, tipo) {
    e.preventDefault();
    const form = e.target;
    const datos = {
        id: Date.now(),
        tipo: tipo,
        fecha: form.fecha.value,
        monto: parseInt(form.monto.value),
        concepto: form.concepto.value,
        categoria: form.categoria.value,
        estado: form.estado.value,
        jugador: form.jugador?.value || null
    };
    
    // Agregar a datos locales (reemplazar con POST a tu API)
    finanzasData.transacciones.unshift(datos);
    calcularBalance();
    
    // Cerrar modal y actualizar
    document.querySelector('.modal-overlay.active')?.remove();
    renderizarFinanzasUI();
    showMsg(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`, 'success');
}

function editarTransaccion(id) {
    const t = finanzasData.transacciones.find(x => x.id === id);
    if (!t) return;
    // Similar a nuevaTransaccion pero precargando datos
    console.log('Editar:', t);
}

function eliminarTransaccion(id) {
    if (!confirm('¿Eliminar esta transacción?')) return;
    finanzasData.transacciones = finanzasData.transacciones.filter(t => t.id !== id);
    calcularBalance();
    renderizarFinanzasUI();
    showMsg('Transacción eliminada', 'info');
}

function verCuotasJugadores() {
    // Mostrar resumen de cuotas pendientes/pagadas por jugador
    const cuotas = finanzasData.transacciones.filter(t => t.categoria === 'cuota');
    const jugadores = {};
    
    cuotas.forEach(c => {
        if (!jugadores[c.jugador]) {
            jugadores[c.jugador] = { pagado: 0, pendiente: 0, total: 0 };
        }
        jugadores[c.jugador][c.estado] += c.monto;
        jugadores[c.jugador].total += c.monto;
    });

    let html = '<div class="cuotas-resumen"><h4>Estado de Cuotas</h4>';
    Object.entries(jugadores).forEach(([nombre, datos]) => {
        const estado = datos.pendiente > 0 ? '⚠️ Debe' : '✓ Al día';
        html += `
            <div class="cuota-jugador">
                <strong>${nombre}</strong>
                <span>Pagado: $${formatearMonto(datos.pagado)}</span>
                <span class="${datos.pendiente > 0 ? 'deuda' : 'ok'}">${estado}</span>
                ${datos.pendiente > 0 ? `<button onclick="enviarRecordatorio('${nombre}')" class="btn-small">Recordar</button>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    // Mostrar en modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>👥 Cuotas de Jugadores</h3>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-cerrar">×</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
}

function exportarFinanzas() {
    // Generar CSV para Excel
    const csv = [
        ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto', 'Estado'].join(','),
        ...finanzasData.transacciones.map(t => [
            t.fecha, t.tipo, t.categoria, `"${t.concepto}"`, t.monto, t.estado
        ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finanzas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showMsg('Archivo descargado', 'success');
}

function enviarRecordatorio(jugador) {
    // Integrar con WhatsApp o email
    const mensaje = `Hola ${jugador}, te recordamos que tenés cuotas pendientes del equipo. Por favor regularizá tu situación. ¡Gracias!`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Event listeners
function setupFinanzasEventListeners() {
    // Escuchar cambio de sección para recargar datos
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
}

// CSS necesario (agregar a tu styles.css o en <style>)
const finanzasCSS = `
<style>
/* Resumen Cards */
.finanzas-resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.card-resumen {
    background: white;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.card-resumen:hover {
    transform: translateY(-2px);
}

.card-resumen.ingresos { border-left: 4px solid #10b981; }
.card-resumen.egresos { border-left: 4px solid #ef4444; }
.card-resumen.balance.positivo { border-left: 4px solid #3b82f6; }
.card-resumen.balance.negativo { border-left: 4px solid #f59e0b; }

.resumen-icono {
    font-size: 2rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 12px;
}

.resumen-label {
    display: block;
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 4px;
}

.resumen-monto {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
}

.resumen-estado {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
}

/* Acciones */
.finanzas-acciones {
    display: flex;
    gap: 12px;
    margin-bottom: 25px;
    flex-wrap: wrap;
}

.btn-accion-finanza {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    color: #374151;
    transition: all 0.2s;
}

.btn-accion-finanza:hover {
    border-color: #4f46e5;
    color: #4f46e5;
    transform: translateY(-1px);
}

/* Filtros */
.finanzas-filtros {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
}

.finanzas-filtros select {
    padding: 10px 15px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 0.9rem;
    min-width: 150px;
}

.btn-limpiar {
    padding: 10px 20px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: #64748b;
}

/* Lista */
.finanzas-lista {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    margin-bottom: 30px;
}

.lista-header {
    display: grid;
    grid-template-columns: 100px 2fr 120px 120px 100px 100px;
    gap: 15px;
    padding: 16px 20px;
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.875rem;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
}

.lista-items {
    max-height: 400px;
    overflow-y: auto;
}

.transaccion-item {
    display: grid;
    grid-template-columns: 100px 2fr 120px 120px 100px 100px;
    gap: 15px;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    align-items: center;
    transition: background 0.2s;
}

.transaccion-item:hover {
    background: #f8fafc;
}

.transaccion-item.pendiente {
    opacity: 0.7;
    background: #fef3c7;
}

.t-fecha { color: #64748b; font-size: 0.875rem; }
.t-concepto { font-weight: 500; color: #1e293b; }
.t-monto.ingresos { color: #10b981; font-weight: 600; }
.t-monto.egresos { color: #ef4444; font-weight: 600; }

.badge-categoria {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-categoria.cuota { background: #dbeafe; color: #1d4ed8; }
.badge-categoria.sponsor { background: #d1fae5; color: #065f46; }
.badge-categoria.evento { background: #fef3c7; color: #92400e; }
.badge-categoria.equipamiento { background: #fce7f3; color: #be185d; }

.badge-estado {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.badge-estado.pagado { background: #d1fae5; color: #065f46; }
.badge-estado.pendiente { background: #fee2e2; color: #991b1b; }

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.btn-icon:hover { opacity: 1; }

.sin-resultados {
    text-align: center;
    padding: 40px;
    color: #64748b;
}

/* Gráfico */
.finanzas-grafico {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.finanzas-grafico h4 {
    margin: 0 0 20px 0;
    color: #1e293b;
}

.grafico-barras {
    display: flex;
    gap: 40px;
    align-items: flex-end;
    height: 200px;
    justify-content: center;
}

.barra-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.barra {
    width: 80px;
    border-radius: 8px 8px 0 0;
    position: relative;
    transition: height 0.5s ease;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10px;
}

.barra.ingresos { background: linear-gradient(to top, #10b981, #34d399); }
.barra.egresos { background: linear-gradient(to top, #ef4444, #f87171); }

.barra-valor {
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.barra-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 600;
}

/* Modal Form */
.form-finanza .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

@media (max-width: 640px) {
    .lista-header,
    .transaccion-item {
        grid-template-columns: 80px 1fr 100px;
        gap: 10px;
    }
    .lista-header span:nth-child(3),
    .lista-header span:nth-child(4),
    .lista-header span:nth-child(5),
    .transaccion-item span:nth-child(3),
    .transaccion-item span:nth-child(4),
    .transaccion-item .t-estado {
        display: none;
    }
    .finanzas-resumen {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// Agregar CSS al head
if (!document.getElementById('finanzas-styles')) {
    const style = document.createElement('div');
    style.id = 'finanzas-styles';
    style.innerHTML = finanzasCSS;
    document.head.appendChild(style);
}

// Inicializar cuando se muestra la sección
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la sección de finanzas al cargar
    if (document.getElementById('finanzas')?.classList.contains('active')) {
        initFinanzas();
    }
});
