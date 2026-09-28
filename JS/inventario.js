/**
 * 1. CONFIGURACIÓN, ESTADO GLOBAL Y PROTECCIÓN DE RUTA
 */
var insumosDB = [];
var recetasDB = [];
var editandoId = null;

// Referencias al DOM
var tbody = document.getElementById('tabla-insumos');
var modalInsumo = document.getElementById('modal-insumo');
var selectorProducto = document.getElementById('selector-producto-analisis');

/**
 * 2. CARGA DE DATOS DESDE SUPABASE (Tablas dev_)
 */
async function cargarDatosInventario() {
    const user = await obtenerUsuario();
    if (!user) return;

    // A. Traer Insumos
    const { data: insumos, error: errI } = await supabase
        .from('dev_insumos')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre', { ascending: true });

    // B. Traer Recetas vinculadas
    const { data: recetas, error: errR } = await supabase
        .from('dev_recetas')
        .select(`
            id,
            cantidad_necesaria,
            producto_id,
            insumo_id,
            dev_insumos (nombre, costo_unitario, unidad)
        `)
        .eq('user_id', user.id);

    // C. Traer Productos para el selector de márgenes
    const { data: productos, error: errP } = await supabase
        .from('dev_productos')
        .select('id, nombre')
        .eq('user_id', user.id)
        .order('nombre', { ascending: true });

    if (errI || errR || errP) return console.error("Error cargando datos de inventario");

    insumosDB = insumos || [];
    recetasDB = recetas || [];

    // Llenar selector dinámicamente
    if (selectorProducto) {
        selectorProducto.innerHTML = '<option value="">Selecciona un producto...</option>' + 
            productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    }

    renderizarTablaInsumos();
    actualizarResumenSuperior();
    actualizarAnalisisMargen();
}

/**
 * 3. RENDERIZADO DE INTERFAZ (TABLA Y RESUMEN)
 */
