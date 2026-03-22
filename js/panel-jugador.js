document.addEventListener('DOMContentLoaded', async function() {
  
  console.log('🚀 Panel de jugador iniciando...');
  
  if (typeof API_URL === 'undefined') {
    alert('❌ Error: API_URL no configurado');
    return;
  }
  
  // ==========================================
  // SESIÓN
  // ==========================================
  const adminEditId = localStorage.getItem('admin_edit_jugador');
  let user = null;
  
  try {
    const userData = localStorage.getItem('arvet_user');
    if (userData) user = JSON.parse(userData);
  } catch (e) {}
  
  const esAdminEditando = !!adminEditId;
  const jugadorId = esAdminEditando ? adminEditId : (user?.id || user?.ID);
  
  if (!jugadorId) {
    window.location.href = 'login.html';
    return;
  }
  
  if (!esAdminEditando && user?.rol !== 'Jugador') {
    window.location.href = 'login.html';
    return;
  }
  
  let avatarUrlActual = null;
  
  // ==========================================
  // UTILIDADES
  // ==========================================
  
  function mostrarMensaje(texto, tipo = 'ok') {
    const div = document.getElementById('mensajePerfil');
    if (!div) return;
    
    div.textContent = texto;
    div.style.display = 'block';
    div.style.background = tipo === 'ok' ? '#d1fae5' : '#fee2e2';
    div.style.color = tipo === 'ok' ? '#059669' : '#dc2626';
    
    setTimeout(() => div.style.display = 'none', 4000);
  }
  
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
    
    try {
      const fecha = new Date(fechaStr);
      if (!isNaN(fecha.getTime())) {
        return fecha.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    return fechaStr.split('T')[0].split(' ')[0];
  }
  
  // ==========================================
  // CARGAR PERFIL
  // ==========================================
  
  async function cargarPerfil() {
    try {
       mostrarLoader();
      const response = await fetch(`${API_URL}?action=getJugadorById&id=${jugadorId}`);
      const data = await response.json();
      
      if (!data.success) {
        mostrarMensaje('Error cargando perfil', 'error');
        return;
      }
      
      const jugador = data.data;
      
      // Datos personales
      document.getElementById('nombre').value = jugador.nombre || '';
      document.getElementById('apellido').value = jugador.apellido || '';
      document.getElementById('email').value = jugador.email || '';
      document.getElementById('telefono').value = jugador.telefono || '';
      document.getElementById('dni').value = jugador.dni || '';
      document.getElementById('cuitCuil').value = jugador.cuitCuil || '';
      
      if (jugador.fechaNacimiento) {
        document.getElementById('fechaNacimiento').value = formatearFecha(jugador.fechaNacimiento);
      }
      
      // Avatar
      const avatarImg = document.getElementById('avatarPreview');
      if (jugador.avatarUrl || jugador.avatar) {
        avatarUrlActual = jugador.avatarUrl || jugador.avatar;
        avatarImg.src = avatarUrlActual;
      } else {
        avatarImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="%23e2e8f0"/><text x="60" y="60" text-anchor="middle" fill="%2394a3b8" font-size="14">Sin foto</text></svg>';
      }
      
      // Estado (simplificado - sin documentos)
      const estadoEl = document.getElementById('estadoJugador');
      const estadoBox = document.getElementById('estadoBox');
      
      // Si tenés un campo estado en tu base, úsalo. Si no, mostrá "ACTIVO" por defecto
      const estado = jugador.estado || 'ACTIVO';
      estadoEl.textContent = estado;
      
      estadoBox.classList.remove('habilitado', 'faltante');
      if (estado === 'HABILITADO' || estado === 'ACTIVO') {
        estadoBox.classList.add('habilitado');
      } else {
        estadoBox.classList.add('faltante');
      }
      
      // Nombre en header
      const nombreCompleto = `${jugador.nombre || ''} ${jugador.apellido || ''}`.trim();
      document.getElementById('nombreJugadorHeader').textContent = nombreCompleto || 'Jugador';
      
      // Cargar equipo (color y logo)
      if (jugador.equipoId || jugador.equipo_id) {
        await cargarEquipo(jugador.equipoId || jugador.equipo_id);
      }
      ocultarLoader();
    } catch (err) {
      console.error('Error cargando perfil:', err);
      mostrarMensaje('Error de conexión', 'error');
    }
  }
  
  // ==========================================
  // CARGAR EQUIPO (COLOR Y LOGO)
  // ==========================================
  
  async function cargarEquipo(equipoId) {
    try {
      const response = await fetch(`${API_URL}?action=getEquipoById&id=${equipoId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const equipo = data.data;
        
        // Logo
        const logoEl = document.getElementById('equipoLogo');
        if (equipo.logoUrl && logoEl) {
          logoEl.src = equipo.logoUrl;
        }
        
        // Nombre
        const nombreEl = document.getElementById('nombreEquipo');
        if (nombreEl) {
          nombreEl.textContent = equipo.nombre || 'Mi Equipo';
        }
        
        // Color
        const color = equipo.colorPrimario || equipo.color || '#6366f1';
        document.documentElement.style.setProperty('--equipo-color', color);
      }
    } catch (err) {
      console.error('Error cargando equipo:', err);
    }
  }
  
  // ==========================================
  // GUARDAR PERFIL
  // ==========================================
  
  document.getElementById('formPerfil').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const datos = {
      id: jugadorId,
      nombre: document.getElementById('nombre').value.trim(),
      apellido: document.getElementById('apellido').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      fechaNacimiento: document.getElementById('fechaNacimiento').value,
      dni: document.getElementById('dni').value.trim(),
      cuitCuil: document.getElementById('cuitCuil').value.trim(),
      avatarUrl: avatarUrlActual
    };
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateJugador',
          ...datos
        })
      });
      
      mostrarMensaje('✅ Perfil actualizado');
      
      if (!esAdminEditando && user) {
        const updatedUser = { ...user, nombre: datos.nombre, apellido: datos.apellido, email: datos.email };
        localStorage.setItem('arvet_user', JSON.stringify(updatedUser));
      }
      
      document.getElementById('nombreJugadorHeader').textContent = `${datos.nombre} ${datos.apellido}`.trim();
      
    } catch (err) {
      mostrarMensaje('Error al guardar', 'error');
    }
  });
  
  // ==========================================
  // CAMBIAR AVATAR
  // ==========================================
  
  document.getElementById('btnCambiarAvatar').addEventListener('click', function() {
    document.getElementById('inputAvatar').click();
  });
  
  document.getElementById('inputAvatar').addEventListener('change', async function() {
    let file = this.files[0];
    if (!file) return;
    
    console.log('📁 Archivo seleccionado:', file.name, '- Tamaño:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('❌ El archivo debe ser una imagen', 'error');
      return;
    }
    
    // Redimensionar si es necesario
    let archivoSubir = file;
    const maxSizeMB = 5;
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      mostrarMensaje('⏳ Comprimiendo imagen...', 'ok');
      try {
        archivoSubir = await redimensionarImagen(file, 1200, 1200, 0.7);
        if (archivoSubir.size > maxSizeMB * 1024 * 1024) {
          archivoSubir = await redimensionarImagen(file, 800, 800, 0.6);
        }
      } catch (err) {
        mostrarMensaje('Error al procesar imagen', 'error');
        return;
      }
    }
    
    mostrarMensaje('⏳ Subiendo foto...');
    
    const formData = new FormData();
    formData.append('image', archivoSubir);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      
      if (result.success) {
        const url = result.data.url || result.data.display_url || result.data.medium?.url;
        
        if (!url) throw new Error('No se obtuvo URL');
        
        avatarUrlActual = url;
        
        // Mostrar preview
        const testImg = new Image();
        testImg.onload = async function() {
          document.getElementById('avatarPreview').src = avatarUrlActual;
          
          // 🔥 SUBIR AUTOMÁTICAMENTE AL SERVIDOR
          mostrarMensaje('⏳ Guardando en perfil...');
          
          try {
            await fetch(API_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'updateJugador',
                id: jugadorId,
                avatarUrl: avatarUrlActual
              })
            });
            
            mostrarMensaje('✅ Foto actualizada');
            
            // Actualizar localStorage si es el usuario logueado
            if (!esAdminEditando && user) {
              const updatedUser = { ...user, avatarUrl: avatarUrlActual };
              localStorage.setItem('arvet_user', JSON.stringify(updatedUser));
            }
            
          } catch (err) {
            console.error('Error guardando avatar:', err);
            mostrarMensaje('⚠️ Foto subida pero error al guardar', 'error');
          }
        };
        
        testImg.onerror = function() {
          mostrarMensaje('⚠️ Error al mostrar imagen', 'error');
        };
        testImg.src = avatarUrlActual;
        
      } else {
        mostrarMensaje('Error: ' + (result.error?.message || 'Error de ImgBB'), 'error');
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        mostrarMensaje('⏱️ Timeout - intentá con imagen más chica', 'error');
      } else {
        mostrarMensaje('❌ Error: ' + err.message, 'error');
      }
    }
  });
  // ==========================================
  // CAMBIAR CONTRASEÑA
  // ==========================================
  
  document.getElementById('btnCambiarPass').addEventListener('click', async function() {
    const password = document.getElementById('nuevaPassword').value.trim();
    
    if (!password || password.length < 6) {
      mostrarMensaje('Mínimo 6 caracteres', 'error');
      return;
    }
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePassword',
          id: jugadorId,
          password: password
        })
      });
      
      mostrarMensaje('✅ Contraseña actualizada');
      document.getElementById('nuevaPassword').value = '';
      
    } catch (err) {
      mostrarMensaje('Error al actualizar', 'error');
    }
  });
   
  // ==========================================
  // BOTÓN VOLVER A ADMIN
  // ==========================================
  
  const btnVolver = document.getElementById('btnVolverAdmin');
  if (esAdminEditando && btnVolver) {
    btnVolver.style.display = 'inline-block';
    btnVolver.addEventListener('click', function() {
      localStorage.removeItem('admin_edit_jugador');
      window.location.href = 'admin.html';
    });
  }
  
  // ==========================================
  // LOGOUT
  // ==========================================
  
  document.getElementById('btnLogout').addEventListener('click', function() {
    localStorage.removeItem('arvet_user');
    localStorage.removeItem('admin_edit_jugador');
    window.location.href = 'login.html';
  });
  // ==========================================
  // LOADER
  // ==========================================
  function mostrarLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'flex';
}

function ocultarLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    // Fade out suave
    loader.style.transition = 'opacity 0.3s ease';
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
}
   
   
     // ==========================================
  // CARGAR ENCUENTROS DEL JUGADOR
  // ==========================================
  async function cargarEncuentrosJugador() {
      const container = document.getElementById('panelJugadorEncuentros');
      if (!container) {
          console.log('❌ No existe el contenedor panelJugadorEncuentros');
          return;
      }
      
      console.log('✅ Contenedor encontrado');
      console.log('esAdminEditando:', esAdminEditando);
      console.log('user.equipoId:', user?.equipoId);
      console.log('jugadorId:', jugadorId);
      
      // SIEMPRE limpiar primero para evitar duplicados
      container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">⏳ Cargando encuentros...</p>';
      
      // Si es admin editando, verificar que el jugador sea de su mismo equipo
      if (esAdminEditando) {
          try {
              const response = await fetch(`${API_URL}?action=getJugadorById&id=${jugadorId}`);
              const data = await response.json();
              
              if (!data.success) {
                  container.innerHTML = '<p style="color: #64748b;">Error cargando datos del jugador</p>';
                  return;
              }
              
              const jugador = data.data;
              console.log('Jugador editado - equipoId:', jugador.equipoId);
              
              // Si el jugador NO es del mismo equipo del admin, no mostrar encuentros
              if (jugador.equipoId !== user.equipoId) {
                  container.innerHTML = '<p style="color: #64748b;">Jugador de otro equipo - No se muestran encuentros</p>';
                  return;
              }
              
              console.log('✅ Jugador del mismo equipo, mostrando encuentros');
              
          } catch (err) {
              console.error('Error verificando equipo del jugador:', err);
              container.innerHTML = '<p style="color: #64748b;">Error de conexión</p>';
              return;
          }
      }
      
            let tieneContenido = false;
      let htmlAcumulado = '';
      
      // 1. Cargar encuentros donde el equipo fue invitado Y aceptó (directamente, sin usar función externa)
      try {
          console.log('Cargando encuentros aceptados...');
          const responseInvitados = await fetch(`${API_URL}?action=getEncuentrosParaJugador&equipoId=${user.equipoId}&jugadorId=${jugadorId}`);
          const resultInvitados = await responseInvitados.json();
          
          if (resultInvitados.success && resultInvitados.data && resultInvitados.data.length > 0) {
              console.log('Encuentros aceptados encontrados:', resultInvitados.data.length);
              
              // Renderizar cada encuentro
              for (const enc of resultInvitados.data) {
                  htmlAcumulado += generarCardEncuentroPanel(enc, false); // false = no es creador
              }
              tieneContenido = true;
          } else {
              console.log('No hay encuentros aceptados');
          }
      } catch (err) {
          console.error('Error cargando encuentros aceptados:', err);
      }
      
      // 2. Cargar encuentros creados por este equipo
      try {
          console.log('Cargando encuentros creador...');
          const responseCreador = await fetch(`${API_URL}?action=getEncuentrosCreadorParaJugador&equipoId=${user.equipoId}&jugadorId=${jugadorId}`);
          const resultCreador = await responseCreador.json();
          
          if (resultCreador.success && resultCreador.data && resultCreador.data.length > 0) {
              console.log('Encuentros creador encontrados:', resultCreador.data.length);
              
              // Agregar separador si ya hay contenido de invitaciones
              if (tieneContenido) {
                  htmlAcumulado += `
                      <div style="margin: 30px 0 20px 0; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                          <h3 style="color: #4f46e5; font-size: 1rem; margin: 0;">🏆 Encuentros que organizo</h3>
                      </div>
                  `;
              }
              
              // Renderizar cada encuentro creado
              for (const enc of resultCreador.data) {
                  htmlAcumulado += generarCardEncuentroPanel(enc, true); // true = es creador
              }
              tieneContenido = true;
          } else {
              console.log('No hay encuentros creador');
          }
      } catch (err) {
          console.error('Error cargando encuentros creador:', err);
      }
      
          // 3. Insertar todo el HTML de una vez
      if (tieneContenido) {
          container.innerHTML = htmlAcumulado;
      } else {
          // Solo si no hay nada, mostrar mensaje vacío
          container.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #64748b;">
                  <div style="font-size: 3rem; margin-bottom: 15px;">🏉</div>
                  <h3>No tenés encuentros pendientes</h3>
                  <p>Cuando tu equipo acepte una invitación o crees un encuentro, aparecerá aquí.</p>
              </div>
          `;
      }
  } // ← CIERRE de cargarEncuentrosJugador()

// ==========================================
// GENERAR CARD DE ENCUENTRO PARA PANEL JUGADOR
// ==========================================
function generarCardEncuentroPanel(enc, esCreador) {
    let fechas = [];
    try {
        fechas = JSON.parse(enc.fechasJSON || '[]');
    } catch(e) { fechas = []; }
    
    const fechaPrincipal = fechas[0] ? formatearFecha(fechas[0].dia) : 'Fecha a confirmar';
    const horarioPrincipal = fechas[0]?.horarios?.[0]?.hora || '';
    
    // Estado visual
    let estadoHTML = '';
    let botonesHTML = '';
    
    if (enc.miRespuesta === 'voy') {
        estadoHTML = `<span style="background: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-weight: 600;">✓ VOY</span>`;
        botonesHTML = `
            <button onclick="guardarAsistencia('${enc.id}', 'no_voy')" 
                style="flex: 1; padding: 12px; border: 2px solid #fee2e2; border-radius: 8px; background: white; color: #991b1b; font-weight: 600; cursor: pointer;">
                Cambiar a NO VOY
            </button>
        `;
    } else if (enc.miRespuesta === 'no_voy') {
        estadoHTML = `<span style="background: #fee2e2; color: #991b1b; padding: 6px 16px; border-radius: 20px; font-weight: 600;">✕ NO VOY</span>`;
        botonesHTML = `
            <button onclick="guardarAsistencia('${enc.id}', 'voy')" 
                style="flex: 1; padding: 12px; border: 2px solid #dcfce7; border-radius: 8px; background: white; color: #166534; font-weight: 600; cursor: pointer;">
                Cambiar a VOY
            </button>
        `;
    } else {
        estadoHTML = `<span style="background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-weight: 600;">⏳ PENDIENTE</span>`;
        botonesHTML = `
            <button onclick="guardarAsistencia('${enc.id}', 'voy')" 
                style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #16a34a; color: white; font-weight: 600; cursor: pointer;">
                ✓ VOY
            </button>
            <button onclick="guardarAsistencia('${enc.id}', 'no_voy')" 
                style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #dc2626; color: white; font-weight: 600; cursor: pointer;">
                ✕ NO VOY
            </button>
        `;
    }
    
    const badgeCreador = esCreador ? `<span style="background: #4f46e5; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-left: 8px;">👑 ORGANIZADOR</span>` : '';
    
    return `
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 2px solid #4f46e5; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #1e293b; font-size: 1.2rem;">${enc.nombre}</h3>
                    ${badgeCreador}
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9rem;">
                        📅 ${fechaPrincipal} ${horarioPrincipal ? `• ${horarioPrincipal}hs` : ''}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">
                        Organiza: ${enc.creadorNombre || 'Mi equipo'}
                    </p>
                </div>
                ${estadoHTML}
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                    📍 ${enc.lugar || 'Ubicación a confirmar'}
                </p>
                <p style="margin: 5px 0 0 0; color: #4f46e5; font-size: 0.85rem; font-weight: 600;">
                    👥 Cupo: ${enc.equiposAceptados || 1}/${enc.cupoMaximo} equipos
                </p>
            </div>
            
            <div style="display: flex; gap: 10px;">
                ${botonesHTML}
            </div>
        </div>
    `;
}
// ==========================================
// GUARDAR ASISTENCIA (copiado de encuentros.js para funcionar en panel)
// ==========================================
async function guardarAsistencia(encuentroId, respuesta) {
    // Usar la variable user que ya está definida en el scope
    const params = new URLSearchParams({
        action: 'guardarAsistenciaJugador',
        encuentroId: encuentroId,
        jugadorId: jugadorId, // ya está definido arriba en el archivo
        jugadorNombre: user?.nombre || '',
        equipoId: user?.equipoId || '',
        respuesta: respuesta
    });
    
    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();
        
         if (result.success) {
            mostrarMensaje(`Confirmado: ${respuesta === 'voy' ? 'VOY ✓' : 'NO VOY ✕'}`, 'ok');
            
            // Recargar la página completa después de 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        } else {
            mostrarMensaje(result.error || 'Error al guardar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensaje('Error de conexión', 'error');
    }
}
  // ==========================================
  // INICIAR
  // ==========================================
  
  await cargarPerfil();
  
  // Cargar encuentros
  await cargarEncuentrosJugador();

});  // ← CIERRE DEL DOMContentLoaded
