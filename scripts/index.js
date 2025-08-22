// scripts/index.js

// 👇 Copia tus credenciales desde Supabase (Settings → API)
const SUPABASE_URL = "https://acvdzwqcupjoragdzwps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmR6d3FjdXBqb3JhZ2R6d3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDA0NzAsImV4cCI6MjA3MTM3NjQ3MH0._HTE0Bs9pxL4Vv2wDZyE32vrnLI1rzINRNwwz_Jci9o";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Cargar inventario ---
async function cargarInventario() {
  const { data, error } = await client
    .from("inventario")
    .select("*");

  if (error) {
    console.error("❌ Error al cargar inventario:", error);
    return;
  }

  const tbody = document.querySelector(".inventory__table-body");
  tbody.innerHTML = "";

  data.forEach(item => {
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
      <td><button onclick="eliminarProducto(${item.id})">❌</button></td>
    `;

    tbody.appendChild(row);
  });
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

    const { error } = await client
      .from("inventario")
      .insert([nuevoProducto]);

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

  const { error } = await client
    .from("inventario")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ Error al eliminar:", error);
    alert("Error al eliminar");
  } else {
    alert("✅ Producto eliminado");
    cargarInventario();
  }
}

// --- Ejecutar al cargar ---
cargarInventario();