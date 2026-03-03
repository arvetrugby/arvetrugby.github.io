document.addEventListener('DOMContentLoaded', async function() {

  const user = JSON.parse(localStorage.getItem('arvet_user'));

  if (!user || user.rol !== 'Jugador') {
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
   CARGAR PERFIL
  *********************************/

  try {

    const response = await fetch(
      `${API_URL}?action=getJugadorById&id=${user.id}`
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
      id: user.id,
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

          avatarUrlActual = result.data.url;
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
            id: user.id,
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
