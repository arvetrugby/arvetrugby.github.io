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
  // INICIAR
  // ==========================================
  
  await cargarPerfil();
  
});
