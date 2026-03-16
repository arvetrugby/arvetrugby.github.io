document.addEventListener('DOMContentLoaded', async function () {

const adminEditId = localStorage.getItem('admin_edit_jugador');
const user = JSON.parse(localStorage.getItem('arvet_user') || "{}");

const esAdminEditando = !!adminEditId;
const jugadorId = esAdminEditando ? adminEditId : user?.id;

/*********************************
VALIDAR SESIÓN
*********************************/

if (!user.id && !esAdminEditando) {
  window.location.href = 'login.html';
  return;
}

if (user.rol !== 'Jugador' && !esAdminEditando) {
  window.location.href = 'login.html';
  return;
}

/*********************************
VARIABLES
*********************************/

let avatarUrlActual = null;

/*********************************
MENSAJES
*********************************/

function mostrarMensaje(texto, tipo = "ok") {

  const div = document.getElementById('mensajePerfil');
  if (!div) return;

  div.textContent = texto;
  div.style.display = "block";

  div.style.background = tipo === "ok" ? "#d4edda" : "#f8d7da";
  div.style.color = tipo === "ok" ? "#155724" : "#721c24";

  setTimeout(() => div.style.display = "none", 4000);
}

/*********************************
VOLVER A ADMIN
*********************************/

const btnVolverAdmin = document.getElementById('btnVolverAdmin');

if (esAdminEditando && btnVolverAdmin) {

  btnVolverAdmin.style.display = 'inline-block';

  btnVolverAdmin.addEventListener('click', () => {
    localStorage.removeItem('admin_edit_jugador');
    window.location.href = 'admin.html';
  });

}

/*********************************
CARGAR PERFIL
*********************************/

try {

  const response = await fetch(`${API_URL}?action=getJugadorById&id=${jugadorId}`);
  const data = await response.json();

  if (!data.success) {
    alert("Error cargando perfil");
    return;
  }

  const jugador = data.data;

  /*************** DATOS PERSONALES ***************/

  document.getElementById('nombre').value = jugador.nombre || '';
  document.getElementById('apellido').value = jugador.apellido || '';
  document.getElementById('email').value = jugador.email || '';
  document.getElementById('telefono').value = jugador.telefono || '';
  document.getElementById('dni').value = jugador.dni || '';
  document.getElementById('cuitCuil').value = jugador.cuitCuil || '';

  if (jugador.fechaNacimiento) {
    const fecha = new Date(jugador.fechaNacimiento);
    document.getElementById('fechaNacimiento').value =
      fecha.toISOString().split('T')[0];
  }

  /*************** AVATAR ***************/

  const avatarImg = document.getElementById('avatarPreview');

  if (jugador.avatarUrl) {
    avatarUrlActual = jugador.avatarUrl;
    avatarImg.src = jugador.avatarUrl;
  }

  /*************** ESTADO ***************/

  const estadoEl = document.getElementById("estadoJugador");

  estadoEl.textContent = jugador.estado || "FALTA DOCUMENTACIÓN";

  estadoEl.classList.remove("habilitado", "faltante");

  if (jugador.estado === "HABILITADO") {
    estadoEl.classList.add("habilitado");
  } else {
    estadoEl.classList.add("faltante");
  }

  /*********************************
  HEADER (EQUIPO)
  *********************************/

  if (jugador.equipoId) {

    try {

      const resEquipo = await fetch(`${API_URL}?action=getEquipoById&id=${jugador.equipoId}`);
      const dataEquipo = await resEquipo.json();

      if (dataEquipo.success) {

        const equipo = dataEquipo.data;

        const logo = document.getElementById("equipoLogo");
        const nombreEquipo = document.getElementById("nombreEquipo");
        const nombreJugador = document.getElementById("nombreJugador");

        if (logo && equipo.logoUrl) {
          logo.src = equipo.logoUrl;
        }

        if (nombreEquipo) {
          nombreEquipo.textContent = equipo.nombre;
        }

        if (nombreJugador) {
          nombreJugador.textContent =
            jugador.nombre + " " + (jugador.apellido || "");
        }

        if (equipo.colorPrimario) {
          document.documentElement.style.setProperty(
            '--equipo-color',
            equipo.colorPrimario
          );
        }

      }

    } catch (err) {
      console.error("Error cargando equipo", err);
    }

  }

  /*********************************
  DOCUMENTOS
  *********************************/

  mostrarDocumento("aptoLink", jugador.apto, "apto");
  mostrarDocumento("estudiosLink", jugador.estudios, "estudios");
  mostrarDocumento("deslindeLink", jugador.deslinde, "deslinde");

} catch (err) {

  console.error(err);

}

/*********************************
MOSTRAR DOCUMENTOS
*********************************/

function mostrarDocumento(divId, url, tipo) {

  const div = document.getElementById(divId);

  if (!div) return;

  if (url) {

    div.innerHTML = `
      <a href="${url}" target="_blank">📄 Ver documento</a>
      <button onclick="eliminarDocumento('${tipo}')" class="btnEliminarDoc">❌</button>
    `;

  } else {

    div.innerHTML = `<span style="color:red">No cargado</span>`;

  }

}

/*********************************
GUARDAR PERFIL
*********************************/

const form = document.getElementById('formPerfil');

form.addEventListener('submit', async function (e) {

  e.preventDefault();

  const datos = {
    id: jugadorId,
    nombre: nombre.value.trim(),
    apellido: apellido.value.trim(),
    email: email.value.trim(),
    telefono: telefono.value.trim(),
    fechaNacimiento: fechaNacimiento.value,
    dni: dni.value.trim(),
    cuitCuil: cuitCuil.value.trim(),
    avatarUrl: avatarUrlActual
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateJugador',
      ...datos
    })
  });

  const result = await response.json();

  if (result.success) {

    mostrarMensaje("Perfil actualizado");

    if (!esAdminEditando) {

      const updatedUser = {
        ...user,
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email
      };

      localStorage.setItem('arvet_user', JSON.stringify(updatedUser));

    }

  } else {
    mostrarMensaje("Error al actualizar", "error");
  }

});

