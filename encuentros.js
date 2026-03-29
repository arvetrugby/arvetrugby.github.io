console.log('✅ encuentros.js SE CARGÓ - Fecha1');


// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
const ENCUENTROS_CONFIG = {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutos
    ITEMS_POR_PAGINA: 10,
    DEBOUNCE_DELAY: 300,
    MAX_RETRIES: 3,
    API_URL: typeof API_URL !== 'undefined' ? API_URL : 'https://script.google.com/macros/s/AKfycbzxxxxxxxxxxxxxxxx/exec'
};

// ============================================
// CACHE EN MEMORIA
// ============================================
const encuentrosCache = new Map();
const abortControllers = new Map();

const CacheManager = {
    get(key) {
        const item = encuentrosCache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > ENCUENTROS_CONFIG.CACHE_TTL) {
            encuentrosCache.delete(key);
            return null;
        }
        return item.data;
    },
    
    set(key, data) {
        encuentrosCache.set(key, { data, timestamp: Date.now() });
    },
    
    invalidate(key) {
        encuentrosCache.delete(key);
    },
    
    invalidateAll() {
        encuentrosCache.clear();
    }
};


// ============================================
// LOADING SCREEN (igual que index) - MODIFICADO
// ============================================
const LoadingManager = {
    overlays: new Map(),
    idsMostrados: new Set(), // 🔧 NUEVO: tracking de IDs ya mostrados

    show(id, message = 'Cargando...') {
        // 🔧 IGNORAR si ya se mostró este ID (previene duplicados)
        if (this.idsMostrados.has(id)) {
            return;
        }
        
        // 🔧 IGNORAR IDs de carga automática (listados, etc)
        const idsAutomaticos = ['mis-encuentros', 'invitaciones', 'detalle', 'flyers'];
        if (idsAutomaticos.includes(id)) {
            return;
        }
        
        if (this.overlays.has(id)) return;

        // Inyectar estilos si no existen
        if (!document.getElementById('arvet-loader-styles')) {
            const style = document.createElement('style');
            style.id = 'arvet-loader-styles';
            style.textContent = `
                .loading-particles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                    animation: particlesMove 20s linear infinite;
                    opacity: .4;
                }
                .logo-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 220px;
                    height: 220px;
                    background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
                    filter: blur(60px);
                    opacity: .45;
                    animation: glowPulse 3s ease-in-out infinite;
                }
                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0); }
                    50%       { transform: translateY(-8px); }
                }
                @keyframes glowPulse {
                    0%, 100% { opacity: .35; transform: translate(-50%,-50%) scale(1); }
                    50%      { opacity: .65; transform: translate(-50%,-50%) scale(1.1); }
                }
                @keyframes progressGlow {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes textPulse {
                    0%, 100% { opacity: .6; }
                    50%      { opacity: 1; }
                }
                @keyframes particlesMove {
                    0%   { transform: translateY(0); }
                    100% { transform: translateY(-200px); }
                }
                @keyframes fadeOutLoader {
                    from { opacity: 1; }
                    to   { opacity: 0; }
                }
                .arvet-loader-hidden {
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none;
                }
                @media (max-width: 768px) {
                    .arvet-loader-logo { width: 160px !important; }
                    .logo-glow { width: 180px; height: 180px; }
                }
            `;
            document.head.appendChild(style);
        }

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = `arvet-loader-${id}`;
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #020617 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            overflow: hidden;
            transition: opacity .6s ease, visibility .6s ease;
        `;

        overlay.innerHTML = `
            <div class="loading-particles"></div>
            <div style="position: relative; margin-bottom: 50px;">
                <img class="arvet-loader-logo" src="images/ARVET.png" alt="ARVET" style="
                    width: 200px; height: auto;
                    position: relative; z-index: 2;
                    opacity: 0;
                    animation: logoFloat 4s ease-in-out infinite 1.4s;
                    transition: opacity .4s ease;
                ">
                <div class="logo-glow"></div>
            </div>
            <div style="
                width: 300px; height: 4px;
                background: rgba(255,255,255,0.08);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 25px;
            ">
                <div id="arvet-progress-${id}" style="
                    width: 0%; height: 100%;
                    background: linear-gradient(90deg, #38bdf8, #60a5fa, #38bdf8);
                    background-size: 200% 100%;
                    border-radius: 10px;
                    animation: progressGlow 2s linear infinite;
                    transition: width .4s ease;
                "></div>
            </div>
            <p id="arvet-text-${id}" style="
                color: #94a3b8;
                font-size: 14px;
                letter-spacing: 3px;
                text-transform: uppercase;
                margin: 0;
                animation: textPulse 2s ease-in-out infinite;
            ">${message}</p>
        `;

        document.body.appendChild(overlay);
        this.overlays.set(id, overlay);
        this.idsMostrados.add(id); // 🔧 REGISTRAR que ya se mostró

        // Logo fade in
        const logoEl = overlay.querySelector('.arvet-loader-logo');
        if (logoEl.complete) {
            logoEl.style.opacity = '1';
        } else {
            logoEl.onload  = () => logoEl.style.opacity = '1';
            logoEl.onerror = () => logoEl.style.display = 'none';
        }

        // Animar barra de progreso
        const textos = [
            'Podes editar...',
            'Podes cancelar...',
            'Podes descargar...',
            '..Cuantos somos?',
            '¡A ver quien viene!'
        ];
        const progressEl = overlay.querySelector(`#arvet-progress-${id}`);
        const textEl     = overlay.querySelector(`#arvet-text-${id}`);
        const startTime  = Date.now();
        let textIndex    = 0;

       const tick = () => {
            if (!document.body.contains(overlay)) return;
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 3500) * 90, 90);
            progressEl.style.width = progress + '%';
            const newIndex = Math.min(Math.floor(elapsed / 900), textos.length - 1);
            if (newIndex !== textIndex) {
                textIndex = newIndex;
                textEl.textContent = textos[textIndex];
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        // Auto-destruir si tarda más de 10 segundos
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                overlay.remove();
                this.overlays.delete(id);
                this.idsMostrados.delete(id); // 🔧 LIMPIAR tracking
            }
        }, 10000);
    },

    hide(id) {
        const overlay = this.overlays.get(id);
        if (!overlay) return;
        
        const progressEl = overlay.querySelector(`#arvet-progress-${id}`);
        if (progressEl) progressEl.style.width = '100%';
        
        setTimeout(() => {
            overlay.classList.add('arvet-loader-hidden');
            setTimeout(() => {
                overlay.remove();
                this.overlays.delete(id);
                this.idsMostrados.delete(id); // 🔧 LIMPIAR tracking al ocultar
            }, 600);
        }, 400);
    },

    hideAll() {
        this.overlays.forEach((_, id) => this.hide(id));
        this.idsMostrados.clear(); // 🔧 LIMPIAR todo
    }
};
// ============================================
// SKELETON UI
// ============================================
const SkeletonUI = {
    card() {
        return `
            <div style="margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div class="skeleton-encuentros" style="width: 60%; height: 24px;"></div>
                    <div class="skeleton-encuentros" style="width: 80px; height: 24px;"></div>
                </div>
                <div class="skeleton-encuentros" style="width: 100%; height: 100px; margin-bottom: 15px;"></div>
                <div style="display: flex; gap: 10px;">
                    <div class="skeleton-encuentros" style="width: 100px; height: 36px;"></div>
                    <div class="skeleton-encuentros" style="width: 100px; height: 36px;"></div>
                </div>
            </div>
        `;
    },
    
    grid(count = 3) {
        return Array(count).fill(this.card()).join('');
    }
};

// ============================================
// FETCH CON RETRY Y ABORT
// ============================================
async function fetchWithRetry(url, options = {}, retries = ENCUENTROS_CONFIG.MAX_RETRIES) {
    const controller = new AbortController();
    const id = Math.random().toString(36).substr(2, 9);
    abortControllers.set(id, controller);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        
        if (retries > 0 && !err.message.includes('AbortError')) {
            await new Promise(r => setTimeout(r, 1000 * (ENCUENTROS_CONFIG.MAX_RETRIES - retries + 1)));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    } finally {
        abortControllers.delete(id);
    }
}

function abortPendingRequests() {
    abortControllers.forEach((controller, id) => {
        controller.abort();
        abortControllers.delete(id);
    });
}

// ============================================
// DEBOUNCE
// ============================================
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// ============================================
// MENSAJES (reemplaza mostrarMensajeEncuentros)
// ============================================
function mostrarMensajeEncuentros(texto, tipo = 'info', duracion = 3000) {
    const existing = document.getElementById('msgOverlayEncuentros');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'msgOverlayEncuentros';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: fadeInMsg 0.2s ease;
    `;
    
    const colores = {
        success: '#16a34a',
        error: '#dc2626',
        info: '#1e293b',
        warning: '#d97706'
    };
    
    const iconos = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    overlay.innerHTML = `
        <div style="
            background: ${colores[tipo] || colores.info};
            color: white;
            padding: 20px 40px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            max-width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            animation: slideUpMsg 0.3s ease;
        ">
            ${iconos[tipo] || ''} ${texto}
        </div>
    `;
    
    // Estilos de animación si no existen
    if (!document.getElementById('msg-anim-styles')) {
        const style = document.createElement('style');
        style.id = 'msg-anim-styles';
        style.textContent = `
            @keyframes fadeInMsg { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOutMsg { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideUpMsg { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
    
    const timer = setTimeout(() => {
        overlay.style.animation = 'fadeOutMsg 0.2s ease';
        setTimeout(() => overlay.remove(), 200);
    }, duracion);
    
    overlay.addEventListener('click', () => {
        clearTimeout(timer);
        overlay.remove();
    });
}

// ============================================
// ESTADO GLOBAL
// ============================================
let encuentroIdDesdeLink = null;

const encuentrosState = {
    misEncuentros: [],
    invitaciones: [],
    encuentroActivo: null,
    paginaActual: 1,
    cargando: false,
    hasMore: true
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const encuentroId = params.get('encuentroId');

    if (encuentroId) {
        encuentroIdDesdeLink = encuentroId;
        if (!usuarioLogueado()) {
            mostrarPreviewEncuentro(encuentroId);
        } else {
            setTimeout(() => verDetalleEncuentro(encuentroId), 500);
        }
    }

    window.addEventListener('encuentrosTabChange', debounce((e) => {
        if (e.detail === 'invitaciones') {
            cargarInvitaciones();
        }
    }, 100));

    // Observer para detectar cuando la sección se activa
    let observer = new MutationObserver(debounce((mutations) => {
        const sectionEncuentros = document.getElementById('encuentros');
        if (!sectionEncuentros?.classList.contains('active')) return;
        
        const container = document.getElementById('listaMisEncuentros');
        if (!container || container.children.length > 0) return;
        if (encuentrosState.misEncuentros.length > 0) return;
        
        renderizarMisEncuentros();
    }, 200));

    observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
    });
    
    // Primera carga
    setTimeout(() => {
        const sectionEncuentros = document.getElementById('encuentros');
        if (sectionEncuentros?.classList.contains('active')) {
            renderizarMisEncuentros();
        }
    }, 100);
    
    // Cleanup
    window.addEventListener('beforeunload', () => {
        observer.disconnect();
        abortPendingRequests();
        LoadingManager.hideAll();
    });
});

// ============================================
// PARTE 2: NAVEGACIÓN Y RENDERIZADO DE ENCUENTROS
// ============================================

// ============================================
// NAVEGACIÓN DE TABS
// ============================================
function showEncuentrosTab(tab) {
    // Actualizar UI inmediatamente
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

    // Cargar datos
    if (tab === 'creados') {
        renderizarMisEncuentros();
    } else {
        renderizarInvitaciones();
        
        if (encuentroIdDesdeLink) {
            setTimeout(() => {
                verDetalleEncuentro(encuentroIdDesdeLink);
                encuentroIdDesdeLink = null;
            }, 500);
        }
    }
}

