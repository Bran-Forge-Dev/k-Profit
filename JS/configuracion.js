/**
 * 1. CONFIGURACIÓN INICIAL Y PROTECCIÓN DE RUTA
 */
var listaHtml = document.getElementById('lista-productos');
var modalConfig = document.getElementById('modal-form');

/**
 * 2. LEER DATOS (SELECT - Tablas dev_)
 * Consulta la tabla 'dev_productos' filtrando por el usuario logueado.
 */
async function pintarTablaAdmin() {
    const user = await obtenerUsuario();
    if (!user || !listaHtml) return;
    
    // Consultamos solo los productos que pertenecen a este usuario
    const { data: productos, error } = await supabase
        .from('dev_productos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar productos:', error.message);
        return;
    }

    listaHtml.innerHTML = '';

    if (productos.length === 0) {
        listaHtml.innerHTML = `
            <tr>
                <td colspan="5" class="p-10 text-center text-slate-600 italic">
                    No tienes productos registrados. Haz clic en "Nuevo Producto" para comenzar.
                </td>
            </tr>`;
        return;
    }

    // Dibujamos las filas con los datos del usuario
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
 * 3. GUARDAR DATOS (INSERT - Tablas dev_)
 * Envía el nuevo producto vinculándolo permanentemente al ID del usuario.
 */
window.guardarNuevoProducto = async function() {
    const user = await obtenerUsuario();
    if (!user) return;

    const icono = document.getElementById('p-icono').value || '❓';
    const nombre = document.getElementById('p-nombre').value;
    const descripcion = document.getElementById('p-descripcion').value;
    const categoria = document.getElementById('p-categoria').value;
    const precio = document.getElementById('p-precio').value;

    if(!nombre || !precio) return alert("Nombre y Precio son obligatorios");

    // Insertamos en dev_productos con el user_id correspondiente
    const { error } = await supabase
        .from('dev_productos')
        .insert([
            { 
                user_id: user.id, // Vínculo de propiedad
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
        pintarTablaAdmin(); 
    }
};

/**
 * 4. ELIMINAR DATOS (DELETE)
 * El RLS de Supabase asegura que solo el dueño pueda borrarlo, 
 * pero agregamos el filtro de user_id en la consulta por seguridad extra.
 */
window.eliminarProducto = async function(id) {
    const user = await obtenerUsuario();
    if (!user) return;

    if(confirm("¿Seguro que quieres eliminar este producto del catálogo?")) {
        const { error } = await supabase
            .from('dev_productos')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Doble verificación de seguridad

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