/*********************************
CAMBIAR AVATAR AUTOMÁTICO
*********************************/

const btnCambiarAvatar = document.getElementById('btnCambiarAvatar');
const inputAvatar = document.getElementById('inputAvatar');
const avatarPreview = document.getElementById('avatarPreview');

btnCambiarAvatar?.addEventListener('click', () => inputAvatar.click());

inputAvatar?.addEventListener('change', async function () {

  const file = this.files[0];
  if (!file) return;

  mostrarMensaje("Subiendo imagen...");

  const formData = new FormData();
  formData.append("image", file);

  try {

    // 1️⃣ subir a imgbb
    const response = await fetch(
      "https://api.imgbb.com/1/upload?key=2c40bfae99afcb6fd536a0e303a77b90",
      {
        method: "POST",
        body: formData
      }
    );

    const result = await response.json();

    if (!result.success) {
      mostrarMensaje("Error subiendo imagen", "error");
      return;
    }

    const nuevaUrl = result.data.medium.url;

    avatarPreview.src = nuevaUrl;

    // 2️⃣ guardar automáticamente en backend
    const save = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateJugador",
        id: jugadorId,
        avatarUrl: nuevaUrl
      })
    });

    const saveResult = await save.json();

    if (saveResult.success) {

      avatarUrlActual = nuevaUrl;

      mostrarMensaje("Foto actualizada correctamente");

      // actualizar también localStorage si es el propio jugador
      if (!esAdminEditando) {

        const updatedUser = {
          ...user,
          avatarUrl: nuevaUrl
        };

        localStorage.setItem("arvet_user", JSON.stringify(updatedUser));

      }

    } else {

      mostrarMensaje("Error guardando avatar", "error");

    }

  } catch (err) {

    console.error(err);
    mostrarMensaje("Error subiendo imagen", "error");

  }

});
/*********************************
LOGOUT
*********************************/

document.getElementById('btnLogout')?.addEventListener('click', () => {

  localStorage.removeItem('arvet_user');
  window.location.href = "login.html";

});

});
