// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
  
  console.log('🚀 Panel jugador iniciando...');
  
  // ==========================================
  // CONFIGURACIÓN - Usar la variable global del HTML
  // ==========================================
  if (typeof API_URL === 'undefined') {
    console.error('❌ ERROR: API_URL no está definido. Configuralo en el HTML.');
    mostrarErrorFatal('Error de configuración: API_URL no definido');
    return;
  }
  
  console.log('📡 API_URL:', API_URL);
  
  // ==========================================
  // OBTENER DATOS DE SESIÓN
  // ==========================================
  const adminEditId = localStorage.getItem('admin_edit_jugador');
  let user = {};
  
  try {
    const userData = localStorage.getItem('arvet_user');
    if (userData) {
      user = JSON.parse(userData);
    }
  } catch (e) {
    console.error('Error parseando user:', e);
  }
  
  const esAdminEditando = !!adminEditId;
  const jugadorId = esAdminEditando ? adminEditId : (user?.id || user?.ID);
  
  console.log('👤 Jugador ID:', jugadorId, '| Admin editando:', esAdminEditando);
  
  // ==========================================
  // VALIDAR SESIÓN
  // ==========================================
  if (!jugadorId) {
    console.error('❌ No hay ID de jugador');
    window.location.href = 'login.html';
    return;
  }
  
  if (!esAdminEditando && user?.rol !== 'Jugador') {
    console.error('❌ Rol no válido:', user?.rol);
    window.location.href = 'login.html';
    return;
  }
  
  // ==========================================
  // VARIABLES GLOBALES
  // ==========================================
  let avatarUrlActual = null;
  let jugadorData = null;
  
  // ==========================================
  // REFERENCIAS DOM (con verificación)
  // ==========================================
  const elementos = {
    nombre: document.getElementById('nombre'),
    apellido: document.getElementById('apellido'),
    email: document.getElementById('email'),
    telefono: document.getElementById('telefono'),
    fechaNacimiento: document.getElementById('fechaNacimiento'),
    dni: document.getElementById('dni'),
    cuitCuil: document.getElementById('cuitCuil'),
    avatarPreview: document.getElementById('avatarPreview'),
    estadoJugador: document.getElementById('estadoJugador'),
    estadoBox: document.getElementById('estadoBox'),
    nombreJugadorHeader: document.getElementById('nombreJugadorHeader'),
    equipoLogo: document.getElementById('equipoLogo'),
    nombreEquipo: document.getElementById('nombreEquipo'),
    mensajePerfil: document.getElementById('mensajePerfil'),
    btnVolverAdmin: document.getElementById('btnVolverAdmin'),
    btnLogout: document.getElementById('btnLogout'),
    formPerfil: document.getElementById('formPerfil'),
    btnCambiarAvatar: document.getElementById('btnCambiarAvatar'),
    inputAvatar: document.getElementById('inputAvatar'),
    btnSubirDocumentos: document.getElementById('btnSubirDocumentos'),
    btnCambiarPass: document.getElementById('btnCambiarPass'),
    nuevaPassword: document.getElementById('nuevaPassword'),
    aptoMedico: document.getElementById('aptoMedico'),
    estudios: document.getElementById('estudios'),
    deslinde: document.getElementById('deslinde'),
    aptoLink: document.getElementById('aptoLink'),
    estudiosLink: document.getElementById('estudiosLink'),
    deslindeLink: document.getElementById('deslindeLink')
  };
  
  // Verificar elementos críticos
  const faltantes = Object.entries(elementos)
    .filter(([key, el]) => !el)
    .map(([key]) => key);
  
  if (faltantes.length > 0) {
    console.error('❌ Elementos faltantes en DOM:', faltantes);
  }
  
  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================
  
  function mostrarMensaje(texto, tipo = "ok") {
    const div = elementos.mensajePerfil;
    if (!div) {
      alert(texto); // Fallback si no existe el div
      return;
    }
    
    div.textContent = texto;
    div.style.display = "block";
    div.style.background = tipo === "ok" ? "#d1fae5" : "#fee2e2";
    div.style.color = tipo === "ok" ? "#059669" : "#dc2626";
    div.style.border = tipo === "ok" ? "1px solid #059669" : "1px solid #dc2626";
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
      div.style.display = "none";
    }, 4000);
  }
  
  function mostrarErrorFatal(mensaje) {
    document.body.innerHTML = `
      <div style="max-width:600px;margin:50px auto;padding:30px;background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;font-family:sans-serif;">
        <h2 style="color:#dc2626;margin-bottom:20px;">❌ Error</h2>
        <p style="color:#475569;margin-bottom:20px;">${mensaje}</p>
        <button onclick="window.location.href='login.html'" style="padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">
          Volver al login
        </button>
      </div>
    `;
  }
  
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    
    // Si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      return fechaStr;
    }
    
    // Si viene de Sheets como Date object serializado
    try {
      const fecha = new Date(fechaStr);
      if (!isNaN(fecha.getTime())) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Error parseando fecha:', e);
    }
    
    // Fallback: limpiar string
    return fechaStr.split('T')[0].split(' ')[0];
  }
  
  // ==========================================
  // CARGAR PERFIL DEL JUGADOR
  // ==========================================
  
  async function cargarPerfil() {
    console.log('⏳ Cargando perfil...');
    
    try {
      const url = `${API_URL}?action=getJugadorById&id=${encodeURIComponent(jugadorId)}`;
      console.log('📡 Fetch a:', url);
      
      const response = await fetch(url);
      console.log('📥 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Datos recibidos:', data);
      
      if (!data.success) {
        mostrarMensaje("Error: " + (data.message || "No se pudo cargar el perfil"), "error");
        if (elementos.estadoJugador) {
          elementos.estadoJugador.textContent = "Error al cargar";
        }
        return;
      }
      
      jugadorData = data.data;
      
      if (!jugadorData) {
        mostrarMensaje("No se encontraron datos del jugador", "error");
        return;
      }
      
      console.log('✅ Perfil cargado:', jugadorData);
      
      // --- CARGAR DATOS PERSONALES ---
      if (elementos.nombre) elementos.nombre.value = jugadorData.nombre || '';
      if (elementos.apellido) elementos.apellido.value = jugadorData.apellido || '';
      if (elementos.email) elementos.email.value = jugadorData.email || '';
      if (elementos.telefono) elementos.telefono.value = jugadorData.telefono || '';
      if (elementos.dni) elementos.dni.value = jugadorData.dni || '';
      if (elementos.cuitCuil) elementos.cuitCuil.value = jugadorData.cuitCuil || jugadorData.cuit_cuil || '';
      
      if (elementos.fechaNacimiento && jugadorData.fechaNacimiento) {
        elementos.fechaNacimiento.value = formatearFecha(jugadorData.fechaNacimiento);
      }
      
      // --- CARGAR AVATAR ---
      if (elementos.avatarPreview) {
        if (jugadorData.avatarUrl || jugadorData.avatar) {
          avatarUrlActual = jugadorData.avatarUrl || jugadorData.avatar;
          elementos.avatarPreview.src = avatarUrlActual;
          elementos.avatarPreview.onerror = function() {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23e2e8f0'/%3E%3Ctext x='60' y='60' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14'%3EError%3C/text%3E%3C/svg%3E";
          };
        }
      }
      
      // --- ACTUALIZAR ESTADO ---
      const estado = jugadorData.estado || "FALTA DOCUMENTACIÓN";
      if (elementos.estadoJugador) {
        elementos.estadoJugador.textContent = estado;
      }
      
      if (elementos.estadoBox) {
        elementos.estadoBox.classList.remove("habilitado", "faltante");
        if (estado === "HABILITADO" || estado === "Habilitado") {
          elementos.estadoBox.classList.add("habilitado");
        } else {
          elementos.estadoBox.classList.add("faltante");
        }
      }
      
      // --- ACTUALIZAR HEADER ---
      const nombreCompleto = `${jugadorData.nombre || ''} ${jugadorData.apellido || ''}`.trim();
      if (elementos.nombreJugadorHeader) {
        elementos.nombreJugadorHeader.textContent = nombreCompleto || 'Jugador';
      }
      
      // --- CARGAR EQUIPO ---
      const equipoId = jugadorData.equipoId || jugadorData.equipo_id || jugadorData.equipoID;
      if (equipoId) {
        await cargarEquipo(equipoId);
      } else {
        if (elementos.nombreEquipo) elementos.nombreEquipo.textContent = 'Sin equipo asignado';
      }
      
      // --- CARGAR DOCUMENTOS ---
      mostrarDocumento("aptoLink", jugadorData.aptoMedico || jugadorData.apto || jugadorData.apto_medico, "aptoMedico");
      mostrarDocumento("estudiosLink", jugadorData.estudiosRealizados || jugadorData.estudios || jugadorData.estudios_realizados, "estudios");
      mostrarDocumento("deslindeLink", jugadorData.deslindeResponsabilidad || jugadorData.deslinde || jugadorData.deslinde_responsabilidad, "deslinde");
      
    } catch (err) {
      console.error('❌ Error cargando perfil:', err);
      mostrarMensaje("Error de conexión al cargar perfil: " + err.message, "error");
      if (elementos.estadoJugador) {
        elementos.estadoJugador.textContent = "Error de conexión";
      }
    }
  }
  
  // ==========================================
  // CARGAR DATOS DEL EQUIPO
  // ==========================================
  
  async function cargarEquipo(equipoId) {
    console.log('⏳ Cargando equipo:', equipoId);
    
    try {
      const url = `${API_URL}?action=getEquipoById&id=${encodeURIComponent(equipoId)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data) {
        const equipo = data.data;
        console.log('✅ Equipo cargado:', equipo);
        
        if (elementos.nombreEquipo) {
          elementos.nombreEquipo.textContent = equipo.nombre || 'Equipo';
        }
        
        if (elementos.equipoLogo && equipo.logoUrl) {
          elementos.equipoLogo.src = equipo.logoUrl;
          elementos.equipoLogo.onerror = function() {
            this.style.display = 'none';
          };
        }
        
        // Aplicar color del equipo
        const color = equipo.colorPrimario || equipo.color || '#6366f1';
        document.documentElement.style.setProperty('--equipo-color', color);
        
      } else {
        console.warn('⚠️ No se pudo cargar el equipo');
        if (elementos.nombreEquipo) elementos.nombreEquipo.textContent = 'Equipo no encontrado';
      }
    } catch (err) {
      console.error('❌ Error cargando equipo:', err);
    }
  }
  
  // ==========================================
  // MOSTRAR DOCUMENTOS
  // ==========================================
  
  function mostrarDocumento(divId, url, tipo) {
    const div = document.getElementById(divId);
    if (!div) return;
    
    div.className = '';
    
    if (url) {
      div.innerHTML = `
        <a href="${url}" target="_blank" title="Ver documento">📄 Ver documento</a>
        <button class="btn-danger" onclick="eliminarDocumento('${tipo}')" title="Eliminar documento">🗑️ Eliminar</button>
      `;
      div.className = "doc-link";
    } else {
      div.innerHTML = `<span class="no-doc">❌ No cargado</span>`;
      div.className = "no-doc";
    }
  }
  
  // ==========================================
  // ELIMINAR DOCUMENTO (GLOBAL)
  // ==========================================
  
  window.eliminarDocumento = async function(tipo) {
    if (!confirm('¿Estás seguro de eliminar este documento?\n\nEl jugador quedará deshabilitado hasta subir uno nuevo.')) {
      return;
    }
    
    console.log('🗑️ Eliminando documento:', tipo);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante para Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'eliminarDocumento',
          jugadorId: jugadorId,
          tipoDocumento: tipo
        })
      });
      
      // Con no-cors no podemos leer la respuesta, asumimos éxito y recargamos
      mostrarMensaje("✅ Documento eliminado (verificando...)");
      setTimeout(cargarPerfil, 1500);
      
    } catch (err) {
      console.error('❌ Error eliminando:', err);
      mostrarMensaje("Error al eliminar documento", "error");
    }
  };
  
  // ==========================================
  // GUARDAR PERFIL
  // ==========================================
  
  if (elementos.formPerfil) {
    elementos.formPerfil.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const btn = e.submitter;
      const textoOriginal = btn.textContent;
      btn.textContent = '⏳ Guardando...';
      btn.disabled = true;
      
      const datos = {
        id: jugadorId,
        nombre: elementos.nombre?.value?.trim() || '',
        apellido: elementos.apellido?.value?.trim() || '',
        email: elementos.email?.value?.trim() || '',
        telefono: elementos.telefono?.value?.trim() || '',
        fechaNacimiento: elementos.fechaNacimiento?.value || '',
        dni: elementos.dni?.value?.trim() || '',
        cuitCuil: elementos.cuitCuil?.value?.trim() || '',
        avatarUrl: avatarUrlActual
      };
      
      console.log('💾 Guardando datos:', datos);
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateJugador',
            ...datos
          })
        });
        
        mostrarMensaje("✅ Perfil guardado correctamente");
        
        // Actualizar localStorage si es el usuario logueado
        if (!esAdminEditando) {
          const updatedUser = {
            ...user,
            nombre: datos.nombre,
            apellido: datos.apellido,
            email: datos.email
          };
          localStorage.setItem('arvet_user', JSON.stringify(updatedUser));
        }
        
        // Actualizar header
        if (elementos.nombreJugadorHeader) {
          elementos.nombreJugadorHeader.textContent = `${datos.nombre} ${datos.apellido}`.trim();
        }
        
      } catch (err) {
        console.error('❌ Error guardando:', err);
        mostrarMensaje("❌ Error al guardar: " + err.message, "error");
      } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
      }
    });
  }
  
  // ==========================================
  // CAMBIAR AVATAR
  // ==========================================
  
  if (elementos.btnCambiarAvatar && elementos.inputAvatar) {
    elementos.btnCambiarAvatar.addEventListener('click', () => {
      elementos.inputAvatar.click();
    });
    
    elementos.inputAvatar.addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;
      
      // Validar tamaño (2MB)
      if (file.size > 2 * 1024 * 1024) {
        mostrarMensaje("❌ La imagen es muy grande. Máximo 2MB.", "error");
        return;
      }
      
      console.log('📤 Subiendo avatar...');
      mostrarMensaje("⏳ Subiendo imagen...");
      
      try {
        const formData = new FormData();
        formData.append("image", file);
        
        const response = await fetch(
          "https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90",
          { method: "POST", body: formData }
        );
        
        const result = await response.json();
        console.log('📥 Respuesta ImgBB:', result);
        
        if (result.success) {
          avatarUrlActual = result.data.url || result.data.display_url || result.data.medium?.url;
          
          if (elementos.avatarPreview) {
            elementos.avatarPreview.src = avatarUrlActual;
          }
          
          mostrarMensaje("✅ Imagen cargada. Recordá guardar los cambios del perfil.");
        } else {
          mostrarMensaje("❌ Error al subir imagen: " + (result.error?.message || "Error desconocido"), "error");
        }
      } catch (err) {
        console.error('❌ Error subiendo avatar:', err);
        mostrarMensaje("❌ Error de conexión al subir imagen", "error");
      }
    });
  }
  
  // ==========================================
  // SUBIR DOCUMENTOS
  // ==========================================
  
  if (elementos.btnSubirDocumentos) {
    elementos.btnSubirDocumentos.addEventListener('click', async function() {
      const files = {
        apto: elementos.aptoMedico?.files[0],
        estudios: elementos.estudios?.files[0],
        deslinde: elementos.deslinde?.files[0]
      };
      
      const tieneArchivos = files.apto || files.estudios || files.deslinde;
      
      if (!tieneArchivos) {
        mostrarMensaje("❌ Seleccioná al menos un documento", "error");
        return;
      }
      
      console.log('📤 Subiendo documentos...', files);
      elementos.btnSubirDocumentos.textContent = '⏳ Subiendo...';
      elementos.btnSubirDocumentos.disabled = true;
      
      try {
        const urls = {};
        
        // Subir cada archivo a ImgBB
        for (const [tipo, file] of Object.entries(files)) {
          if (!file) continue;
          
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`El archivo ${tipo} es muy grande (máx 5MB)`);
          }
          
          const formData = new FormData();
          formData.append("image", file);
          
          const response = await fetch(
            "https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90",
            { method: "POST", body: formData }
          );
          
          const result = await response.json();
          
          if (result.success) {
            const url = result.data.url || result.data.display_url;
            
            // Mapear nombres de campos
            if (tipo === 'apto') urls.aptoMedico = url;
            if (tipo === 'estudios') urls.estudiosRealizados = url;
            if (tipo === 'deslinde') urls.deslindeResponsabilidad = url;
            
          } else {
            throw new Error(`Error subiendo ${tipo}`);
          }
        }
        
        console.log('📎 URLs obtenidas:', urls);
        
        // Guardar en tu backend
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateDocumentosJugador',
            id: jugadorId,
            ...urls
          })
        });
        
        mostrarMensaje("✅ Documentos subidos correctamente");
        
        // Limpiar inputs
        if (elementos.aptoMedico) elementos.aptoMedico.value = '';
        if (elementos.estudios) elementos.estudios.value = '';
        if (elementos.deslinde) elementos.deslinde.value = '';
        
        // Recargar perfil
        setTimeout(cargarPerfil, 1000);
        
      } catch (err) {
        console.error('❌ Error subiendo documentos:', err);
        mostrarMensaje("❌ Error: " + err.message, "error");
      } finally {
        elementos.btnSubirDocumentos.textContent = '📤 Subir documentación seleccionada';
        elementos.btnSubirDocumentos.disabled = false;
      }
    });
  }
  
  // ==========================================
  // CAMBIAR CONTRASEÑA
  // ==========================================
  
  if (elementos.btnCambiarPass && elementos.nuevaPassword) {
    elementos.btnCambiarPass.addEventListener('click', async function() {
      const password = elementos.nuevaPassword.value.trim();
      
      if (!password || password.length < 6) {
        mostrarMensaje("❌ La contraseña debe tener al menos 6 caracteres", "error");
        return;
      }
      
      elementos.btnCambiarPass.textContent = '⏳ Actualizando...';
      elementos.btnCambiarPass.disabled = true;
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cambiarPassword',
            id: jugadorId,
            password: password
          })
        });
        
        mostrarMensaje("✅ Contraseña actualizada correctamente");
        elementos.nuevaPassword.value = '';
        
      } catch (err) {
        console.error('❌ Error cambiando password:', err);
        mostrarMensaje("❌ Error al actualizar contraseña", "error");
      } finally {
        elementos.btnCambiarPass.textContent = '🔑 Actualizar contraseña';
        elementos.btnCambiarPass.disabled = false;
      }
    });
  }
  
  // ==========================================
  // BOTÓN VOLVER A ADMIN
  // ==========================================
  
  if (esAdminEditando && elementos.btnVolverAdmin) {
    elementos.btnVolverAdmin.style.display = 'inline-block';
    elementos.btnVolverAdmin.addEventListener('click', () => {
      localStorage.removeItem('admin_edit_jugador');
      window.location.href = 'admin.html';
    });
  }
  
  // ==========================================
  // LOGOUT
  // ==========================================
  
  if (elementos.btnLogout) {
    elementos.btnLogout.addEventListener('click', () => {
      localStorage.removeItem('arvet_user');
      localStorage.removeItem('admin_edit_jugador');
      window.location.href = 'login.html';
    });
  }
  
  // ==========================================
  // INICIAR
  // ==========================================
  
  console.log('🎬 Iniciando carga de perfil...');
  await cargarPerfil();
  console.log('✅ Inicialización completa');
  
});