// ============================================
// RENDERIZAR MIS ENCUENTROS (OPTIMIZADO)
// ============================================
async function renderizarMisEncuentros() {
    const container = document.getElementById('listaMisEncuentros');
    const empty = document.getElementById('emptyCreados');
    
    if (!container) return;
    
    // 🔧 SI YA ESTÁ CARGANDO, NO HACER NADA (previene múltiples loaders)
    if (encuentrosState.cargando) {
        console.log('⚠️ Ya está cargando, ignorando llamada duplicada');
        return;
    }
    
    // Mostrar skeleton mientras carga
    container.innerHTML = SkeletonUI.grid(3);
    if (empty) empty.style.display = 'none';
    
    // 🔧 Marcar como cargando ANTES de mostrar el loader
    encuentrosState.cargando = true;
    
    // Ahora sí mostrar loader (solo una vez)
    LoadingManager.show('mis-encuentros', 'Cargando encuentros...');
    
    const usuario = obtenerUsuarioActual();
    const cacheKey = `encuentros-${usuario.equipoId}`;
    
    // Verificar cache primero
    const cached = CacheManager.get(cacheKey);
    if (cached) {
        renderizarListaEncuentros(cached, container, empty);
        encuentrosState.cargando = false;
        LoadingManager.hide('mis-encuentros');
        // Refrescar en background
        fetchFreshData(usuario, cacheKey, container, empty);
        return;
    }
    
    await fetchFreshData(usuario, cacheKey, container, empty);
}

async function fetchFreshData(usuario, cacheKey, container, empty) {
    try {
        const result = await fetchWithRetry(
            `${ENCUENTROS_CONFIG.API_URL}?action=getEncuentros&equipoId=${usuario.equipoId}`
        );
        
        if (!result.success) {
            mostrarMensajeEncuentros('Error al cargar encuentros', 'error');
            return;
        }
        
        const encuentros = result.data || [];
        encuentros.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        // Guardar en cache y estado
        CacheManager.set(cacheKey, encuentros);
        encuentrosState.misEncuentros = encuentros;
        
        renderizarListaEncuentros(encuentros, container, empty);
        
    } catch (err) {
        console.error('Error cargando encuentros:', err);
        mostrarMensajeEncuentros('Error de conexión al cargar encuentros', 'error');
    } finally {
        encuentrosState.cargando = false;
        LoadingManager.hide('mis-encuentros');
    }
}

function renderizarListaEncuentros(encuentros, container, empty) {
    if (encuentros.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    
    // Usar DocumentFragment para mejor rendimiento
    const wrapper = document.createElement('div');
    
    // Renderizar todos (o paginar si son muchos)
    const aRenderizar = encuentros.slice(0, ENCUENTROS_CONFIG.ITEMS_POR_PAGINA * 3); // Mostrar más inicialmente
    
    wrapper.innerHTML = aRenderizar.map(enc => generarCardEncuentroHTML(enc)).join('');
    
    container.innerHTML = '';
    container.appendChild(wrapper);
    
    // Lazy load de imágenes
    setupLazyLoading(container);
}

function generarCardEncuentroHTML(enc) {
    // Parsear JSONs
    let fechas = [], valores = [];
    try {
        fechas = JSON.parse(enc.fechasJSON || '[]');
        valores = JSON.parse(enc.valoresJSON || '[]');
    } catch(e) { console.error('Error parseando JSON:', e); }
    
    const equiposConfirmados = enc.equiposAceptados || 1;
    const plazasLibres = enc.cupoMaximo - equiposConfirmados;
    
    // Generar HTML de fechas
    const fechasHTML = fechas.map(f => {
        const horariosHTML = f.horarios?.map(h => 
            `<span style="display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 4px;">${h.hora}hs - ${h.desc}</span>`
        ).join('') || '';
        
        return `
            <div style="margin-bottom: 8px;">
                <strong style="color: #1e293b;">📅 ${formatearFecha(f.dia)}</strong>
                <div style="margin-top: 4px; margin-left: 24px;">
                    ${horariosHTML}
                </div>
            </div>
        `;
    }).join('');

    // Mapa lazy-loaded
    const mapaHTML = (enc.lat && enc.lng) ? `
        <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0;" class="lazy-map" data-lat="${enc.lat}" data-lng="${enc.lng}" data-direccion="${enc.direccion || 'Ubicación marcada'}">
            <div style="background: #f8fafc; padding: 40px; text-align: center;">
                <button onclick="cargarMapaInline(this.parentElement.parentElement)" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📍 Cargar mapa
                </button>
            </div>
        </div>
    ` : `<div style="color: #64748b; margin: 10px 0;">📍 ${enc.direccion || 'Sin ubicación'}</div>`;

    const estadoClass = `estado-${enc.estado || 'publicado'}`;
    const estadoTexto = {
        publicado: 'Publicado',
        borrador: 'Borrador',
        cancelado: 'Cancelado'
    }[enc.estado] || enc.estado;

    const botonesHTML = enc.estado === 'cancelado' ? `
        <button onclick="verDetalleEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">Ver detalle</button>
        <span style="color: #991b1b; font-weight: 600; padding: 8px 16px;">CANCELADO</span>
    ` : `
        <button onclick="verDetalleEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">Ver detalle</button>
        <button onclick="editarEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #f1f5f9; color: #475569; cursor: pointer; font-weight: 500;">Editar</button>
        <button onclick="cancelarEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #fee2e2; color: #991b1b; cursor: pointer; font-weight: 500;">Cancelar</button>
        <button onclick="compartirEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #22c55e; color: white; cursor: pointer; font-weight: 500;">Compartir</button>
    `;

    const tiposHTML = enc.tipo ? enc.tipo.split(', ').map(t => 
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-right: 5px; margin-bottom: 4px;">${t}</span>`
    ).join('') : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #f1f5f9; color: #64748b; margin-right: 5px;">Sin tipo</span>';

    return `
        <div class="encuentro-card" style="${enc.estado === 'cancelado' ? 'opacity: 0.7; background: #f9fafb;' : ''} margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: none; transition: box-shadow 0.2s, transform 0.2s;" onmouseover="this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)'" data-id="${enc.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 5px; line-height: 1.2;">${enc.nombre}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${enc.estado === 'publicado' ? '#dcfce7' : enc.estado === 'cancelado' ? '#fee2e2' : '#f1f5f9'}; color: ${enc.estado === 'publicado' ? '#166534' : enc.estado === 'cancelado' ? '#991b1b' : '#64748b'};">${estadoTexto}</span>
                        ${tiposHTML}
                    </div>
                </div>
                <div style="text-align: right; min-width: 100px;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #4f46e5;">${equiposConfirmados}/${enc.cupoMaximo}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${plazasLibres > 0 ? plazasLibres + ' plaza' + (plazasLibres > 1 ? 's' : '') + ' libre' + (plazasLibres > 1 ? 's' : '') : 'Completo'}</div>
                </div>
            </div>

            <div style="margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
                ${fechasHTML}
                ${valores.length > 0 ? `<div style="margin-top: 10px;"><strong style="color: #1e293b;">💰 Valores:</strong><br>${valores.map(v => `• ${v.titulo}: $${parseFloat(v.precio).toLocaleString('es-AR')}${v.desc ? ` (${v.desc})` : ''}`).join('<br>')}</div>` : ''}
            </div>

            ${mapaHTML}

            ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

            ${enc.flyerUrl ? `
                <div style="margin-bottom: 15px;">
                    <img data-src="${enc.flyerUrl}" class="lazy-img" alt="Flyer" style="max-width: 300px; border-radius: 8px; object-fit: cover; display: block;">
                </div>
            ` : ''}

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${botonesHTML}
            </div>
        </div>
    `;
}

// ============================================
// LAZY LOADING
// ============================================
function setupLazyLoading(container) {
    if (!('IntersectionObserver' in window)) {
        // Fallback: cargar todo
        container.querySelectorAll('.lazy-img').forEach(img => {
            img.src = img.dataset.src;
        });
        return;
    }
    
    const imgObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => img.classList.remove('lazy-img');
                obs.unobserve(img);
            }
        });
    }, { rootMargin: '50px' });
    
    container.querySelectorAll('.lazy-img').forEach(img => imgObserver.observe(img));
}

function cargarMapaInline(container) {
    const { lat, lng, direccion } = container.dataset;
    
    container.innerHTML = `
        <iframe 
            width="100%" 
            height="150" 
            frameborder="0" 
            scrolling="no" 
            marginheight="0" 
            marginwidth="0" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-0.01}%2C${parseFloat(lat)-0.01}%2C${parseFloat(lng)+0.01}%2C${parseFloat(lat)+0.01}&layer=mapnik&marker=${lat}%2C${lng}" 
            style="border: 0; display: block;">
        </iframe>
        <div style="background: #f8fafc; padding: 8px 12px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span>📍 ${direccion}</span>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 500;">Abrir mapa →</a>
        </div>
    `;
}

// ============================================
// RENDERIZAR INVITACIONES (OPTIMIZADO)
// ============================================
async function renderizarInvitaciones() {
    const container = document.getElementById('listaInvitaciones');
    const empty = document.getElementById('emptyInvitaciones');
    const badge = document.getElementById('badgeInvitaciones');
    
    if (!container) return;
    
    // 🔧 Prevenir múltiples cargas
    if (encuentrosState.cargando) {
        console.log('⚠️ Ya está cargando invitaciones, ignorando');
        return;
    }
    
    container.innerHTML = SkeletonUI.grid(3);
    if (empty) empty.style.display = 'none';
    
    encuentrosState.cargando = true;
    LoadingManager.show('invitaciones', 'Cargando invitaciones...');
    
    
    const usuario = obtenerUsuarioActual();
    const cacheKey = `invitaciones-${usuario.equipoId}`;
    
    const cached = CacheManager.get(cacheKey);
    if (cached) {
        renderizarInvitacionesData(cached, container, empty, badge);
        encuentrosState.cargando = false;
        LoadingManager.hide('invitaciones');
        fetchFreshInvitaciones(usuario, cacheKey, container, empty, badge);
        return;
    }
    
    await fetchFreshInvitaciones(usuario, cacheKey, container, empty, badge);
}

