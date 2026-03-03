document.addEventListener('DOMContentLoaded', async function() {

  const adminEditId = localStorage.getItem('admin_edit_jugador');
let user = JSON.parse(localStorage.getItem('arvet_user'));

let jugadorId = user?.id;

// Si viene desde admin
if (esAdminEditando && user.rol === "Admin" && btnVolverAdmin)
}
const esAdminEditando = !!adminEditId;
  
  if (!user) {
  window.location.href = 'login.html';
  return;
}



// Si NO es jugador y tampoco es admin editando → afuera
if (user.rol !== 'Jugador' && !esAdminEditando) {
  window.location.href = 'login.html';
  return;
}
  // 🔵 VARIABLE GLOBAL DEL AVATAR
  let avatarUrlActual = null;

  function mostrarMensaje(texto, tipo = "ok") {

    const div = document.getElementById('mensajePerfil');
    if (!div) return;

    div.textContent = texto;
    div.style.display = "block";
    div.style.opacity = "1";
    div.style.transition = "opacity 0.5s ease";
    div.style.padding = "10px";
    div.style.marginBottom = "15px";
    div.style.borderRadius = "6px";

    if (tipo === "ok") {
      div.style.backgroundColor = "#d4edda";
      div.style.color = "#155724";
    } else {
      div.style.backgroundColor = "#f8d7da";
      div.style.color = "#721c24";
    }

    setTimeout(() => {
      div.style.opacity = "0";
      setTimeout(() => {
        div.style.display = "none";
      }, 500);
    }, 5000);
  }
  /*********************************
  VOLVER A ADMIN
  *********************************/
const btnVolverAdmin = document.getElementById('btnVolverAdmin');

if (esAdminEditando && btnVolverAdmin) {
  btnVolverAdmin.style.display = 'inline-block';

  btnVolverAdmin.addEventListener('click', function() {
    localStorage.removeItem('admin_edit_jugador');
    window.location.href = 'admin.html';
  });
}
  /*********************************
   CARGAR PERFIL
  *********************************/

  try {

    const response = await fetch(
      `${API_URL}?action=getJugadorById&id=${jugadorId}`
    );

    const data = await response.json();

    if (data.success) {

      const jugador = data.data;

      document.getElementById('nombre').value = jugador.nombre || '';
      document.getElementById('apellido').value = jugador.apellido || '';
      document.getElementById('email').value = jugador.email || '';
      document.getElementById('telefono').value = jugador.telefono || '';

      if (jugador.fechaNacimiento) {
        const fecha = new Date(jugador.fechaNacimiento);
        document.getElementById('fechaNacimiento').value =
          fecha.toISOString().split('T')[0];
      }

      document.getElementById('dni').value = jugador.dni || '';
      document.getElementById('cuitCuil').value = jugador.cuitCuil || '';

      // 🔵 CARGAR AVATAR
      const avatarImg = document.getElementById('avatarPreview');

      if (jugador.avatarUrl) {
        avatarUrlActual = jugador.avatarUrl;
        avatarImg.src = jugador.avatarUrl;
      } else {
        avatarImg.src = 'https://i.ibb.co/xxxxx/avatar-default.png';
      }
      /*********************************
 ESTADO JUGADOR POR DOCUMENTOS
*********************************/
      const estadoEl = document.getElementById("estadoJugador");

estadoEl.textContent = jugador.estado || "FALTA DOCUMENTACIÓN";

estadoEl.classList.remove("habilitado", "faltante");

if (jugador.estado === "HABILITADO") {
    estadoEl.classList.add("habilitado");
} else {
    estadoEl.classList.add("faltante");
}
      /*********************************
 MOSTRAR DOCUMENTOS EXISTENTES
*********************************/

const aptoDiv = document.getElementById("aptoLink");
const estudiosDiv = document.getElementById("estudiosLink");
const deslindeDiv = document.getElementById("deslindeLink");

if (jugador.apto) {
  aptoDiv.innerHTML = `
    <a href="${jugador.apto}" target="_blank">📄 Ver apto médico</a>
    <button onclick="eliminarDocumento('apto')" class="btnEliminarDoc">❌</button>
  `;
} else {
  aptoDiv.innerHTML = `<span style="color:red">No cargado</span>`;
}

if (jugador.estudios) {
  estudiosDiv.innerHTML = `
    <a href="${jugador.estudios}" target="_blank">📄 Ver estudios</a>
    <button onclick="eliminarDocumento('estudios')" class="btnEliminarDoc">❌</button>
  `;
} else {
  estudiosDiv.innerHTML = `<span style="color:red">No cargado</span>`;
}

if (jugador.deslinde) {
  deslindeDiv.innerHTML = `
    <a href="${jugador.deslinde}" target="_blank">📄 Ver deslinde</a>
    <button onclick="eliminarDocumento('deslinde')" class="btnEliminarDoc">❌</button>
  `;
} else {
  deslindeDiv.innerHTML = `<span style="color:red">No cargado</span>`;
}
    } else {
      alert('Error cargando perfil');
    }

  } catch (err) {
    console.error(err);
  }

  /*********************************
   GUARDAR PERFIL
  *********************************/

  const form = document.getElementById('formPerfil');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const datosActualizados = {
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

      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateJugador',
          ...datosActualizados
        })
      });

      const data = await response.json();

      if (data.success) {

        mostrarMensaje('Perfil actualizado correctamente', 'ok');

        const updatedUser = {
          ...user,
          nombre: datosActualizados.nombre,
          apellido: datosActualizados.apellido,
          email: datosActualizados.email
        };

        localStorage.setItem('arvet_user', JSON.stringify(updatedUser));

      } else {
        mostrarMensaje('Error al actualizar', 'error');
      }

    } catch (error) {
      console.error(error);
      mostrarMensaje('Error de conexión', 'error');
    }

  });

  /*********************************
   CAMBIAR AVATAR
  *********************************/

  const btnCambiarAvatar = document.getElementById('btnCambiarAvatar');
  const inputAvatar = document.getElementById('inputAvatar');
  const avatarPreview = document.getElementById('avatarPreview');

  if (btnCambiarAvatar) {

    btnCambiarAvatar.addEventListener('click', () => {
      inputAvatar.click();
    });

    inputAvatar.addEventListener('change', async function() {

      const file = this.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);

      try {

        const response = await fetch(
          "https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90",
          {
            method: "POST",
            body: formData
          }
        );

        const result = await response.json();

        if (result.success) {

          avatarUrlActual = result.data.thumb.url;
          avatarPreview.src = avatarUrlActual;

          mostrarMensaje("Imagen cargada correctamente", "ok");

        } else {
          mostrarMensaje("Error subiendo imagen", "error");
        }

      } catch (err) {
        console.error(err);
        mostrarMensaje("Error de conexión con imgbb", "error");
      }

    });

  }

  /*********************************
   CAMBIAR CONTRASEÑA
  *********************************/

  const btnCambiarPass = document.getElementById('btnCambiarPass');

  if (btnCambiarPass) {

    btnCambiarPass.addEventListener('click', async function() {

      const nuevaPass = document.getElementById('nuevaPassword').value.trim();

      if (!nuevaPass) {
        mostrarMensaje('Ingresa nueva contraseña', 'error');
        return;
      }

      try {

        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'updatePassword',
            id: jugadorId,
            password: nuevaPass
          })
        });

        const data = await response.json();

        if (data.success) {
          mostrarMensaje('Contraseña actualizada', 'ok');
          document.getElementById('nuevaPassword').value = "";
        } else {
          mostrarMensaje('Error al actualizar contraseña', 'error');
        }

      } catch (error) {
        console.error(error);
        mostrarMensaje("Error de conexión", "error");
      }

    });

  }