function renderizarTablaInsumos() {
    if (!tbody) return;
    tbody.innerHTML = '';

    insumosDB.forEach(item => {
        tbody.innerHTML += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/20 transition-colors text-sm">
                <td class="p-6 font-bold text-white tracking-tight">${item.nombre}</td>
                <td class="p-6 text-slate-500 italic uppercase text-xs tracking-widest">${item.unidad}</td>
                <td class="p-6 text-center">
                    <span class="bg-slate-950 px-3 py-1 rounded-full font-mono text-orange-400 border border-orange-500/20 shadow-inner">
                        ${item.stock_actual.toLocaleString()} <small class="text-[9px] uppercase">${item.unidad}</small>
                    </span>
                </td>
                <td class="p-6 font-mono text-green-400 text-center font-bold">$${parseFloat(item.costo_unitario).toFixed(4)}</td>
                <td class="p-6 text-right">
                    <button onclick="prepararEdicion('${item.id}')" class="bg-slate-800 hover:bg-orange-600 text-orange-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all">SURTIR / EDITAR</button>
                </td>
            </tr>`;
    });
}

function actualizarResumenSuperior() {
    const pollo = insumosDB.find(i => i.nombre.toLowerCase().includes('pollo'));
    const papa = insumosDB.find(i => i.nombre.toLowerCase().includes('papa'));

    if(document.getElementById('resumen-pollo-stock')) 
        document.getElementById('resumen-pollo-stock').innerText = pollo ? `${pollo.stock_actual.toLocaleString()} ${pollo.unidad}` : '0 gr';
    if(document.getElementById('resumen-papa-stock'))
        document.getElementById('resumen-papa-stock').innerText = papa ? `${papa.stock_actual.toLocaleString()} ${papa.unidad}` : '0 gr';
    if(document.getElementById('resumen-total-items'))
        document.getElementById('resumen-total-items').innerText = `${insumosDB.length} Items`;
}

/**
 * 4. ANÁLISIS DE MARGEN
 */
window.actualizarAnalisisMargen = async function() {
    const user = await obtenerUsuario();
    const contenedor = document.getElementById('desglose-receta');
    if (!user || !selectorProducto || !contenedor) return;
    
    const productoId = selectorProducto.value;
    if (!productoId) {
        contenedor.innerHTML = '';
        document.getElementById('calc-precio-venta').innerText = '$0.00';
        document.getElementById('calc-ganancia-neta').innerText = '$0.00';
        document.getElementById('calc-porcentaje').innerText = '0%';
        return;
    }

    const { data: producto } = await supabase.from('dev_productos').select('precio_venta').eq('id', productoId).eq('user_id', user.id).single();

    const ingredientes = recetasDB.filter(r => r.producto_id === productoId);

    let totalCostoProduccion = 0;
    contenedor.innerHTML = '<p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Ingredientes de la receta</p>';

    ingredientes.forEach(ing => {
        const infoInsumo = ing.dev_insumos;
        const costoCalculado = infoInsumo.costo_unitario * ing.cantidad_necesaria;
        totalCostoProduccion += costoCalculado;

        contenedor.innerHTML += `
            <div class="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-2xl mb-3 shadow-sm">
                <span class="text-white font-bold">${infoInsumo.nombre} (${ing.cantidad_necesaria}${infoInsumo.unidad || 'gr'})</span>
                <div class="flex items-center gap-4">
                    <span class="font-mono text-white font-bold tracking-tighter">$${costoCalculado.toFixed(2)}</span>
                    <button onclick="eliminarIngredienteReceta('${ing.id}')" title="Quitar de la receta"
                        class="text-slate-600 hover:text-red-500 font-black text-sm transition-colors">✕</button>
                </div>
            </div>`;
    });

    if (ingredientes.length === 0) {
        contenedor.innerHTML += '<p class="text-slate-600 italic text-xs mb-3">Este producto no tiene receta todavía. Agrega su primer ingrediente:</p>';
    }

    contenedor.innerHTML += `
        <div class="flex flex-wrap gap-2 items-center p-3 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
            <select id="nuevo-ing-insumo" class="flex-1 min-w-[140px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500 cursor-pointer">
                <option value="">+ Insumo...</option>
                ${insumosDB.map(i => `<option value="${i.id}">${i.nombre} (${i.unidad})</option>`).join('')}
            </select>
            <input type="number" id="nuevo-ing-cantidad" placeholder="Cant." step="0.01" min="0"
                class="w-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white text-center outline-none focus:border-orange-500 font-mono">
            <button onclick="agregarIngredienteReceta()"
                class="bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                Agregar
            </button>
        </div>`;

    const gananciaBruta = (producto?.precio_venta || 0) - totalCostoProduccion;
    const porcentajeUtilidad = producto?.precio_venta > 0 ? (gananciaBruta / producto.precio_venta) * 100 : 0;

    document.getElementById('calc-precio-venta').innerText = `$${parseFloat(producto?.precio_venta || 0).toFixed(2)}`;
    document.getElementById('calc-ganancia-neta').innerText = `$${gananciaBruta.toFixed(2)}`;
    
    const elUtilidad = document.getElementById('calc-porcentaje');
    if(elUtilidad) {
        elUtilidad.innerText = `${porcentajeUtilidad.toFixed(0)}%`;
        elUtilidad.className = "text-green-400 font-black not-italic text-xl ml-2";
    }
}

/**
 * 4.5 EDICIÓN DE RECETAS (agregar / quitar ingredientes)
 */
async function refrescarRecetas() {
    const selPrevio = selectorProducto ? selectorProducto.value : '';
    await cargarDatosInventario();
    if (selectorProducto && selPrevio) {
        selectorProducto.value = selPrevio;
        actualizarAnalisisMargen();
    }
}

window.agregarIngredienteReceta = async function() {
    const user = await obtenerUsuario();
    if (!user || !selectorProducto) return;

    const productoId = selectorProducto.value;
    const insumoId = document.getElementById('nuevo-ing-insumo').value;
    const cantidad = parseFloat(document.getElementById('nuevo-ing-cantidad').value);

    if (!insumoId || !(cantidad > 0)) return alert("Elige un insumo y una cantidad válida");
    if (recetasDB.some(r => r.producto_id === productoId && r.dev_insumos && r.insumo_id === insumoId)) {
        return alert("Ese insumo ya está en la receta — quítalo y vuelve a agregarlo para cambiar la cantidad");
    }

    const { error } = await supabase.from('dev_recetas').insert([{
        user_id: user.id,
        producto_id: productoId,
        insumo_id: insumoId,
        cantidad_necesaria: cantidad
    }]);

    if (error) {
        alert("Error al agregar ingrediente: " + error.message);
    } else {
        refrescarRecetas();
    }
};

window.eliminarIngredienteReceta = async function(recetaId) {
    const user = await obtenerUsuario();
    if (!user) return;

    const { error } = await supabase
        .from('dev_recetas')
        .delete()
        .eq('id', recetaId)
        .eq('user_id', user.id);

    if (error) {
        alert("Error al quitar ingrediente: " + error.message);
    } else {
        refrescarRecetas();
    }
};

/**
 * 5. GESTIÓN DE MODAL (SURTIR / NUEVO)
 */
window.prepararNuevo = function() {
    editandoId = null;
    document.getElementById('insumo-nombre').value = '';
    document.getElementById('insumo-unidad').value = 'gr';
    document.getElementById('insumo-costo').value = '';
    document.getElementById('insumo-stock-nuevo').value = ''; 
    document.getElementById('label-unidad-dinamica').innerText = 'gr';
    document.getElementById('modal-titulo').innerText = "Nuevo Insumo";
    modalInsumo.classList.remove('hidden');
}

window.prepararEdicion = function(id) {
    const item = insumosDB.find(i => i.id === id);
    editandoId = id;
    document.getElementById('insumo-nombre').value = item.nombre;
    document.getElementById('insumo-unidad').value = item.unidad;
    document.getElementById('insumo-costo').value = item.costo_unitario;
    document.getElementById('insumo-stock-nuevo').value = ''; 
    document.getElementById('label-unidad-dinamica').innerText = item.unidad;
    document.getElementById('modal-titulo').innerText = `Surtir ${item.nombre}`;
    modalInsumo.classList.remove('hidden');
}

window.cerrarModalInsumo = function() { modalInsumo.classList.add('hidden'); }

window.guardarInsumo = async function() {
    const user = await obtenerUsuario();
    if (!user) return;

    const n = document.getElementById('insumo-nombre').value;
    const u = document.getElementById('insumo-unidad').value.toLowerCase();
    const c = parseFloat(document.getElementById('insumo-costo').value) || 0;
    const s = parseFloat(document.getElementById('insumo-stock-nuevo').value) || 0;

    if (!n) return alert("El nombre es obligatorio");

    if (editandoId) {
        const itemActual = insumosDB.find(i => i.id === editandoId);
        const { error } = await supabase
            .from('dev_insumos')
            .update({ 
                nombre: n, 
                unidad: u, 
                costo_unitario: c, 
                stock_actual: itemActual.stock_actual + s 
            })
            .eq('id', editandoId)
            .eq('user_id', user.id);
        if (error) alert("Error al actualizar");
    } else {
        await supabase.from('dev_insumos').insert([{ 
            user_id: user.id,
            nombre: n, 
            unidad: u, 
            costo_unitario: c, 
            stock_actual: s 
        }]);
    }

    modalInsumo.classList.add('hidden');
    cargarDatosInventario();
}

/**
 * 6. NAVEGACIÓN Y CARGA INICIAL
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
    cargarDatosInventario();

    const inputUnidad = document.getElementById('insumo-unidad');
    if(inputUnidad){
        inputUnidad.addEventListener('input', (e) => {
            const label = document.getElementById('label-unidad-dinamica');
            if (label) label.innerText = e.target.value || '...';
        });
    }
});