async function fetchFreshInvitaciones(usuario, cacheKey, container, empty, badge) {
    try {
        // Cargar en paralelo
        const [aceptadosRes, pendientesRes, rechazadosRes] = await Promise.allSettled([
            fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentrosAceptados&equipoId=${usuario.equipoId}`),
            fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentrosParaInvitar&equipoId=${usuario.equipoId}`),
            fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentrosRechazados&equipoId=${usuario.equipoId}`)
        ]);
        
        const aceptados = aceptadosRes.status === 'fulfilled' && aceptadosRes.value.success ? aceptadosRes.value.data : [];
        const todosPendientes = pendientesRes.status === 'fulfilled' && pendientesRes.value.success ? pendientesRes.value.data : [];
        const rechazados = rechazadosRes.status === 'fulfilled' && rechazadosRes.value.success ? rechazadosRes.value.data : [];
        
        // Filtrar pendientes
        const idsRespondidos = new Set([...aceptados.map(a => a.id), ...rechazados.map(r => r.id)]);
        const pendientes = todosPendientes.filter(p => !idsRespondidos.has(p.id));
        
        const data = { aceptados, pendientes, rechazados };
        CacheManager.set(cacheKey, data);
        
        renderizarInvitacionesData(data, container, empty, badge);
        
    } catch (err) {
        console.error('Error cargando invitaciones:', err);
        mostrarMensajeEncuentros('Error de conexión', 'error');
    } finally {
        encuentrosState.cargando = false;
        LoadingManager.hide('invitaciones');
    }
}

function renderizarInvitacionesData(data, container, empty, badge) {
    const { aceptados, pendientes, rechazados } = data;
    
    // Actualizar badge
    if (badge) {
        if (pendientes.length > 0) {
            badge.textContent = pendientes.length > 99 ? '99+' : pendientes.length;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    if (aceptados.length === 0 && pendientes.length === 0 && rechazados.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    const secciones = [];
    
    if (aceptados.length > 0) {
        secciones.push(`
            <div style="margin-bottom: 30px;">
                <h3 style="color: #059669; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; background: #059669; border-radius: 50%;"></span>
                    Invitaciones aceptadas (${aceptados.length})
                </h3>
                ${aceptados.map(enc => generarCardInvitacion(enc, 'aceptado')).join('')}
            </div>
        `);
    }
    
    if (rechazados.length > 0) {
        secciones.push(`
            <div style="margin-bottom: 30px;">
                <h3 style="color: #991b1b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; background: #991b1b; border-radius: 50%;"></span>
                    Invitaciones rechazadas (${rechazados.length})
                </h3>
                ${rechazados.map(enc => generarCardInvitacion(enc, 'rechazado')).join('')}
            </div>
        `);
    }
    
    if (pendientes.length > 0) {
        secciones.push(`
            <div>
                <h3 style="color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
                    Invitaciones pendientes (${pendientes.length})
                </h3>
                ${pendientes.map(enc => generarCardInvitacion(enc, 'pendiente')).join('')}
            </div>
        `);
    }
    
    container.innerHTML = secciones.join('');
    setupLazyLoading(container);
}

function generarCardInvitacion(enc, estado) {
    let fechas = [], valores = [];
    try {
        fechas = JSON.parse(enc.fechasJSON || '[]');
        valores = JSON.parse(enc.valoresJSON || '[]');
    } catch(e) {}
    
    const borderStyle = estado === 'aceptado' ? 'border-left: 4px solid #10b981;' : 
                      estado === 'rechazado' ? 'border-left: 4px solid #ef4444; opacity: 0.85;' : '';
    
    const fechasHTML = fechas.map(f => {
        const horariosHTML = f.horarios?.map(h => 
            `<span style="display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 4px;">${h.hora}hs - ${h.desc}</span>`
        ).join('') || '';
        
        return `
            <div style="margin-bottom: 8px;">
                <strong style="color: #1e293b;">📅 ${formatearFecha(f.dia)}</strong>
                <div style="margin-top: 4px; margin-left: 24px;">
                    ${horariosHTML}
                </div>
            </div>
        `;
    }).join('');

    const mapaHTML = (enc.lat && enc.lng) ? `
        <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0;" class="lazy-map" data-lat="${enc.lat}" data-lng="${enc.lng}" data-direccion="${enc.lugar || 'Ubicación marcada'}">
            <div style="background: #f8fafc; padding: 40px; text-align: center;">
                <button onclick="cargarMapaInline(this.parentElement.parentElement)" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📍 Cargar mapa
                </button>
            </div>
        </div>
    ` : `<div style="color: #64748b; margin: 10px 0;">📍 ${enc.lugar || 'Sin ubicación'}</div>`;

    const botonesHTML = estado === 'aceptado' ? `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">✓ Aceptado</span>
            <button onclick="verDetalleEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">Ver detalle</button>
            ${enc.telefonoOrganizador ? `
                <a href="https://wa.me/${String(enc.telefonoOrganizador).replace(/[^0-9]/g, '')}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #25D366; color: white; padding: 8px 14px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
                    WhatsApp Organizador
                </a>
            ` : ''}
        </div>
    ` : estado === 'rechazado' ? `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 6px; background: #fee2e2; color: #991b1b; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">✕ Rechazado</span>
            <button onclick="verDetalleEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">Ver detalle</button>
        </div>
    ` : `
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="verDetalleEncuentro('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #e0e7ff; color: #3730a3; cursor: pointer; font-weight: 500;">Ver detalle</button>
            <button onclick="aceptarInvitacion('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #4f46e5; color: white; cursor: pointer; font-weight: 500;">Aceptar invitación</button>
            <button onclick="rechazarInvitacion('${enc.id}')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #fee2e2; color: #991b1b; cursor: pointer; font-weight: 500;">Rechazar</button>
        </div>
    `;

    const badgeEstado = estado === 'aceptado' ? 
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #d1fae5; color: #065f46; margin-right: 5px;">Aceptado</span>` :
        estado === 'rechazado' ?
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #fee2e2; color: #991b1b; margin-right: 5px;">Rechazado</span>` :
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #fef3c7; color: #92400e; margin-right: 5px;">Invitación disponible</span>`;
    
    const tiposHTML = enc.tipo ? enc.tipo.split(', ').map(t => 
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-right: 5px; margin-bottom: 4px;">${t}</span>`
    ).join('') : '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #f1f5f9; color: #64748b; margin-right: 5px;">Sin tipo</span>';

    return `
        <div class="encuentro-card invitacion-${estado}" style="${borderStyle} margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); transition: box-shadow 0.2s, transform 0.2s;" onmouseover="this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)'" data-id="${enc.id}">
            <div style="flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: start; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; line-height: 1.2;">${enc.nombre}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                            ${badgeEstado}
                            ${tiposHTML}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 80px;">
                        <div style="font-size: 1.5rem; font-weight: 800; color: #4f46e5;">${enc.equiposAceptados || 1}/${enc.cupoMaximo}</div>
                        <div style="font-size: 0.8rem; color: #64748b; white-space: nowrap;">${enc.cupoMaximo} plazas</div>
                    </div>
                </div>
                
                <div style="width: 100%; margin-top: 8px;">
                    <div style="display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 10px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <span style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Organiza</span>
                        <span style="width: 1px; height: 16px; background: #cbd5e1;"></span>
                        <span style="font-size: 0.95rem; color: #1e293b; font-weight: 700;">${enc.creadorNombre || 'Equipo desconocido'}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px; color: #64748b; font-size: 0.9rem;">
                ${fechasHTML}
                ${valores.length > 0 ? `<div style="margin-top: 10px;"><strong style="color: #1e293b;">💰 Valores:</strong><br>${valores.map(v => `• ${v.titulo}: $${parseFloat(v.precio).toLocaleString('es-AR')}${v.desc ? ` (${v.desc})` : ''}`).join('<br>')}</div>` : ''}
            </div>

            ${mapaHTML}

            ${enc.descripcion ? `<p style="color: #64748b; margin-bottom: 15px; line-height: 1.5;">${enc.descripcion}</p>` : ''}

            ${enc.flyerUrl ? `
                <div style="margin-bottom: 15px;">
                    <img data-src="${enc.flyerUrl}" class="lazy-img" alt="Flyer" style="max-width: 300px; border-radius: 8px; object-fit: cover; display: block;">
                </div>
            ` : ''}

            ${botonesHTML}
        </div>
    `;
}

// ============================================
// ACCIONES CON LOADING
// ============================================
async function aceptarInvitacion(encuentroId) {
    LoadingManager.show('accion', 'Procesando...');
    
    const usuario = obtenerUsuarioActual();
    const params = new URLSearchParams({
        action: 'responderEncuentro',
        encuentroId: encuentroId,
        equipoId: usuario.equipoId,
        estado: 'aceptado'
    });
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            mostrarMensajeEncuentros('¡Invitación aceptada!', 'success');
            CacheManager.invalidate(`invitaciones-${usuario.equipoId}`);
            
            // Crear asistencias en background — silencioso
            fetch(`${ENCUENTROS_CONFIG.API_URL}?action=crearAsistenciasEquipo&encuentroId=${encuentroId}&equipoId=${usuario.equipoId}`)
                .catch(() => {});
            
            setTimeout(() => {
                LoadingManager.hideAll();
                renderizarInvitaciones();
            }, 800);

        } else {
            mostrarMensajeEncuentros(result.error || 'Error al aceptar', 'error');
        }
    } catch (err) {
        mostrarMensajeEncuentros('Error de conexión', 'error');
    } finally {
        LoadingManager.hide('accion');
    }
}
async function rechazarInvitacion(encuentroId) {
    if (!confirm('¿Seguro que querés rechazar esta invitación?')) return;
    
    LoadingManager.show('accion', 'Procesando...');
    
    const usuario = obtenerUsuarioActual();
    const params = new URLSearchParams({
        action: 'responderEncuentro',
        encuentroId: encuentroId,
        equipoId: usuario.equipoId,
        estado: 'rechazado'
    });
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            mostrarMensajeEncuentros('Invitación rechazada', 'info');
            CacheManager.invalidate(`invitaciones-${usuario.equipoId}`);
            setTimeout(() => {
                LoadingManager.hideAll(); // limpiar cualquier loader colgado
                renderizarInvitaciones();
            }, 800);
        } else {
            mostrarMensajeEncuentros(result.error || 'Error al rechazar', 'error');
        }
    } catch (err) {
        mostrarMensajeEncuentros('Error de conexión', 'error');
    } finally {
        LoadingManager.hide('accion');
    }
}
// ============================================
// PARTE 3: VER DETALLE, CREAR ENCUENTRO Y MODALES
// ============================================