/*********************************
 SUBIR DOCUMENTOS A DRIVE
*********************************/

const btnSubirDocs = document.getElementById("btnSubirDocumentos");

if (btnSubirDocs) {

  btnSubirDocs.addEventListener("click", async () => {

    const apto = document.getElementById("aptoMedico").files[0];
    const estudios = document.getElementById("estudios").files[0];
    const deslinde = document.getElementById("deslinde").files[0];

    if (!apto && !estudios && !deslinde) {
      mostrarMensaje("Seleccioná al menos un documento", "error");
      return;
    }

    const toBase64 = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const data = {
      action: "subirDocumentos",
      idJugador: jugadorId
    };

    if (apto) {
      data.apto = {
        name: apto.name,
        type: apto.type,
        data: await toBase64(apto)
      };
    }

    if (estudios) {
      data.estudios = {
        name: estudios.name,
        type: estudios.type,
        data: await toBase64(estudios)
      };
    }

    if (deslinde) {
      data.deslinde = {
        name: deslinde.name,
        type: deslinde.type,
        data: await toBase64(deslinde)
      };
    }

    try {

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        mostrarMensaje("Documentación actualizada", "ok");
        setTimeout(() => location.reload(), 1000);
      } else {
        console.error(result.error);
        mostrarMensaje("Error: " + result.error, "error");
      }

    } catch (error) {
      console.error(error);
      mostrarMensaje("Error de conexión", "error");
    }

  });

}
  /*********************************
   ELIMINAR DOCUMENTO DRIVE
  *********************************/
  window.eliminarDocumento = async function(tipo) {

  if (!confirm("¿Seguro que querés eliminar este documento?")) return;

  try {

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "eliminarDocumento",
        idJugador: jugadorId,
        tipo: tipo
      })
    });

    const result = await response.json();

    if (result.success) {
      mostrarMensaje("Documento eliminado", "ok");
      location.reload();
    } else {
      mostrarMensaje("Error al eliminar", "error");
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error de conexión", "error");
  }
};
  /*********************************
   LOGOUT
  *********************************/

  const btnLogout = document.getElementById('btnLogout');

  if (btnLogout) {
    btnLogout.addEventListener('click', function() {
      localStorage.removeItem('arvet_user');
      window.location.href = 'login.html';
    });
  }

});
