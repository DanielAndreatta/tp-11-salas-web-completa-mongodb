function crearControladorReservas(servicioReservas) {
  const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
  const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

  async function estado(req, res) {
    res.json({
      servicio: "activo",
      reservas: await servicioReservas.contar(),
      solicitudId: res.locals.solicitudId,
    });
  }

  // Controladores HTML (Sitio Web)
  async function listar(req, res) {
    const reservas = await servicioReservas.listar();
    res.render("reservas/lista", { titulo: "Salas reservadas", reservas });
  }

  function mostrarFormulario(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: null,
      valores: {},
      salasPermitidas,
      turnosPermitidos,
    });
  }

  async function mostrarDetalle(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }
    res.render("reservas/detalle", {
      titulo: `Reserva #${reserva.id}`,
      reserva,
    });
  }

  async function crear(req, res) {
    await servicioReservas.crear(req.reservaValidada);
    res.redirect("/reservas");
  }

  // Controladores JSON (API)
  async function listarApi(req, res) {
    const permitidos = ["sala", "orden", "pagina", "limite"]; // <-- Ampliado

    for (const campo of Object.keys(req.query)) {
      if (!permitidos.includes(campo)) {
        return res.status(400).json({ error: "Parámetro no permitido." });
      }
    }

    const sala = req.query.sala;
    if (sala !== undefined) {
      if (typeof sala !== "string" || sala.trim() === "") {
        return res.status(400).json({
          error: "El filtro de sala debe ser un texto válido y no vacío.",
        });
      }
    }

    let orden = "estudiante";
    if (req.query.orden !== undefined) {
      orden = req.query.orden;
      if (
        orden !== "estudiante" &&
        orden !== "personas-asc" &&
        orden !== "personas-desc"
      ) {
        return res.status(400).json({ error: "Orden no permitido." });
      }
    }

    // Paginación: Valores por defecto
    let pagina = 1;
    let limite = 2;

    if (req.query.pagina !== undefined) {
      // Validamos que no llegue repetido como arreglo
      if (typeof req.query.pagina !== "string") {
        return res
          .status(400)
          .json({ error: "La página debe ser un único valor textual." });
      }
      const p = Number(req.query.pagina);
      if (!Number.isInteger(p) || p < 1 || p > 1000) {
        return res.status(400).json({
          error: "La página debe ser un número entero entre 1 y 1000.",
        });
      }
      pagina = p;
    }

    if (req.query.limite !== undefined) {
      if (typeof req.query.limite !== "string") {
        return res
          .status(400)
          .json({ error: "El límite debe ser un único valor textual." });
      }
      const l = Number(req.query.limite);
      if (!Number.isInteger(l) || l < 1 || l > 20) {
        return res
          .status(400)
          .json({ error: "El límite debe ser un número entero entre 1 y 20." });
      }
      limite = l;
    }

    // Enviamos los 4 argumentos al servicio
    const resultado = await servicioReservas.consultar(
      sala,
      orden,
      pagina,
      limite,
    );
    res.json(resultado);
  }

  async function obtenerApi(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }
    res.json(reserva);
  }

  async function crearApi(req, res) {
    const reserva = await servicioReservas.crear(req.reservaValidada);
    // Retornamos 201 Created y la cabecera Location con la ruta de la nueva reserva
    res.location(`/api/reservas/${reserva.id}`).status(201).json(reserva);
  }

  // NUEVOS CONTROLADORES TP09

  async function eliminarApi(req, res) {
    const eliminado = await servicioReservas.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.status(204).end();
  }

  async function reemplazarApi(req, res) {
    const reserva = await servicioReservas.reemplazar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  async function actualizarApi(req, res) {
    const reserva = await servicioReservas.actualizar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  return {
    estado,
    listar,
    mostrarFormulario,
    mostrarDetalle,
    crear,
    listarApi,
    obtenerApi,
    crearApi,
    eliminarApi,
    reemplazarApi,
    actualizarApi,
  };
}

module.exports = { crearControladorReservas };