// ============================================
// VER DETALLE DE ENCUENTRO (OPTIMIZADO)
// ============================================
async function verDetalleEncuentro(encuentroId) {
    const modalExistente = document.getElementById('modalDetalleEncuentro');
    if (modalExistente) modalExistente.remove();
    
    LoadingManager.show('detalle', 'Cargando detalle...');
    
    try {
        const [respEncuentro, respDetalle] = await Promise.all([
            fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentroById&id=${encuentroId}`),
            fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getDetalleEncuentroCompleto&encuentroId=${encuentroId}`)
        ]);
        
        if (!respEncuentro.success) {
            mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
            return;
        }
        
        const enc = respEncuentro.data;
        const detalle = respDetalle.success ? respDetalle.data : {};
        
        // 🔧 FIX: Obtener equipoCreadorId desde los aceptados (el que tiene esCreador=true)
        let equipoCreadorId = enc.equipoCreadorId;
        if (!equipoCreadorId && detalle.aceptados) {
            const creador = detalle.aceptados.find(eq => eq.esCreador);
            if (creador) equipoCreadorId = creador.id;
        }
        
        // Guardarlo en el objeto enc para que pase al modal
        enc.equipoCreadorId = equipoCreadorId;
        
        const modal = crearModalDetalle(enc, detalle, encuentroId);
        document.body.appendChild(modal);
        
        // Pasar el ID correcto
        cargarAsistenciasAsync(encuentroId, equipoCreadorId, modal);
        
    } catch (err) {
        console.error('Error cargando detalle:', err);
        mostrarMensajeEncuentros('Error al cargar detalle del encuentro', 'error');
    } finally {
        LoadingManager.hide('detalle');
    }
}
function crearModalDetalle(enc, detalle, encuentroId) {
    let fechas = [], valores = [];
    try {
        fechas = JSON.parse(enc.fechasJSON || '[]');
        valores = JSON.parse(enc.valoresJSON || '[]');
    } catch(e) { console.error('Error parseando JSON:', e); }
    
    const fechasHTML = fechas.map(f => {
        const horariosHTML = f.horarios?.map(h => 
            `<span style="display: inline-block; background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-size: 0.9rem; margin-right: 5px; margin-bottom: 5px;">${h.hora}hs - ${h.desc}</span>`
        ).join('') || '';
        
        return `
            <div style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                <strong style="color: #1e293b; font-size: 1.1rem;">📅 ${formatearFecha(f.dia)}</strong>
                <div style="margin-top: 8px;">${horariosHTML}</div>
            </div>
        `;
    }).join('');

    // Listas de equipos
    const listaAceptados = detalle.aceptados?.length > 0 ? detalle.aceptados.map(eq => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: ${eq.esCreador ? '#e0e7ff' : '#f0fdf4'}; border-radius: 10px; border-left: 4px solid ${eq.esCreador ? '#4f46e5' : '#22c55e'}; margin-bottom: 8px; flex-wrap: wrap;">
            <img src="${eq.logoUrl || 'https://i.ibb.co/27YqgQrZ/Chat-GPT-Image-23-mar-2026-02-53-18-a-m.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
            <div style="flex: 1; min-width: 200px;">
                <div style="font-weight: 600; color: ${eq.esCreador ? '#3730a3' : '#166534'}; font-size: 0.95rem; word-break: break-word;">${eq.nombre} ${eq.esCreador ? '👑' : ''}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
            </div>
            ${eq.telefonoContacto && !eq.esCreador ? `
                <a href="https://wa.me/${String(eq.telefonoContacto).replace(/[^0-9]/g, '')}" target="_blank" style="background: #25D366; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 600; white-space: nowrap; flex-shrink: 0;">WhatsApp</a>
            ` : ''}
            <span style="background: ${eq.esCreador ? '#4f46e5' : '#22c55e'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; flex-shrink: 0;">${eq.esCreador ? '★ CREADOR' : '✓ Aceptado'}</span>
        </div>
    `).join('') : '<p style="color: #64748b; font-style: italic; padding: 10px;">Ningún equipo ha aceptado aún</p>';

    const listaRechazados = detalle.rechazados?.length > 0 ? detalle.rechazados.map(eq => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fef2f2; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 8px; opacity: 0.9; flex-wrap: wrap;">
            <img src="${eq.logoUrl || 'https://i.ibb.co/27YqgQrZ/Chat-GPT-Image-23-mar-2026-02-53-18-a-m.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
            <div style="flex: 1; min-width: 200px;">
                <div style="font-weight: 600; color: #991b1b; font-size: 0.95rem; word-break: break-word;">${eq.nombre}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
            </div>
            <span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; flex-shrink: 0;">✕ Rechazado</span>
        </div>
    `).join('') : '<p style="color: #64748b; font-style: italic; padding: 10px;">Ningún equipo ha rechazado</p>';

    const listaPendientes = detalle.pendientes?.length > 0 ? detalle.pendientes.map(eq => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fffbeb; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 8px; flex-wrap: wrap;">
            <img src="${eq.logoUrl || 'https://i.ibb.co/27YqgQrZ/Chat-GPT-Image-23-mar-2026-02-53-18-a-m.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
            <div style="flex: 1; min-width: 200px;">
                <div style="font-weight: 600; color: #92400e; font-size: 0.95rem; word-break: break-word;">${eq.nombre}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${eq.ciudad}, ${eq.provincia}</div>
            </div>
            <span style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; flex-shrink: 0;">⏳ Pendiente</span>
        </div>
    `).join('') : '<p style="color: #64748b; font-style: italic; padding: 10px;">No hay equipos pendientes</p>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalDetalleEncuentro';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 10px; box-sizing: border-box;';
    
    modal.innerHTML = `
        <div style="width: 100%; max-width: 900px; max-height: 95vh; overflow-y: auto; background: white; border-radius: 16px; position: relative; animation: slideUpMsg 0.3s ease;">
            <div style="position: sticky; top: 0; background: white; z-index: 10; border-bottom: 1px solid #e2e8f0;">
    <!-- Fila 1: Título y cerrar -->
    <div style="padding: 20px 20px 10px 20px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: clamp(1.1rem, 4vw, 1.5rem); line-height: 1.3; flex: 1; padding-right: 15px;">${enc.nombre}</h2>
        <button onclick="document.getElementById('modalDetalleEncuentro').remove()" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
    
    <!-- Fila 2: RESUMEN PARA CREADOR (solo se muestra si es creador) -->
    <div id="resumenCreadorSticky" style="display: none; padding: 12px 20px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-top: 1px solid #bbf7d0;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 800; color: #166534;" id="resumenEquiposTotal">0</div>
                    <div style="font-size: 0.75rem; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Equipos</div>
                </div>
                <div style="width: 1px; height: 40px; background: #86efac;"></div>
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 800; color: #16a34a;" id="resumenJugadoresTotal">0</div>
                    <div style="font-size: 0.75rem; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Jugadores</div>
                </div>
            </div>
            <button onclick="descargarAsistenciasCompletasCSV('${encuentroId}')" 
                style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(22,163,74,0.3); display: flex; align-items: center; gap: 6px;">
                <span>📥</span> Descargar CSV
            </button>
        </div>
    </div>
</div>
            
            <div style="padding: 20px;">
                ${enc.flyerUrl ? `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${enc.flyerUrl}" style="max-width: 100%; max-height: 250px; border-radius: 12px; object-fit: contain;" alt="Flyer">
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px; word-break: break-word;">
                        <h4 style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">📍 Ubicación</h4>
                        <p style="margin: 0; color: #1e293b; font-weight: 500; font-size: 0.95rem; line-height: 1.4;">${enc.lugar || 'No especificada'}</p>
                        ${enc.lat && enc.lng ? `
                            <a href="https://www.google.com/maps?q=${enc.lat},${enc.lng}" target="_blank" style="color: #4f46e5; font-size: 0.9rem; display: inline-block; margin-top: 8px; word-break: break-all;">Ver en mapa →</a>
                        ` : ''}
                    </div>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                        <h4 style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">👥 Cupo</h4>
                        <p style="margin: 0; color: #1e293b; font-weight: 500; font-size: 1.3rem;">${detalle.cantidadAceptados || 0}/${enc.cupoMaximo}</p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">${(enc.cupoMaximo - (detalle.cantidadAceptados || 0))} plazas disponibles</p>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="color: #64748b; font-size: 0.85rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">📅 Fechas y horarios</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">${fechasHTML}</div>
                </div>

                ${valores.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 0.85rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">💰 Valores</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${valores.map(v => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f0fdf4; border-radius: 10px; flex-wrap: wrap; gap: 8px;">
                                    <div style="flex: 1; min-width: 200px;">
                                        <span style="font-weight: 600; color: #166534;">${v.titulo}</span>
                                        ${v.desc ? `<span style="color: #64748b; font-size: 0.85rem; display: block; margin-top: 2px;">${v.desc}</span>` : ''}
                                    </div>
                                    <span style="font-weight: 700; color: #166534; font-size: 1.1rem; white-space: nowrap;">$${parseFloat(v.precio).toLocaleString('es-AR')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${enc.descripcion ? `
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 12px;">
                        <h4 style="color: #64748b; font-size: 0.85rem; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">📝 Descripción</h4>
                        <p style="margin: 0; color: #1e293b; line-height: 1.6; font-size: 0.95rem; word-break: break-word;">${enc.descripcion}</p>
                    </div>
                ` : ''}

                <div style="margin-top: 25px;">
                    <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span>👥</span> Equipos invitados
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: normal; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">${detalle.totalEquipos || 0} equipos</span>
                    </h3>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #166534; font-size: 0.8rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%;"></span>
                            Aceptados (${detalle.cantidadAceptados || 0})
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 8px;">${listaAceptados}</div>
                    </div>

                    ${detalle.rechazados?.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #991b1b; font-size: 0.8rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
                                Rechazados (${detalle.cantidadRechazados || 0})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 8px;">${listaRechazados}</div>
                        </div>
                    ` : ''}

                    ${detalle.pendientes?.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #92400e; font-size: 0.8rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
                                Pendientes (${detalle.cantidadPendientes || 0})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 8px;">${listaPendientes}</div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Contenedor para asistencias (se carga async) -->
                <div id="asistenciasContainer" style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <div class="skeleton-encuentros" style="height: 100px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}


// ============================================
// CARGAR ASISTENCIAS ASYNC (CORREGIDO)
// ============================================
async function cargarAsistenciasAsync(encuentroId, equipoCreadorId, modal) {
    const usuario = obtenerUsuarioActual();
    const esCreador = String(equipoCreadorId).trim().toLowerCase() === String(usuario.equipoId).trim().toLowerCase();
    
    console.log('Cargando asistencias:', { encuentroId, equipoCreadorId, usuarioEquipoId: usuario.equipoId, esCreador });
    
    const container = modal.querySelector('#asistenciasContainer');
    
    if (!container) {
        console.error('No se encontró #asistenciasContainer');
        return;
    }
    
    // Mostrar resumen sticky si es creador
    const resumenSticky = document.getElementById('resumenCreadorSticky');
    if (resumenSticky && esCreador) {
        resumenSticky.style.display = 'block';
    }
    
    try {
        let asistenciasHTML = '';
        
        if (esCreador) {
            // ========== CREADOR ==========
            const resp = await fetch(`${ENCUENTROS_CONFIG.API_URL}?action=getAsistenciasCompletasCreador&encuentroId=${encuentroId}&equipoCreadorId=${usuario.equipoId}`);
            const data = await resp.json();
            
            console.log('Respuesta asistencias creador:', data);
            
            if (data.success && data.data && data.data.length > 0) {
                
                // 🔢 CALCULAR TOTALES PARA RESUMEN STICKY
                const totalEquipos = data.data.length;
                const totalJugadores = data.data.reduce((acc, eq) => acc + eq.jugadores.length, 0);
                const totalVoy = data.data.reduce((acc, eq) => acc + eq.jugadores.filter(j => j.respuesta === 'voy').length, 0);
                
                // 📝 ACTUALIZAR RESUMEN STICKY
                const elEquipos = document.getElementById('resumenEquiposTotal');
                const elJugadores = document.getElementById('resumenJugadoresTotal');
                if (elEquipos) elEquipos.textContent = totalEquipos;
                if (elJugadores) elJugadores.textContent = totalVoy;
                
                asistenciasHTML = `
                    <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                            <h3 style="color: #1e293b; margin: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <span>📋</span> Confirmación de jugadores
                                <span style="font-size: 0.85rem; color: #64748b; font-weight: normal;">(${totalVoy} van de ${totalJugadores} jugadores)</span>
                            </h3>
                            <button onclick="descargarAsistenciasCompletasCSV('${encuentroId}')" 
                                style="padding: 12px 24px; background: #16a34a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(22,163,74,0.3);">
                                📥 Descargar listado completo
                            </button>
                        </div>
                        
                        ${data.data.map(eq => {
                            const voy = eq.jugadores.filter(j => j.respuesta === 'voy');
                            const noVoy = eq.jugadores.filter(j => j.respuesta === 'no_voy');
                            const pendiente = eq.jugadores.filter(j => !j.respuesta || j.respuesta === 'pendiente');
                            
                            return `
                                <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #e2e8f0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f1f5f9; flex-wrap: wrap; gap: 10px;">
                                        <h4 style="margin: 0; color: #1e293b; font-size: 1.1rem;">${eq.equipoNombre}</h4>
                                        <div style="display: flex; gap: 15px; font-size: 0.9rem; flex-wrap: wrap;">
                                            <span style="color: #16a34a; font-weight: 600; background: #dcfce7; padding: 4px 12px; border-radius: 20px;">✓ ${voy.length} VOY</span>
                                            <span style="color: #dc2626; font-weight: 600; background: #fee2e2; padding: 4px 12px; border-radius: 20px;">✕ ${noVoy.length} NO VOY</span>
                                            <span style="color: #64748b; background: #f1f5f9; padding: 4px 12px; border-radius: 20px;">⏳ ${pendiente.length} pendientes</span>
                                        </div>
                                    </div>
                                    ${eq.jugadores.length > 0 ? `
                                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
                                            ${eq.jugadores.map(j => `
                                                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: ${j.respuesta === 'voy' ? '#dcfce7' : j.respuesta === 'no_voy' ? '#fee2e2' : '#fef3c7'}; border-radius: 8px; border-left: 3px solid ${j.respuesta === 'voy' ? '#16a34a' : j.respuesta === 'no_voy' ? '#dc2626' : '#f59e0b'};">
                                                    <div style="flex: 1;">
                                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem;">${j.nombreCompleto}</div>
                                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                                                            ${j.respuesta === 'voy' ? '✓ Va' : j.respuesta === 'no_voy' ? '✕ No va' : '⏳ Pendiente'}
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : '<p style="color: #64748b; font-style: italic;">Sin jugadores confirmados</p>'}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                
            } else {
                // SIN DATOS - CREADOR
                const elEquipos = document.getElementById('resumenEquiposTotal');
                const elJugadores = document.getElementById('resumenJugadoresTotal');
                if (elEquipos) elEquipos.textContent = '0';
                if (elJugadores) elJugadores.textContent = '0';
                
                asistenciasHTML = `
                    <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                            <h3 style="color: #1e293b; margin: 0; display: flex; align-items: center; gap: 10px;">
                                <span>📋</span> Confirmación de jugadores
                            </h3>
                            <button onclick="descargarAsistenciasCompletasCSV('${encuentroId}')" 
                                style="padding: 12px 24px; background: #16a34a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600;">
                                📥 Descargar listado completo
                            </button>
                        </div>
                        <p style="color: #64748b; text-align: center; padding: 20px;">No hay jugadores confirmados todavía</p>
                    </div>
                `;
            }
            
        } else {
            // ========== EQUIPO INVITADO ==========
            const resp = await fetch(`${ENCUENTROS_CONFIG.API_URL}?action=getAsistenciasPorEquipo&encuentroId=${encuentroId}&equipoId=${usuario.equipoId}`);
            const data = await resp.json();
            
            console.log('Respuesta asistencias equipo:', data);
            
            if (data.success && data.data && data.data.length > 0) {
                const voy = data.data.filter(j => j.respuesta === 'voy');
                const noVoy = data.data.filter(j => j.respuesta === 'no_voy');
                const pendientes = data.data.filter(j => !j.respuesta || j.respuesta === 'pendiente');
                const puedeEditar = ['Admin', 'Capitán', 'Manager'].includes(usuario.rol);
                
                asistenciasHTML = `
                    <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                        <h3 style="color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: clamp(1rem, 4vw, 1.25rem);">
                            <span>📋</span> Mi equipo - Confirmaciones
                            <span style="font-size: 0.8rem; color: #64748b; font-weight: normal; background: #f1f5f9; padding: 6px 12px; border-radius: 20px; white-space: nowrap;">
                                ${voy.length} van · ${noVoy.length} no van · ${pendientes.length} pendientes
                            </span>
                            ${puedeEditar ? `<span style="margin-left: auto; font-size: 0.75rem; color: #4f46e5; background: #e0e7ff; padding: 4px 10px; border-radius: 20px; white-space: nowrap;">Podés editar</span>` : ''}
                        </h3>
                        <div style="background: white; border-radius: 12px; padding: 15px; border: 2px solid #e2e8f0;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${data.data.map(j => `
                                    <div style="display: flex; align-items: center; gap: 12px; padding: 15px; background: ${j.respuesta === 'voy' ? '#dcfce7' : j.respuesta === 'no_voy' ? '#fee2e2' : '#fef3c7'}; border-radius: 10px; border-left: 4px solid ${j.respuesta === 'voy' ? '#16a34a' : j.respuesta === 'no_voy' ? '#dc2626' : '#f59e0b'}; flex-wrap: wrap;">
                                        <div style="flex: 1; min-width: 150px;">
                                            <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem; word-break: break-word;">${j.nombreCompleto}</div>
                                            <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 8px;">
                                                ${j.dni ? `<span>DNI: ${j.dni}</span>` : ''}
                                                ${j.telefono ? `<span>· Tel: ${j.telefono}</span>` : ''}
                                            </div>
                                            <div style="font-size: 0.8rem; color: ${j.respuesta === 'voy' ? '#16a34a' : j.respuesta === 'no_voy' ? '#dc2626' : '#92400e'}; margin-top: 6px; font-weight: 700;">
                                                ${j.respuesta === 'voy' ? '✓ VOY' : j.respuesta === 'no_voy' ? '✕ NO VOY' : '⏳ PENDIENTE'}
                                            </div>
                                        </div>
                                        ${puedeEditar ? `
                                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                                <button onclick="adminCambiarAsistencia('${encuentroId}', '${j.jugadorId}', '${usuario.equipoId}', 'voy')" 
                                                    style="padding: 8px 16px; border: none; border-radius: 8px; background: ${j.respuesta === 'voy' ? '#16a34a' : '#dcfce7'}; color: ${j.respuesta === 'voy' ? 'white' : '#166534'}; font-size: 0.85rem; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                                    ✓ VOY
                                                </button>
                                                <button onclick="adminCambiarAsistencia('${encuentroId}', '${j.jugadorId}', '${usuario.equipoId}', 'no_voy')" 
                                                    style="padding: 8px 16px; border: none; border-radius: 8px; background: ${j.respuesta === 'no_voy' ? '#dc2626' : '#fee2e2'}; color: ${j.respuesta === 'no_voy' ? 'white' : '#991b1b'}; font-size: 0.85rem; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                                    ✕ NO
                                                </button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        container.innerHTML = asistenciasHTML || '<p style="color: #64748b; text-align: center; padding: 20px;">No hay datos de asistencias disponibles</p>';
        
    } catch (err) {
        console.error('Error cargando asistencias:', err);
        container.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 20px;">Error al cargar asistencias</p>';
    }
}


// ============================================
// MODAL CREAR ENCUENTRO (COMPLETO - RESPONSIVE)
// ============================================
function nuevoEncuentro() {
    if (document.getElementById('modalEncuentro')) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalEncuentro';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 10px; box-sizing: border-box;';

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 20px; position: relative; animation: slideUpMsg 0.3s ease; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: sticky; top: 0; background: white; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; z-index: 10;">
                <h2 style="margin: 0; color: #1e293b; font-size: clamp(1.2rem, 4vw, 1.5rem);">Crear Nuevo Encuentro</h2>
                <button onclick="cerrarModalEncuentro()" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 24px; color: #64748b; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">×</button>
            </div>

            <form id="formEncuentro" onsubmit="guardarEncuentro(event)">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Flyer del encuentro</label>
                    <div id="flyerPreview" style="width: 100%; height: clamp(150px, 30vw, 200px); background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden; border: 2px dashed #cbd5e1;">
                        <span style="color: #94a3b8; font-size: clamp(0.8rem, 2.5vw, 0.9rem);">Vista previa del flyer</span>
                    </div>
                    <input type="file" id="inputFlyer" accept="image/*" style="display: none;">
                    <input type="hidden" id="flyerUrl" value="">
                    <button type="button" onclick="document.getElementById('inputFlyer').click()" style="width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: clamp(0.85rem, 3vw, 0.95rem);">📤 Subir flyer</button>
                    <p style="color: #64748b; font-size: clamp(10px, 2.5vw, 12px); margin-top: 5px;">Formato recomendado: JPG/PNG, 800x600px</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Nombre del encuentro *</label>
                    <input type="text" id="encNombre" required placeholder="Ej: Encuentro Argentino - Santiago 2026" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: clamp(0.9rem, 3vw, 1rem); box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Tipo de encuentro * (podés elegir varios)</label>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: clamp(0.85rem, 3vw, 0.95rem);">
                            <input type="checkbox" name="encTipo" value="Veteranos +35" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span>Veteranos +35</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: clamp(0.85rem, 3vw, 0.95rem);">
                            <input type="checkbox" name="encTipo" value="Veteranos +50" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span>Veteranos +50</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: clamp(0.85rem, 3vw, 0.95rem);">
                            <input type="checkbox" id="chkOtro" style="width: 18px; height: 18px; flex-shrink: 0;" onchange="toggleOtrosTipos()">
                            <span>Otro (agregar personalizados)</span>
                        </label>
                    </div>
                    <div id="containerOtrosTipos" style="display: none; flex-direction: column; gap: 10px; margin-left: 26px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                        <div style="font-size: clamp(10px, 2.5vw, 12px); color: #64748b; margin-bottom: 5px;">Agregá los tipos que necesites:</div>
                    </div>
                    <button type="button" onclick="agregarOtroTipo()" style="display: none; width: 100%; margin-top: 10px; padding: 10px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: clamp(0.8rem, 3vw, 0.9rem);" id="btnAgregarOtroTipo">+ Agregar otro tipo personalizado</button>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Ubicación del encuentro *</label>
                    <p style="color: #64748b; font-size: clamp(10px, 2.5vw, 12px); margin-bottom: 10px;">📍 Arrastrá el pin rojo para marcar exactamente dónde se juega</p>
                    <div id="mapaEncuentro" style="width: 100%; height: clamp(200px, 40vw, 300px); border-radius: 12px; margin-bottom: 15px; border: 2px solid #e2e8f0; background: #f1f5f9;"></div>
                    <input type="hidden" id="encLat" value="">
                    <input type="hidden" id="encLng" value="">
                    <input type="hidden" id="encPaisId" value="">
                    <input type="hidden" id="encProvinciaId" value="">
                    <input type="hidden" id="encCiudadId" value="">
                    <label style="font-size: clamp(10px, 2.5vw, 12px); color: #64748b; margin-bottom: 5px; display: block;">Dirección completa *</label>
                    <input type="text" id="encDireccion" required placeholder="Calle, número, ciudad, país..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: clamp(0.9rem, 3vw, 1rem); margin-bottom: 10px; box-sizing: border-box;">
                    <div id="encUbicacionInfo" style="display: none; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px; font-size: clamp(10px, 2.5vw, 12px); color: #166534;">
                        ✅ Ubicación confirmada: <span id="encPaisNombre"></span> > <span id="encProvinciaNombre"></span> > <span id="encCiudadNombre"></span>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Cupo máximo de equipos *</label>
                    <input type="number" id="encCupo" min="2" max="50" value="8" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: clamp(0.9rem, 3vw, 1rem); box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Fechas y horarios *</label>
                    <div id="containerFechas" style="display: flex; flex-direction: column; gap: 15px; width: 100%;"></div>
                    <button type="button" onclick="agregarDia()" style="margin-top: 15px; width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: clamp(0.85rem, 3vw, 0.95rem);">+ Agregar día</button>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Valores / Opciones de inscripción *</label>
                    <div id="containerValores" style="display: flex; flex-direction: column; gap: 10px; width: 100%;"></div>
                    <button type="button" onclick="agregarValor()" style="margin-top: 15px; width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: clamp(0.85rem, 3vw, 0.95rem);">+ Agregar opción de valor</button>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: clamp(0.9rem, 3vw, 1rem);">Descripción general</label>
                    <textarea id="encDescripcion" rows="3" placeholder="Información adicional, Fechas limites y formas de pago etc.. Menú 3er tiempo, todo lo que consideres necesario" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: clamp(0.9rem, 3vw, 1rem); resize: vertical; box-sizing: border-box;"></textarea>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 25px; flex-wrap: wrap;">
                    <button type="button" onclick="cerrarModalEncuentro()" style="flex: 1; min-width: 100px; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: clamp(0.85rem, 3vw, 1rem);">Cancelar</button>
                    <button type="submit" style="flex: 2; min-width: 150px; padding: 12px; background: #4f46e5; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: clamp(0.85rem, 3vw, 1rem);" id="btnGuardarEncuentro">Crear encuentro</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => initMapaEncuentro(), 100);
    
    agregarDia();
    agregarValor();
    
    document.getElementById('inputFlyer').addEventListener('change', subirFlyerOptimizado);
}
                    
// ============================================
// FUNCIONES AUXILIARES DEL MODAL
// ============================================
function toggleOtrosTipos() {
    const chkOtro = document.getElementById('chkOtro');
    const container = document.getElementById('containerOtrosTipos');
    const btnAgregar = document.getElementById('btnAgregarOtroTipo');
    
    if (chkOtro.checked) {
        container.style.display = 'flex';
        btnAgregar.style.display = 'block';
        if (container.children.length <= 1) {
            agregarOtroTipo();
        }
    } else {
        container.style.display = 'none';
        btnAgregar.style.display = 'none';
        container.querySelectorAll('.otro-tipo-input').forEach(input => input.parentElement.remove());
    }
}

function agregarOtroTipo() {
    const container = document.getElementById('containerOtrosTipos');
    const index = container.querySelectorAll('.otro-tipo-input').length + 1;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="otro-tipo-input" placeholder="Especificar tipo ${index}" required style="flex: 1; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 20px; padding: 5px;">×</button>
    `;
    
    container.appendChild(div);
}

let mapaEncuentro, markerEncuentro;

function initMapaEncuentro() {
    const defaultLat = -34.6037;
    const defaultLng = -58.3816;
    
    mapaEncuentro = L.map('mapaEncuentro').setView([defaultLat, defaultLng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapaEncuentro);
    
    markerEncuentro = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(mapaEncuentro);
    
    markerEncuentro.on('dragend', async function() {
        const pos = markerEncuentro.getLatLng();
        await actualizarUbicacionEncuentro(pos.lat, pos.lng);
    });
    
    mapaEncuentro.on('click', async function(e) {
        markerEncuentro.setLatLng(e.latlng);
        await actualizarUbicacionEncuentro(e.latlng.lat, e.latlng.lng);
    });
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                mapaEncuentro.setView([lat, lng], 13);
                markerEncuentro.setLatLng([lat, lng]);
                actualizarUbicacionEncuentro(lat, lng);
            },
            () => actualizarUbicacionEncuentro(defaultLat, defaultLng)
        );
    } else {
        actualizarUbicacionEncuentro(defaultLat, defaultLng);
    }
}

async function actualizarUbicacionEncuentro(lat, lng) {
    document.getElementById('encLat').value = lat;
    document.getElementById('encLng').value = lng;
    
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
            document.getElementById('encDireccion').value = direccionCompleta;
            
            document.getElementById('encPaisId').value = addr.country_code || '';
            document.getElementById('encProvinciaId').value = addr.state || addr.province || '';
            document.getElementById('encCiudadId').value = addr.city || addr.town || addr.village || '';
            
            document.getElementById('encPaisNombre').textContent = addr.country || 'Desconocido';
            document.getElementById('encProvinciaNombre').textContent = addr.state || addr.province || '';
            document.getElementById('encCiudadNombre').textContent = addr.city || addr.town || addr.village || '';
            document.getElementById('encUbicacionInfo').style.display = 'block';
        }
    } catch (err) {
        console.error('Error obteniendo ubicación:', err);
    }
}

function agregarDia() {
    const container = document.getElementById('containerFechas');
    const index = container.children.length;
    
    const diaDiv = document.createElement('div');
    diaDiv.style.cssText = 'background: #f8fafc; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0;';
    diaDiv.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;">
            <input type="date" class="dia-fecha" required style="flex: 1; min-width: 140px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
            <button type="button" onclick="this.parentElement.parentElement.remove()" style="padding: 8px 12px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
        </div>
        <div class="horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;"></div>
        <button type="button" onclick="agregarHorario(this)" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer;">+ Agregar horario</button>
    `;
    
    container.appendChild(diaDiv);
    agregarHorario(diaDiv.querySelector('button[onclick="agregarHorario(this)"]'));
}

function agregarHorario(btn) {
    const horariosContainer = btn.previousElementSibling;
    
    const horarioDiv = document.createElement('div');
    horarioDiv.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';
    horarioDiv.innerHTML = `
        <input type="time" class="horario-hora" required style="width: 100px; min-width: 80px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
        <input type="text" class="horario-desc" placeholder="Descripción (ej: Acreditación)" required style="flex: 1; min-width: 150px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px; flex-shrink: 0;">×</button>
    `;
    
    horariosContainer.appendChild(horarioDiv);
}

function agregarValor() {
    const container = document.getElementById('containerValores');
    
    const valorDiv = document.createElement('div');
    valorDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;';
    valorDiv.innerHTML = `
        <input type="text" class="valor-titulo" placeholder="Título (ej: Completo)" required style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <input type="number" class="valor-precio" placeholder="$" min="0" required style="flex: 0 0 100px; min-width: 80px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <input type="text" class="valor-desc" placeholder="Descripción opcional" style="flex: 2; min-width: 150px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <button type="button" onclick="this.parentElement.remove()" style="padding: 6px 10px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
    `;
    
    container.appendChild(valorDiv);
}
// ============================================
// SUBIR FLYER Y GUARDAR ENCUENTRO
// ============================================
async function subirFlyerOptimizado() {
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
    
    const btnGuardar = document.getElementById('btnGuardarEncuentro');
    const originalText = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle;"></span>Subiendo...';
    
    try {
        const response = await fetch('https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('flyerUrl').value = result.data.url;
            mostrarMensajeEncuentros('Flyer subido correctamente', 'success');
        } else {
            throw new Error('Error en respuesta');
        }
    } catch (err) {
        mostrarMensajeEncuentros('Error al subir flyer', 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = originalText;
    }
}

async function guardarEncuentro(e) {
    e.preventDefault();
    
    const btnGuardar = document.getElementById('btnGuardarEncuentro');
    if (btnGuardar.disabled) return;
    
    if (!document.getElementById('encLat').value || !document.getElementById('encLng').value) {
        mostrarMensajeEncuentros('⚠️ Por favor marcá la ubicación en el mapa', 'error');
        return;
    }
    
    const tiposSeleccionados = [];
    document.querySelectorAll('input[name="encTipo"]:checked').forEach(cb => {
        tiposSeleccionados.push(cb.value);
    });
    document.querySelectorAll('.otro-tipo-input').forEach(input => {
        if (input.value.trim()) tiposSeleccionados.push(input.value.trim());
    });
    
    if (tiposSeleccionados.length === 0) {
        mostrarMensajeEncuentros('Debes seleccionar al menos un tipo de encuentro', 'error');
        return;
    }
    
    const fechas = [];
    document.querySelectorAll('#containerFechas > div').forEach(dia => {
        const fechaInput = dia.querySelector('.dia-fecha');
        if (!fechaInput?.value) return;
        
        const horarios = [];
        dia.querySelectorAll('.horarios-container > div').forEach(h => {
            const hora = h.querySelector('.horario-hora')?.value;
            const desc = h.querySelector('.horario-desc')?.value;
            if (hora && desc) horarios.push({ hora, desc });
        });
        
        // Guardar solo la fecha sin hora ni timezone para evitar desfase
        fechas.push({ 
            dia: fechaInput.value, // YYYY-MM-DD puro
            horarios 
        });
    }); // ← FALTABA ESTE CIERRE
    
    if (fechas.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una fecha', 'error');
        return;
    }
    
    const valores = [];
    document.querySelectorAll('#containerValores > div').forEach(v => {
        const titulo = v.querySelector('.valor-titulo')?.value;
        const precio = v.querySelector('.valor-precio')?.value;
        const desc = v.querySelector('.valor-desc')?.value || '';
        if (titulo && precio) valores.push({ titulo, precio: parseFloat(precio), desc });
    });
    
    if (valores.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una opción de valor', 'error');
        return;
    }
    
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Creando encuentro...';
    btnGuardar.style.opacity = '0.7';
    
    LoadingManager.show('guardar', 'Guardando encuentro...');
    
    const usuario = obtenerUsuarioActual();
    const params = new URLSearchParams({
        action: 'crearEncuentro',
        equipoCreadorId: usuario.equipoId,
        creadorNombre: usuario.nombreEquipo || usuario.equipoNombre || 'Equipo',
        nombre: document.getElementById('encNombre').value,
        flyerUrl: document.getElementById('flyerUrl').value || '',
        fechasJSON: JSON.stringify(fechas),
        valoresJSON: JSON.stringify(valores),
        cupoMaximo: document.getElementById('encCupo').value,
        lugar: document.getElementById('encDireccion').value,
        lat: document.getElementById('encLat').value,
        lng: document.getElementById('encLng').value,
        paisId: document.getElementById('encPaisId').value,
        provinciaId: document.getElementById('encProvinciaId').value,
        ciudadId: document.getElementById('encCiudadId').value,
        tipo: tiposSeleccionados.join(', '),
        descripcion: document.getElementById('encDescripcion').value,
        estado: 'publicado'
    });
    
    try {
        // ✅ CORREGIDO: eliminado 'async' antes de const
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            cerrarModalEncuentro();
            mostrarMensajeEncuentros('Encuentro creado correctamente', 'success');
            CacheManager.invalidateAll();
            renderizarMisEncuentros();
        } else {
            throw new Error(result.error || 'Error al crear');
        }
    } catch (err) {
        mostrarMensajeEncuentros(err.message || 'Error al crear encuentro', 'error');
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Creando encuentro...';
        btnGuardar.style.opacity = '1';
    } finally {
        LoadingManager.hide('guardar');
    }
}
function cerrarModalEncuentro() {
    const modal = document.getElementById('modalEncuentro');
    if (modal) modal.remove();
    if (mapaEncuentro) {
        mapaEncuentro.remove();
        mapaEncuentro = null;
    }
    LoadingManager.hideAll();

}

// ============================================
// PARTE 4: EDITAR, CANCELAR, COMPARTIR Y FUNCIONES RESTANTES
// ============================================

// ============================================
// EDITAR ENCUENTRO (COMPLETO)
// ============================================
async function editarEncuentro(encuentroId) {
    LoadingManager.show('editar', 'Cargando datos...');
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentroById&id=${encuentroId}`);
        
        if (!result.success) {
            mostrarMensajeEncuentros('Encuentro no encontrado', 'error');
            return;
        }
        
        const enc = result.data;
        const usuario = obtenerUsuarioActual();
        
        // Verificar que sea el creador
        const encCheck = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentros&equipoId=${usuario.equipoId}`);
        const esCreador = encCheck.data && encCheck.data.some(e => e.id === encuentroId);
        
        if (!esCreador) {
            mostrarMensajeEncuentros('Solo el creador puede editar este encuentro', 'error');
            return;
        }

        let fechas = [], valores = [];
        try {
            fechas = JSON.parse(enc.fechasJSON || '[]');
            valores = JSON.parse(enc.valoresJSON || '[]');
        } catch(e) { console.error('Error parseando JSON:', e); }

        const tiposArray = enc.tipo ? enc.tipo.split(', ').map(t => t.trim()) : [];
        const tiposPredefinidos = ['Veteranos +35', 'Veteranos +50'];
        const tiposSeleccionados = tiposArray.filter(t => tiposPredefinidos.includes(t));
        const tiposPersonalizados = tiposArray.filter(t => !tiposPredefinidos.includes(t));

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalEditarEncuentro';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; box-sizing: border-box;';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 30px; position: relative; animation: slideUpMsg 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; position: sticky; top: 0; background: white; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; z-index: 10;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 1.5rem;">Editar Encuentro</h2>
                    <button onclick="document.getElementById('modalEditarEncuentro').remove()" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 24px; color: #64748b; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                
                <form id="formEditarEncuentro" onsubmit="guardarEdicionEncuentro(event, '${encuentroId}')">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Flyer del encuentro</label>
                        <div id="editFlyerPreview" style="width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden; border: 2px dashed #cbd5e1;">
                            ${enc.flyerUrl ? `<img src="${enc.flyerUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="color: #94a3b8;">Sin flyer</span>'}
                        </div>
                        <input type="file" id="editInputFlyer" accept="image/*" style="display: none;">
                        <input type="hidden" id="editFlyerUrl" value="${enc.flyerUrl || ''}">
                        <button type="button" onclick="document.getElementById('editInputFlyer').click()" style="width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600;">📤 Cambiar flyer</button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Nombre del encuentro *</label>
                        <input type="text" id="editNombre" required value="${enc.nombre || ''}" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Tipo de encuentro * (podés elegir varios)</label>
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
                                    <input type="text" class="editOtro-tipo-input" value="${tipo}" placeholder="Tipo personalizado ${index + 1}" style="flex: 1; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                                    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 20px; padding: 5px;">×</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="agregarEditOtroTipo()" style="display: ${tiposPersonalizados.length > 0 ? 'block' : 'none'}; width: 100%; margin-top: 10px; padding: 10px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 0.9rem;" id="editBtnAgregarOtroTipo">+ Agregar otro tipo personalizado</button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Ubicación del encuentro *</label>
                        <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">📍 Arrastrá el pin rojo para marcar exactamente dónde se juega</p>
                        <div id="editMapaEncuentro" style="width: 100%; height: 300px; border-radius: 12px; margin-bottom: 15px; border: 2px solid #e2e8f0; background: #f1f5f9;"></div>
                        <input type="hidden" id="editLat" value="${enc.lat || ''}">
                        <input type="hidden" id="editLng" value="${enc.lng || ''}">
                        <input type="hidden" id="editPaisId" value="${enc.paisId || ''}">
                        <input type="hidden" id="editProvinciaId" value="${enc.provinciaId || ''}">
                        <input type="hidden" id="editCiudadId" value="${enc.ciudadId || ''}">
                        <label style="font-size: 12px; color: #64748b; margin-bottom: 5px; display: block;">Dirección completa *</label>
                        <input type="text" id="editDireccion" required value="${enc.lugar || ''}" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; margin-bottom: 10px; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Cupo máximo de equipos *</label>
                        <input type="number" id="editCupo" min="2" max="50" required value="${enc.cupoMaximo || 8}" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Fechas y horarios *</label>
                        <div id="editContainerFechas" style="display: flex; flex-direction: column; gap: 15px;">
                            ${fechas.length > 0 ? fechas.map((f, idx) => `
                                <div class="edit-dia-item" style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0;">
                                    <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;">
    <input type="date" class="edit-dia-fecha" required value="${f.dia}" style="flex: 1; min-width: 140px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
    <button type="button" onclick="this.closest('.edit-dia-item').remove()" style="padding: 8px 12px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
</div>
                                    <div class="edit-horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;">
                                        ${f.horarios?.map(h => `
                                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
    <input type="time" class="edit-horario-hora" required value="${h.hora}" style="width: 100px; min-width: 80px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
    <input type="text" class="edit-horario-desc" placeholder="Descripción" required value="${h.desc}" style="flex: 1; min-width: 150px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px; flex-shrink: 0;">×</button>
</div>
                                        `).join('') || ''}
                                    </div>
                                    <button type="button" onclick="agregarEditHorario(this)" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer;">+ Agregar horario</button>
                                </div>
                            `).join('') : ''}
                        </div>
                        <button type="button" onclick="agregarEditDia()" style="margin-top: 15px; width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600;">+ Agregar día</button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Valores / Opciones de inscripción *</label>
                        <div id="editContainerValores" style="display: flex; flex-direction: column; gap: 10px;">
                            ${valores.length > 0 ? valores.map(v => `
                                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;">
    <input type="text" class="edit-valor-titulo" placeholder="Título" required value="${v.titulo}" style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
    <input type="number" class="edit-valor-precio" placeholder="$" min="0" required value="${v.precio}" style="flex: 0 0 100px; min-width: 80px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
    <input type="text" class="edit-valor-desc" placeholder="Descripción opcional" value="${v.desc || ''}" style="flex: 2; min-width: 150px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
    <button type="button" onclick="this.parentElement.remove()" style="padding: 6px 10px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
</div>
                            `).join('') : ''}
                        </div>
                        <button type="button" onclick="agregarEditValor()" style="margin-top: 15px; width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600;">+ Agregar opción de valor</button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Descripción general</label>
                        <textarea id="editDescripcion" rows="3" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; resize: vertical; box-sizing: border-box;">${enc.descripcion || ''}</textarea>
                    </div>

                    <div style="display: flex; gap: 15px; margin-top: 25px;">
                        <button type="button" onclick="document.getElementById('modalEditarEncuentro').remove()" style="flex: 1; padding: 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 1rem;">Cancelar</button>
                        <button type="submit" style="flex: 2; padding: 12px; background: #4f46e5; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 1rem;" id="btnGuardarEdicion">Guardar cambios</button>
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
            
            const btn = document.getElementById('btnGuardarEdicion');
            btn.disabled = true;
            btn.textContent = 'Subiendo...';
            
            try {
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
                btn.disabled = false;
                btn.textContent = 'Guardar cambios';
            }
        });
        
    } catch (err) {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error al cargar encuentro', 'error');
    } finally {
        LoadingManager.hide('editar');
    }
}

