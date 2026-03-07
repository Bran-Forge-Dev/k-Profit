/**
 * 1. CONFIGURACIÓN INICIAL
 */
// Usamos var para permitir la coexistencia global sin errores de "already declared"
var listaHtml = document.getElementById('lista-productos');
var modalConfig = document.getElementById('modal-form');

/**
 * 2. LEER DATOS (SELECT)
 * Consulta la tabla 'productos' en Supabase y renderiza la tabla administrativa.
 */
async function pintarTablaAdmin() {
    if (!listaHtml) return;
    
    // Consultamos la tabla 'productos' en la nube
    const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar productos:', error.message);
        return;
    }

    listaHtml.innerHTML = '';

    // Dibujamos las filas con los datos de la nube
    productos.forEach((p) => {
        listaHtml.innerHTML += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                <td class="p-6 font-bold text-white">
                    <span class="mr-3 text-xl">${p.icono}</span> ${p.nombre}
                </td>
                <td class="p-6 text-slate-400 text-xs italic">${p.descripcion || 'Sin descripción'}</td>
                <td class="p-6 uppercase text-[10px] font-black text-slate-500 tracking-widest">${p.categoria}</td>
                <td class="p-6 font-mono text-green-400 font-bold">$${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td class="p-6 text-right">
                    <button onclick="eliminarProducto('${p.id}')" 
                        class="text-slate-600 hover:text-red-500 font-black text-[10px] uppercase tracking-widest transition-colors">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
}

/**
 * 3. GUARDAR DATOS (INSERT)
 * Envía el nuevo producto directamente a la tabla de Supabase.
 */
window.guardarNuevoProducto = async function() {
    const icono = document.getElementById('p-icono').value || '❓';
    const nombre = document.getElementById('p-nombre').value;
    const descripcion = document.getElementById('p-descripcion').value;
    const categoria = document.getElementById('p-categoria').value;
    const precio = document.getElementById('p-precio').value;

    if(!nombre || !precio) return alert("Nombre y Precio son obligatorios");

    // Insertamos en la tabla 'productos'
    const { error } = await supabase
        .from('productos')
        .insert([
            { 
                icono: icono, 
                nombre: nombre, 
                descripcion: descripcion, 
                categoria: categoria, 
                precio_venta: parseFloat(precio) 
            }
        ]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        cerrarModal();
        pintarTablaAdmin(); // Refrescamos la tabla instantáneamente
    }
};

/**
 * 4. ELIMINAR DATOS (DELETE)
 * Borra el registro de la base de datos usando su ID único.
 */
window.eliminarProducto = async function(id) {
    if(confirm("¿Seguro que quieres eliminar este producto del catálogo?")) {
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error al eliminar: " + error.message);
        } else {
            pintarTablaAdmin();
        }
    }
};

/**
 * 5. CONTROLES DEL MODAL
 */
window.abrirModal = () => {
    if(modalConfig) modalConfig.classList.remove('hidden');
};

window.cerrarModal = () => {
    if(modalConfig) modalConfig.classList.add('hidden');
    // Limpiar campos para la siguiente entrada
    document.getElementById('p-icono').value = '';
    document.getElementById('p-nombre').value = '';
    document.getElementById('p-descripcion').value = '';
    document.getElementById('p-precio').value = '';
};

/**
 * 6. INICIALIZACIÓN
 */
function marcarPaginaActiva() {
    let currentPath = window.location.pathname.split("/").pop().toLowerCase() || "index.html";
    document.querySelectorAll('nav a').forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop().toLowerCase();
        if (currentPath === linkPath) {
            link.classList.add('text-orange-500', 'border-b-2', 'border-orange-500');
            link.classList.remove('text-slate-400');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    marcarPaginaActiva();
    pintarTablaAdmin();
});