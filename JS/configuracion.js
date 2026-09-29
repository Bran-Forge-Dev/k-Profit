/**
 * 1. CONFIGURACIÓN INICIAL Y PROTECCIÓN DE RUTA
 */
var listaHtml = document.getElementById('lista-productos');
var modalConfig = document.getElementById('modal-form');
var productosDB = [];
var editandoProductoId = null;

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
    productosDB = productos;

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
                <td class="p-6 text-right space-x-4">
                    <button onclick="prepararEdicionProducto('${p.id}')"
                        class="text-slate-600 hover:text-orange-500 font-black text-[10px] uppercase tracking-widest transition-colors">
                        Editar
                    </button>
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

    const datos = {
        icono: icono,
        nombre: nombre,
        descripcion: descripcion,
        categoria: categoria,
        precio_venta: parseFloat(precio)
    };

    let error;
    if (editandoProductoId) {
        // UPDATE: edición de producto existente
        ({ error } = await supabase
            .from('dev_productos')
            .update(datos)
            .eq('id', editandoProductoId)
            .eq('user_id', user.id));
    } else {
        // INSERT: nuevo producto vinculado al user_id
        datos.user_id = user.id;
        ({ error } = await supabase.from('dev_productos').insert([datos]));
    }

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
 * 4.5 SELECTOR DE EMOJIS
 * Catálogo por categorías; el grid se pinta dinámicamente.
 */
var EMOJIS = {
    '🍗 Pollo y rápida': ['🍗','🍔','🍟','🌭','🍕','🌮','🌯','🥪','🫔','🥡','🍤','🍖','🍘'],
    '🍽️ Comida':        ['🥩','🥓','🐟','🦐','🍝','🍜','🍲','🥘','🍛','🍱','🥗','🫕','🍳','🥙','🧆','🍚','🫓','🥟','🍢','🥠'],
    '🥐 Pan y desayuno': ['🥐','🥯','🍞','🥞','🧇','🧀','🥚','🍳','🥣','🥛','🧈','🥖'],
    '🍰 Postres':        ['🍰','🧁','🍦','🍨','🍧','🍩','🍪','🎂','🍫','🍬','🍭','🥧','🍮','🍡','🥮','🍯'],
    '🥤 Bebidas':        ['🥤','🧃','🧋','🍹','🍸','🧉','🫗','🥛','🍼','🍶','🍺','🍻','🍷','🥂','🍾','🥃','🫖'],
    '☕ Café':           ['☕','🍵','🫖','🧋','🥛','🍯','🫘'],
    '🍎 Frutas':         ['🍎','🍊','🍋','🍉','🍇','🍓','🫐','🍑','🍍','🥭','🍌','🥑','🍅','🍒','🥝','🍈','🍐','🥥'],
    '🥬 Verduras':       ['🥦','🥕','🌽','🌶️','🫑','🥒','🥬','🧄','🧅','🍄','🥔','🍠','🫛','🫜','🍆','🥗'],
    '🍿 Snacks':         ['🍿','🥨','🥜','🧂','🫘','🥫','🧊','🍬','🌰','🍥']
};

window.abrirSelectorEmoji = function() {
    const modal = document.getElementById('modal-emoji');
    if (!modal) return;
    pintarFiltrosEmoji();
    pintarEmojis('todo');
    modal.classList.remove('hidden');
};

window.cerrarSelectorEmoji = function() {
    const modal = document.getElementById('modal-emoji');
    if (modal) modal.classList.add('hidden');
};

window.seleccionarEmoji = function(emoji) {
    document.getElementById('p-icono').value = emoji;
    cerrarSelectorEmoji();
};

function pintarFiltrosEmoji() {
    const cont = document.getElementById('emoji-filtros');
    if (!cont) return;
    const categorias = ['todo', ...Object.keys(EMOJIS)];
    cont.innerHTML = categorias.map(cat =>
        `<button type="button" onclick="pintarEmojis('${cat}')"
            class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-slate-800 text-slate-400 hover:bg-orange-600 hover:text-white transition-all">
            ${cat === 'todo' ? '🌟 Todo' : cat}
        </button>`
    ).join('');
}

window.pintarEmojis = function(categoria) {
    const grid = document.getElementById('grid-emojis');
    if (!grid) return;
    const grupos = categoria === 'todo' ? Object.keys(EMOJIS) : [categoria];
    grid.innerHTML = grupos.flatMap(grupo =>
        EMOJIS[grupo].map(em =>
            `<button type="button" onclick="seleccionarEmoji('${em}')"
                class="text-2xl p-2 bg-slate-800 hover:bg-orange-600 rounded-xl transition-all active:scale-90">${em}</button>`
        )
    ).join('');
};

/**
 * 4.6 CAMBIAR CONTRASEÑA
 * El usuario ya está logueado, así que basta un updateUser;
 * no requiere correo ni confirmación adicional.
 */
async function pintarCuenta() {
    const user = await obtenerUsuario();
    if (!user) return;

    const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre_negocio')
        .eq('id', user.id)
        .single();

    const elNegocio = document.getElementById('cuenta-negocio');
    const elEmail = document.getElementById('cuenta-email');
    if (elNegocio) elNegocio.innerText = (perfil && perfil.nombre_negocio) || 'Negocio sin nombre';
    if (elEmail) elEmail.innerText = user.email;
}

window.cambiarPassword = async function() {
    const nueva = document.getElementById('pw-nueva').value;
    const confirmar = document.getElementById('pw-confirmar').value;

    if (nueva.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    if (nueva !== confirmar) return alert("Las contraseñas no coinciden");

    const { error } = await supabase.auth.updateUser({ password: nueva });

    if (error) {
        alert("Error al actualizar: " + error.message);
    } else {
        alert("Contraseña actualizada correctamente");
        document.getElementById('pw-nueva').value = '';
        document.getElementById('pw-confirmar').value = '';
    }
};

/**
 * 5. CONTROLES DEL MODAL
 */
window.prepararEdicionProducto = function(id) {
    const p = productosDB.find(x => x.id === id);
    if (!p) return;
    editandoProductoId = id;
    document.getElementById('p-icono').value = p.icono || '';
    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-descripcion').value = p.descripcion || '';
    document.getElementById('p-categoria').value = p.categoria;
    document.getElementById('p-precio').value = p.precio_venta;
    const titulo = document.getElementById('modal-form-titulo');
    if (titulo) titulo.innerText = 'Editar Producto';
    if (modalConfig) modalConfig.classList.remove('hidden');
};

window.abrirModal = () => {
    editandoProductoId = null;
    const titulo = document.getElementById('modal-form-titulo');
    if (titulo) titulo.innerText = 'Datos del Producto';
    if(modalConfig) modalConfig.classList.remove('hidden');
};

window.cerrarModal = () => {
    if(modalConfig) modalConfig.classList.add('hidden');
    editandoProductoId = null;
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
    pintarCuenta();
});