// ============================================
// FUNCIONES AUXILIARES EDICIÓN
// ============================================
function toggleEditOtrosTipos() {
    const chkOtro = document.getElementById('editChkOtro');
    const container = document.getElementById('editContainerOtrosTipos');
    const btnAgregar = document.getElementById('editBtnAgregarOtroTipo');
    
    if (chkOtro.checked) {
        container.style.display = 'flex';
        btnAgregar.style.display = 'block';
        if (container.children.length <= 1) agregarEditOtroTipo();
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
        <input type="text" class="editOtro-tipo-input" placeholder="Especificar tipo ${index}" style="flex: 1; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 20px; padding: 5px;">×</button>
    `;
    
    container.appendChild(div);
}

let editMapaEncuentro, editMarkerEncuentro;

function initEditMapaEncuentro(latExistente, lngExistente) {
    const lat = parseFloat(latExistente) || -34.6037;
    const lng = parseFloat(lngExistente) || -58.3816;
    
    editMapaEncuentro = L.map('editMapaEncuentro').setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(editMapaEncuentro);
    
    editMarkerEncuentro = L.marker([lat, lng], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })
    }).addTo(editMapaEncuentro);
    
    editMarkerEncuentro.on('dragend', async function() {
        const pos = editMarkerEncuentro.getLatLng();
        await actualizarEditUbicacion(pos.lat, pos.lng);
    });
    
    editMapaEncuentro.on('click', async function(e) {
        editMarkerEncuentro.setLatLng(e.latlng);
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
        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;">
            <input type="date" class="edit-dia-fecha" required style="flex: 1; min-width: 140px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
            <button type="button" onclick="this.closest('.edit-dia-item').remove()" style="padding: 8px 12px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
        </div>
        <div class="edit-horarios-container" style="display: flex; flex-direction: column; gap: 8px; margin-left: 10px; padding-left: 15px; border-left: 3px solid #cbd5e1;"></div>
        <button type="button" onclick="agregarEditHorario(this)" style="margin-top: 10px; margin-left: 10px; font-size: 12px; padding: 6px 12px; background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer;">+ Agregar horario</button>
    `;
    
    container.appendChild(diaDiv);
    agregarEditHorario(diaDiv.querySelector('button[onclick="agregarEditHorario(this)"]'));
}

function agregarEditHorario(btn) {
    const horariosContainer = btn.previousElementSibling;
    
    const horarioDiv = document.createElement('div');
    horarioDiv.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';
    horarioDiv.innerHTML = `
        <input type="time" class="edit-horario-hora" required style="width: 100px; min-width: 80px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
        <input type="text" class="edit-horario-desc" placeholder="Descripción (ej: Acreditación)" required style="flex: 1; min-width: 150px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px; flex-shrink: 0;">×</button>
    `;
    
    horariosContainer.appendChild(horarioDiv);
}

function agregarEditValor() {
    const container = document.getElementById('editContainerValores');
    
    const valorDiv = document.createElement('div');
    valorDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0;';
    valorDiv.innerHTML = `
        <input type="text" class="edit-valor-titulo" placeholder="Título (ej: Completo)" required style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <input type="number" class="edit-valor-precio" placeholder="$" min="0" required style="flex: 0 0 100px; min-width: 80px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <input type="text" class="edit-valor-desc" placeholder="Descripción opcional" style="flex: 2; min-width: 150px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
        <button type="button" onclick="this.parentElement.remove()" style="padding: 6px 10px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;">✕</button>
    `;
    
    container.appendChild(valorDiv);
}
async function guardarEdicionEncuentro(e, encuentroId) {
    e.preventDefault();
    
    const lat = document.getElementById('editLat')?.value;
    const lng = document.getElementById('editLng')?.value;
    
    if (!lat || !lng) {
        mostrarMensajeEncuentros('⚠️ Por favor marcá la ubicación en el mapa', 'error');
        return;
    }
    
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
        
        // Guardar solo la fecha sin hora ni timezone para evitar desfase
        fechas.push({ 
            dia: fechaInput.value, // YYYY-MM-DD puro
            horarios 
        });
    }); // ← FALTABA ESTE CIERRE DEL forEach
    
    if (fechas.length === 0) {
        mostrarMensajeEncuentros('Debes agregar al menos una fecha', 'error');
        return;
    }
    
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
    
    LoadingManager.show('guardar-edicion', 'Guardando cambios...');
    
    const usuario = obtenerUsuarioActual();
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
        const url = `${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`;
        const result = await fetchWithRetry(url);
        
        if (result.success) {
            document.getElementById('modalEditarEncuentro')?.remove();
            mostrarMensajeEncuentros('Encuentro actualizado correctamente', 'success');
            CacheManager.invalidate(`encuentros-${usuario.equipoId}`);
            renderizarMisEncuentros();
        } else {
            throw new Error(result.error || 'Error al actualizar');
        }
    } catch (err) {
        mostrarMensajeEncuentros(err.message || 'Error al actualizar', 'error');
    } finally {
        LoadingManager.hide('guardar-edicion');
    }
}
// ============================================
// CANCELAR ENCUENTRO
// ============================================
async function cancelarEncuentro(encuentroId) {
    if (!confirm('¿Seguro que querés cancelar este encuentro?\n\nEl encuentro seguirá visible pero marcado como cancelado.')) {
        return;
    }
    
    LoadingManager.show('cancelar', 'Cancelando encuentro...');
    
    const usuario = obtenerUsuarioActual();
    const params = new URLSearchParams({
        action: 'cancelarEncuentro',
        encuentroId: encuentroId,
        equipoId: usuario.equipoId
    });
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            mostrarMensajeEncuentros('Encuentro cancelado', 'success');
            CacheManager.invalidate(`encuentros-${usuario.equipoId}`);
            renderizarMisEncuentros();
        } else {
            throw new Error(result.error || 'Error al cancelar');
        }
    } catch (err) {
        mostrarMensajeEncuentros(err.message || 'Error al cancelar', 'error');
    } finally {
        LoadingManager.hide('cancelar');
    }
}

