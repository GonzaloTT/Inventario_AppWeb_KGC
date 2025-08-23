// scripts/index.js

// 👇 Copia tus credenciales desde Supabase (Settings → API)
const SUPABASE_URL = "https://acvdzwqcupjoragdzwps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmR6d3FjdXBqb3JhZ2R6d3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDA0NzAsImV4cCI6MjA3MTM3NjQ3MH0._HTE0Bs9pxL4Vv2wDZyE32vrnLI1rzINRNwwz_Jci9o";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Variables globales ---
let inventarioData = []; // guardamos los datos originales

// --- Función para normalizar (quita acentos y pasa a minúsculas) ---
function normalizarTexto(texto) {
  return texto
    ? texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    : "";
}

// --- Renderizar inventario en la tabla ---
function renderInventario(lista) {
  const tbody = document.querySelector(".inventory__table-body");
  tbody.innerHTML = "";

  lista.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.serial}</td>
      <td>${item.codigo}</td>
      <td>${item.area}</td>
      <td>${item.nombre_del_producto}</td>
      <td>${item.articulo}</td>
      <td>${item.existencia}</td>
      <td>${item.responsable}</td>
      <td>${item.entradas}</td>
      <td>${item.salidas}</td>
      <td>${item.comentarios}</td>
      <td>${item.oficina}</td>
      <td>
      <button onclick="editarProducto(${item.id})">✏️</button>
      <button onclick="eliminarProducto(${item.id})">❌</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// --- Cargar inventario desde Supabase ---
async function cargarInventario() {
  const { data, error } = await client.from("inventario").select("*");

  if (error) {
    console.error("❌ Error al cargar inventario:", error);
    return;
  }

  inventarioData = data; // guardamos en memoria
  renderInventario(inventarioData);
}

// --- Filtros: búsqueda + área ---
function aplicarFiltros() {
  const texto = document.getElementById("buscar")?.value.toLowerCase() || "";
  const area = document.getElementById("filtro-area")?.value || "";

  const textoNorm = normalizarTexto(texto);
  const areaNorm = normalizarTexto(area);

  let filtrados = inventarioData;

  // 🔍 búsqueda por texto en cualquier campo
  if (textoNorm) {
    filtrados = filtrados.filter((item) =>
      Object.values(item).some((valor) =>
        normalizarTexto(String(valor)).includes(textoNorm)
      )
    );
  }

  // 🗂️ filtro por área
  if (areaNorm) {
    filtrados = filtrados.filter(
      (item) => normalizarTexto(item.area) === areaNorm
    );
  }

  renderInventario(filtrados);
}

// --- Agregar producto ---
const form = document.getElementById("form-producto");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const nuevoProducto = Object.fromEntries(formData.entries());

    // convertir valores numéricos
    nuevoProducto.existencia = parseInt(nuevoProducto.existencia) || 0;

    const { error } = await client.from("inventario").insert([nuevoProducto]);

    if (error) {
      console.error("❌ Error al insertar:", error);
      alert("Error al insertar producto");
    } else {
      alert("✅ Producto agregado");
      form.reset();
      cargarInventario();
    }
  });
}

// --- Eliminar producto ---
async function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

  const { error } = await client.from("inventario").delete().eq("id", id);

  if (error) {
    console.error("❌ Error al eliminar:", error);
    alert("Error al eliminar");
  } else {
    alert("✅ Producto eliminado");
    cargarInventario();
  }
}

// --- Abrir modal y rellenar datos ---
function editarProducto(id) {
  const producto = inventarioData.find(item => item.id === id);
  if (!producto) return;

  document.getElementById("edit-id").value = producto.id;
  document.getElementById("edit-serial").value = producto.serial || "";
  document.getElementById("edit-codigo").value = producto.codigo || "";
  document.getElementById("edit-area").value = producto.area || "";
  document.getElementById("edit-nombre").value = producto.nombre_del_producto || "";
  document.getElementById("edit-articulo").value = producto.articulo || "";
  document.getElementById("edit-existencia").value = producto.existencia || 0;
  document.getElementById("edit-responsable").value = producto.responsable || "";
  document.getElementById("edit-entradas").value = producto.entradas || "";
  document.getElementById("edit-salidas").value = producto.salidas || "";
  document.getElementById("edit-comentarios").value = producto.comentarios || "";
  document.getElementById("edit-oficina").value = producto.oficina || "";

  document.getElementById("modal-editar").classList.remove("hidden");
}

// --- Cerrar modal ---
function cerrarModal() {
  document.getElementById("modal-editar").classList.add("hidden");
}

// --- Guardar cambios ---
const formEditar = document.getElementById("form-editar");

if (formEditar) {
  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(formEditar);
    const datosEditados = Object.fromEntries(formData.entries());

    datosEditados.existencia = parseInt(datosEditados.existencia) || 0;

    const { error } = await client
      .from("inventario")
      .update(datosEditados)
      .eq("id", datosEditados.id);

    if (error) {
      console.error("❌ Error al actualizar:", error);
      alert("Error al actualizar");
    } else {
      alert("✅ Producto actualizado");
      cerrarModal();
      cargarInventario();
    }
  });
}

// --- Eventos para filtros ---
document.getElementById("buscar")?.addEventListener("input", aplicarFiltros);
document.getElementById("filtro-area")?.addEventListener("change", aplicarFiltros);

// --- Ejecutar al cargar ---
cargarInventario();
