// Variables globales
let supabase = null;
let inventoryData = [];

// Elementos DOM
const loadingEl = document.getElementById('loading');
const inventoryBody = document.getElementById('inventoryBody');
const emptyState = document.getElementById('emptyState');
const qrModal = document.getElementById('qrModal');
const configModal = document.getElementById('configModal');
const tableContainer = document.querySelector('.table-container');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Aplicación iniciada');
    initializeApp();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Botones principales
    document.getElementById('reloadBtn').addEventListener('click', loadInventoryData);
    document.getElementById('addBtn').addEventListener('click', addNewItem);
    
    // Modal de QR
    document.querySelector('.close').addEventListener('click', closeQRModal);
    window.addEventListener('click', function(event) {
        if (event.target === qrModal) {
            closeQRModal();
        }
        if (event.target === configModal && supabase) {
            configModal.style.display = 'none';
        }
    });
}

// Inicializar la aplicación
async function initializeApp() {
    const config = getStoredConfig();
    
    if (!config.url || !config.key) {
        showConfigModal();
        return;
    }
    
    try {
        // Inicializar Supabase
        supabase = window.supabase.createClient(config.url, config.key);
        console.log('Supabase inicializado correctamente');
        
        // Verificar conexión creando la tabla si no existe
        await createTableIfNotExists();
        
        // Cargar datos
        await loadInventoryData();
        
    } catch (error) {
        console.error('Error al inicializar:', error);
        showError('Error de conexión con Supabase. Verifica tu configuración.');
        showConfigModal();
    }
}

// Obtener configuración almacenada
function getStoredConfig() {
    return {
        url: localStorage.getItem('supabase_url') || '',
        key: localStorage.getItem('supabase_key') || ''
    };
}

// Guardar configuración
function saveConfig() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    
    if (!url || !key) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    
    configModal.style.display = 'none';
    
    // Reinicializar la aplicación
    location.reload();
}

// Mostrar modal de configuración
function showConfigModal() {
    const config = getStoredConfig();
    document.getElementById('supabaseUrl').value = config.url;
    document.getElementById('supabaseKey').value = config.key;
    configModal.style.display = 'block';
}

// Crear tabla si no existe
async function createTableIfNotExists() {
    try {
        // Intentar hacer una consulta simple para verificar si la tabla existe
        const { data, error } = await supabase
            .from('inventory')
            .select('id')
            .limit(1);
            
        if (error && error.code === 'PGRST116') {
            // La tabla no existe, mostrar instrucciones
            console.log('La tabla inventory no existe');
            showTableCreationInstructions();
        }
    } catch (error) {
        console.error('Error verificando tabla:', error);
    }
}

// Mostrar instrucciones para crear tabla
function showTableCreationInstructions() {
    const message = `
    La tabla 'inventory' no existe en tu base de datos.
    
    Créala en Supabase con este SQL:
    
    CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(100),
        area VARCHAR(100),
        nombre VARCHAR(200),
        categoria VARCHAR(100),
        responsable VARCHAR(100),
        entrada INTEGER DEFAULT 0,
        salida INTEGER DEFAULT 0,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    Luego recarga la página.
    `;
    
    alert(message);
}

// Cargar datos del inventario
async function loadInventoryData() {
    if (!supabase) {
        showConfigModal();
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        inventoryData = data || [];
        renderInventoryTable();
        showSuccess('Datos cargados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error al cargar los datos: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Renderizar tabla
function renderInventoryTable() {
    if (inventoryData.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    inventoryBody.innerHTML = inventoryData.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.codigo || '-'}</td>
            <td>${item.area || '-'}</td>
            <td>${item.nombre || '-'}</td>
            <td>${item.categoria || '-'}</td>
            <td>${item.responsable || '-'}</td>
            <td>${item.entrada || 0}</td>
            <td>${item.salida || 0}</td>
            <td>${item.descripcion || '-'}</td>
            <td>
                <button class="btn btn-qr" onclick="showQRCode(${item.id}, '${item.nombre || 'Item'}')">
                    📱 QR
                </button>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Agregar nuevo item
async function addNewItem() {
    if (!supabase) {
        showConfigModal();
        return;
    }
    
    // Obtener datos mediante prompts
    const codigo = prompt('Código del item:') || '';
    const area = prompt('Área:') || '';
    const nombre = prompt('Nombre del item:') || '';
    
    if (!nombre.trim()) {
        alert('El nombre es obligatorio');
        return;
    }
    
    const categoria = prompt('Categoría:') || '';
    const responsable = prompt('Responsable:') || '';
    const entrada = parseInt(prompt('Cantidad de entrada:') || '0');
    const salida = parseInt(prompt('Cantidad de salida:') || '0');
    const descripcion = prompt('Descripción:') || '';
    
    const newItem = {
        codigo: codigo.trim(),
        area: area.trim(),
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        responsable: responsable.trim(),
        entrada: isNaN(entrada) ? 0 : entrada,
        salida: isNaN(salida) ? 0 : salida,
        descripcion: descripcion.trim()
    };
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase
            .from('inventory')
            .insert([newItem])
            .select();
        
        if (error) {
            throw error;
        }
        
        showSuccess('Item agregado correctamente');
        await loadInventoryData();
        
    } catch (error) {
        console.error('Error agregando item:', error);
        showError('Error al agregar item: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Eliminar item
async function deleteItem(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este item?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        showSuccess('Item eliminado correctamente');
        await loadInventoryData();
        
    } catch (error) {
        console.error('Error eliminando item:', error);
        showError('Error al eliminar item: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Mostrar código QR
function showQRCode(id, name) {
    const qrContainer = document.getElementById('qrcode');
    const itemInfo = document.getElementById('qrItemInfo');
    
    // Limpiar contenido previo
    qrContainer.innerHTML = '';
    
    // Generar QR code
    QRCode.toCanvas(qrContainer, id.toString(), {
        width: 200,
        height: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('Error generando QR:', error);
            qrContainer.innerHTML = '<p>Error generando código QR</p>';
        }
    });
    
    itemInfo.textContent = `ID: ${id} - ${name}`;
    qrModal.style.display = 'block';
}

// Cerrar modal QR
function closeQRModal() {
    qrModal.style.display = 'none';
}

// Utilidades de UI
function showLoading(show) {
    loadingEl.style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `status-message status-${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Insertar en el DOM
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función global para el botón del empty state
window.addNewItem = addNewItem;

// Manejo de errores globales
window.addEventListener('error', function(event) {
    console.error('Error global:', event.error);
});

// Función para exportar datos (bonus)
function exportToCSV() {
    if (inventoryData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const headers = ['ID', 'Código', 'Área', 'Nombre', 'Categoría', 'Responsable', 'Entrada', 'Salida', 'Descripción'];
    const csvContent = [
        headers.join(','),
        ...inventoryData.map(item => [
            item.id,
            `"${item.codigo || ''}"`,
            `"${item.area || ''}"`,
            `"${item.nombre || ''}"`,
            `"${item.categoria || ''}"`,
            `"${item.responsable || ''}"`,
            item.entrada || 0,
            item.salida || 0,
            `"${item.descripcion || ''}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Agregar botón de exportación (opcional)
document.addEventListener('DOMContentLoaded', function() {
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-secondary';
        exportBtn.innerHTML = '<span>📊</span> Exportar CSV';
        exportBtn.onclick = exportToCSV;
        buttonGroup.appendChild(exportBtn);
    }
});

console.log('Script cargado correctamente');