// ============================================
// COMPARTIR ENCUENTRO
// ============================================
function compartirEncuentro(id) {
    fetch(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentroById&id=${id}`)
        .then(response => response.json())
        .then(result => {
            if (!result.success || !result.data) {
                mostrarMensajeEncuentros('Error al cargar datos del encuentro', 'error');
                return;
            }
            
            const enc = result.data;
            let fechas = [];
            try {
                fechas = JSON.parse(enc.fechasJSON || '[]');
            } catch(e) { fechas = []; }
            
            const fechasTexto = fechas.map(f => {
                const fechaFormateada = formatearFecha(f.dia);
                const horariosTexto = f.horarios?.map(h => `   ${h.hora}hs - ${h.desc}`).join('\n') || '';
                return `📅 ${fechaFormateada}\n${horariosTexto}`;
            }).join('\n\n');
            
            const linkEncuentro = `https://arvetrugby.com/preview.html?action=getEncuentroById&id=${id}`;
            
            let mensaje = `🏉 *${enc.nombre}*\n\n`;
            mensaje += `${fechasTexto}\n\n`;
            mensaje += `📍 ${enc.lugar || 'Ubicación a confirmar'}\n`;
            mensaje += `👥 Cupo: ${enc.cupoMaximo} equipos\n`;
            mensaje += `🏉 Organiza: ${enc.creadorNombre || 'Equipo organizador'}\n`;
            
            if (enc.descripcion) {
                mensaje += `\n📝 ${enc.descripcion.substring(0, 100)}${enc.descripcion.length > 100 ? '...' : ''}\n`;
            }
            
            mensaje += `\n🔗 ${linkEncuentro}`;
            
            return navigator.clipboard.writeText(mensaje);
        })
        .then(() => {
            mostrarMensajeEncuentros('✅ Mensaje copiado. Pegalo en WhatsApp!', 'success');
        })
        .catch(err => {
            console.error('Error:', err);
            mostrarMensajeEncuentros('No se pudo copiar el mensaje', 'error');
        });
}

// ============================================
// ASISTENCIAS DE JUGADORES
// ============================================
async function guardarAsistencia(encuentroId, respuesta) {
    const usuario = obtenerUsuarioActual();
    
    LoadingManager.show('asistencia', 'Guardando...');
    
    const params = new URLSearchParams({
        action: 'guardarAsistenciaJugador',
        encuentroId: encuentroId,
        jugadorId: usuario.id,
        jugadorNombre: usuario.nombre,
        equipoId: usuario.equipoId,
        respuesta: respuesta
    });
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            mostrarMensajeEncuentros(`Confirmado: ${respuesta === 'voy' ? 'VOY ✓' : 'NO VOY ✕'}`, 'success');
            
            // Recargar panel si existe
            const panelContainer = document.getElementById('panelJugadorEncuentros');
            if (panelContainer && typeof cargarEncuentrosParaJugador === 'function') {
                setTimeout(() => {
                    cargarEncuentrosParaJugador(usuario.equipoId, usuario.id, 'panelJugadorEncuentros');
                }, 300);
            }
        } else {
            throw new Error(result.error || 'Error al guardar');
        }
    } catch (err) {
        mostrarMensajeEncuentros(err.message || 'Error de conexión', 'error');
    } finally {
        LoadingManager.hide('asistencia');
    }
}

async function adminCambiarAsistencia(encuentroId, jugadorId, equipoId, respuesta) {
    const usuario = obtenerUsuarioActual();
    
    LoadingManager.show('admin-asistencia', 'Actualizando...');
    
    const params = new URLSearchParams({
        action: 'adminEditarAsistencia',
        encuentroId: encuentroId,
        jugadorId: jugadorId,
        equipoId: equipoId,
        respuesta: respuesta,
        adminId: usuario.id
    });
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?${params.toString()}`);
        
        if (result.success) {
            mostrarMensajeEncuentros('Asistencia actualizada', 'success');
            verDetalleEncuentro(encuentroId);
        } else {
            throw new Error(result.error || 'Error al actualizar');
        }
    } catch (err) {
        mostrarMensajeEncuentros(err.message || 'Error de conexión', 'error');
    } finally {
        LoadingManager.hide('admin-asistencia');
    }
}

// ============================================
// DESCARGAR CSV
// ============================================
function descargarAsistenciasCompletasCSV(encuentroId) {
    const usuario = obtenerUsuarioActual();
    
    LoadingManager.show('descargar', 'Generando CSV...');
    
    // Necesitamos el detalle para saber qué equipos aceptaron
    Promise.all([
        fetch(`${ENCUENTROS_CONFIG.API_URL}?action=getAsistenciasCompletasCreador&encuentroId=${encuentroId}&equipoCreadorId=${usuario.equipoId}`).then(r => r.json()),
        fetch(`${ENCUENTROS_CONFIG.API_URL}?action=getDetalleEncuentroCompleto&encuentroId=${encuentroId}`).then(r => r.json())
    ])
    .then(([asistenciasResult, detalleResult]) => {
        if (!asistenciasResult.success) {
            mostrarMensajeEncuentros('Error al cargar datos', 'error');
            return;
        }
        
        // 🔧 FILTRAR: Solo equipos que aceptaron este encuentro
        const equiposAceptadosIds = detalleResult.success 
            ? detalleResult.data.aceptados?.map(eq => eq.id) || []
            : [];
        
        // 🔧 FILTRAR: Solo jugadores con respuesta "voy"
        let csv = 'Equipo,Nombre,Apellido,DNI,CUIT/CUIL,Email,Teléfono,Fecha Nacimiento\n';
        let totalVoy = 0;
        
        asistenciasResult.data.forEach(eq => {
            // Solo procesar si el equipo está en la lista de aceptados
            if (!equiposAceptadosIds.includes(eq.equipoId)) return;
            
            eq.jugadores.forEach(j => {
                // Solo incluir si dijo "voy"
                if (j.respuesta !== 'voy') return;
                
                totalVoy++;
                csv += `"${eq.equipoNombre}","${j.nombre}","${j.apellido}","${j.dni || ''}","${j.cuitCuil || ''}","${j.email || ''}","${j.telefono || ''}","${j.fechaNacimiento || ''}"\n`;
            });
        });
        
        if (totalVoy === 0) {
            mostrarMensajeEncuentros('No hay jugadores confirmados todavía', 'info');
            return;
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asistencias_confirmadas_${encuentroId}.csv`;
        link.click();
        
        mostrarMensajeEncuentros(`CSV descargado: ${totalVoy} jugadores confirmados`, 'success');
    })
    .catch(err => {
        console.error('Error:', err);
        mostrarMensajeEncuentros('Error al descargar', 'error');
    })
    .finally(() => {
        LoadingManager.hide('descargar');
    });
}
// ============================================
// CARGAR ENCUENTROS PARA JUGADOR (PANEL)
// ============================================
async function cargarEncuentrosParaJugador(equipoId, jugadorId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = SkeletonUI.grid(2);
    
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentrosParaJugador&equipoId=${equipoId}&jugadorId=${jugadorId}`);
        
        if (!result.success || !result.data || result.data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🏉</div>
                    <h3>No tenés encuentros pendientes</h3>
                    <p>Cuando tu equipo acepte una invitación, aparecerá aquí.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = result.data.map(enc => {
            let fechas = [];
            try {
                fechas = JSON.parse(enc.fechasJSON || '[]');
            } catch(e) { fechas = []; }
            
            const fechaPrincipal = fechas[0] ? formatearFecha(fechas[0].dia) : 'Fecha a confirmar';
            const horarioPrincipal = fechas[0]?.horarios?.[0]?.hora || '';
            
            let estadoHTML = '';
            let botonesHTML = '';
            
            if (enc.miRespuesta === 'voy') {
                estadoHTML = `<span style="background: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-weight: 600;">✓ VOY</span>`;
                botonesHTML = `
                    <button onclick="guardarAsistencia('${enc.id}', 'no_voy')" style="flex: 1; padding: 12px; border: 2px solid #fee2e2; border-radius: 8px; background: white; color: #991b1b; font-weight: 600; cursor: pointer;">Cambiar a NO VOY</button>
                `;
            } else if (enc.miRespuesta === 'no_voy') {
                estadoHTML = `<span style="background: #fee2e2; color: #991b1b; padding: 6px 16px; border-radius: 20px; font-weight: 600;">✕ NO VOY</span>`;
                botonesHTML = `
                    <button onclick="guardarAsistencia('${enc.id}', 'voy')" style="flex: 1; padding: 12px; border: 2px solid #dcfce7; border-radius: 8px; background: white; color: #166534; font-weight: 600; cursor: pointer;">Cambiar a VOY</button>
                `;
            } else {
                estadoHTML = `<span style="background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-weight: 600;">⏳ PENDIENTE</span>`;
                botonesHTML = `
                    <button onclick="guardarAsistencia('${enc.id}', 'voy')" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #16a34a; color: white; font-weight: 600; cursor: pointer;">✓ VOY</button>
                    <button onclick="guardarAsistencia('${enc.id}', 'no_voy')" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #dc2626; color: white; font-weight: 600; cursor: pointer;">✕ NO VOY</button>
                `;
            }
            
            return `
                <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: #1e293b; font-size: 1.2rem;">${enc.nombre}</h3>
                            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                                📅 ${fechaPrincipal} ${horarioPrincipal ? `• ${horarioPrincipal}hs` : ''}
                            </p>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">
                                Organiza: ${enc.creadorNombre}
                            </p>
                        </div>
                        ${estadoHTML}
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                            📍 ${enc.lugar || 'Ubicación a confirmar'}
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        ${botonesHTML}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error cargando encuentros del jugador:', err);
        container.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 20px;">Error al cargar encuentros</p>';
    }
}

// ============================================
// FLYERS PÚBLICOS
// ============================================
function cargarFlyersEncuentrosPublicos(contenedorId = 'galeriaFlyers') {
    const container = document.getElementById(contenedorId);
    if (!container) return;
    
    container.innerHTML = '<div class="skeleton-encuentros" style="height: 200px; width: 100%;"></div>';
    
    const cacheKey = 'flyers-publicos';
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
        renderizarFlyers(cached, container);
        fetchFreshFlyers(container, cacheKey);
        return;
    }
    
    fetchFreshFlyers(container, cacheKey);
}

async function fetchFreshFlyers(container, cacheKey) {
    try {
        const result = await fetchWithRetry(`${ENCUENTROS_CONFIG.API_URL}?action=getEncuentrosPublicos`);
        
        if (!result.success || !result.data) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No hay encuentros disponibles</p>';
            return;
        }
        
        const encuentrosConFlyer = result.data.filter(enc => 
            enc.flyerUrl && enc.flyerUrl.trim() !== '' && enc.flyerUrl !== 'null'
        );
        
        CacheManager.set(cacheKey, encuentrosConFlyer);
        renderizarFlyers(encuentrosConFlyer, container);
        
    } catch (error) {
        console.error('Error cargando flyers:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 40px;">Error al cargar imágenes</p>';
    }
}

function renderizarFlyers(encuentros, container) {
    if (encuentros.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No hay imágenes disponibles</p>';
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${encuentros.map(enc => `
                <div class="flyer-item" data-encuentro-id="${enc.id}" style="cursor: pointer; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <img data-src="${enc.flyerUrl}" 
                         alt="${enc.nombre}" 
                         class="lazy-img"
                         style="width: 100%; height: 300px; object-fit: cover; display: block;"
                         onerror="this.style.display='none'; this.parentElement.style.display='none';">
                    <div style="padding: 15px; background: white;">
                        <h4 style="margin: 0; color: #1e293b; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${enc.nombre}</h4>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    setupLazyLoading(container);
    
    // Event delegation
    container.querySelectorAll('.flyer-item').forEach(item => {
        item.addEventListener('click', function() {
            const encuentroId = this.dataset.encuentroId;
            verDetalleEncuentro(encuentroId);
        });
    });
}

// ============================================
// UTILIDADES FINALES
// ============================================
function obtenerUsuarioActual() {
    const stored = localStorage.getItem('arvet_user');
    if (stored) {
        const parsed = JSON.parse(stored);
        return {
            ...parsed,
            equipoNombre: parsed.equipoNombre || parsed.nombre || 'Equipo'
        };
    }
    return {
        id: "usr_123",
        nombre: "Admin",
        equipoId: "eq_tigres",
        equipoNombre: "Tigres RC",
        rol: "admin"
    };
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';

    // Evita el problema de zona horaria
    const [anio, mes, dia] = fechaStr.split('-');
    const fecha = new Date(anio, mes - 1, dia); // LOCAL (clave)

    return fecha.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short'
    });
}
function usuarioLogueado() {
    return !!localStorage.getItem('arvet_user');
}

function mostrarPreviewEncuentro(encuentroId) {
    // Redirigir a preview o mostrar modal de login
    window.location.href = `preview.html?encuentroId=${encuentroId}`;
}
// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.showEncuentrosTab = showEncuentrosTab;
window.nuevoEncuentro = nuevoEncuentro;
window.cerrarModalEncuentro = cerrarModalEncuentro;
window.toggleOtrosTipos = toggleOtrosTipos;
window.agregarOtroTipo = agregarOtroTipo;
window.agregarDia = agregarDia;
window.agregarHorario = agregarHorario;
window.agregarValor = agregarValor;
window.guardarEncuentro = guardarEncuentro;
window.renderizarMisEncuentros = renderizarMisEncuentros;
window.renderizarInvitaciones = renderizarInvitaciones;
window.verDetalleEncuentro = verDetalleEncuentro;
window.aceptarInvitacion = aceptarInvitacion;
window.rechazarInvitacion = rechazarInvitacion;
window.editarEncuentro = editarEncuentro;
window.cancelarEncuentro = cancelarEncuentro;
window.compartirEncuentro = compartirEncuentro;
window.guardarAsistencia = guardarAsistencia;
window.adminCambiarAsistencia = adminCambiarAsistencia;
window.descargarAsistenciasCompletasCSV = descargarAsistenciasCompletasCSV;
window.cargarFlyersEncuentrosPublicos = cargarFlyersEncuentrosPublicos;
window.cargarEncuentrosParaJugador = cargarEncuentrosParaJugador;
window.cargarMapaInline = cargarMapaInline;
window.toggleEditOtrosTipos = toggleEditOtrosTipos;
window.agregarEditOtroTipo = agregarEditOtroTipo;
window.agregarEditDia = agregarEditDia;
window.agregarEditHorario = agregarEditHorario;
window.agregarEditValor = agregarEditValor;
window.guardarEdicionEncuentro = guardarEdicionEncuentro;

