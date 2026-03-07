/**
 * 1. CONFIGURACIÓN Y ESTADO GLOBAL
 * Usamos var para permitir la coexistencia global sin errores de "already declared".
 */
var insumosDB = [];
var recetasDB = [];
var editandoId = null;

// Referencias al DOM
var tbody = document.getElementById('tabla-insumos');
var modalInsumo = document.getElementById('modal-insumo');
var selectorProducto = document.getElementById('selector-producto-analisis');

/**
 * 2. CARGA DE DATOS DESDE SUPABASE
 * Sincroniza insumos, recetas y productos para el sistema de inventario.
 */
async function cargarDatosInventario() {
    // A. Traer Insumos
    const { data: insumos, error: errI } = await supabase
        .from('insumos')
        .select('*')
        .order('nombre', { ascending: true });

    // B. Traer Recetas vinculadas a sus insumos para obtener costos reales
    const { data: recetas, error: errR } = await supabase
        .from('recetas')
        .select(`
            id,
            cantidad_necesaria,
            producto_id,
            insumos (nombre, costo_unitario, unidad)
        `);

    // C. Traer Productos para llenar el selector de márgenes
    const { data: productos, error: errP } = await supabase
        .from('productos')
        .select('id, nombre')
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
    // Buscamos stocks específicos para los cuadros superiores (Filtro flexible)
    const pollo = insumosDB.find(i => i.nombre.toLowerCase().includes('pollo'));
    const papa = insumosDB.find(i => i.nombre.toLowerCase().includes('papa'));

    if(document.getElementById('resumen-pollo-stock')) 
        document.getElementById('resumen-pollo-stock').innerText = pollo ? `${pollo.stock_actual.toLocaleString()} gr` : '0 gr';
    if(document.getElementById('resumen-papa-stock'))
        document.getElementById('resumen-papa-stock').innerText = papa ? `${papa.stock_actual.toLocaleString()} gr` : '0 gr';
    if(document.getElementById('resumen-total-items'))
        document.getElementById('resumen-total-items').innerText = `${insumosDB.length} Items`;
}

/**
 * 4. ANÁLISIS DE MARGEN
 * Calcula costos basados en los gramos exactos de la receta.
 */
window.actualizarAnalisisMargen = async function() {
    const contenedor = document.getElementById('desglose-receta');
    if (!selectorProducto || !contenedor) return;
    
    const productoId = selectorProducto.value;
    if (!productoId) {
        contenedor.innerHTML = '';
        document.getElementById('calc-precio-venta').innerText = '$0.00';
        document.getElementById('calc-ganancia-neta').innerText = '$0.00';
        document.getElementById('calc-porcentaje').innerText = '0%';
        return;
    }

    // Traer precio de venta actual del producto seleccionado
    const { data: producto } = await supabase.from('productos').select('precio_venta').eq('id', productoId).single();
    
    // Filtrar los insumos (pollo, papas, soda) que componen este producto
    const ingredientes = recetasDB.filter(r => r.producto_id === productoId);
    
    let totalCostoProduccion = 0;
    contenedor.innerHTML = ''; 

    ingredientes.forEach(ing => {
        // Multiplica costo unitario por gramos/piezas fijas de la receta
        const costoCalculado = ing.insumos.costo_unitario * ing.cantidad_necesaria;
        totalCostoProduccion += costoCalculado;
        
        // Renderizado del desglose visual idéntico a la imagen
        contenedor.innerHTML += `
            <div class="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-2xl mb-3 shadow-sm">
                <span class="text-white font-bold">${ing.insumos.nombre} (${ing.cantidad_necesaria}${ing.insumos.unidad || 'gr'})</span>
                <span class="font-mono text-white font-bold tracking-tighter">$${costoCalculado.toFixed(2)}</span>
            </div>`;
    });

    const gananciaBruta = producto.precio_venta - totalCostoProduccion;
    const porcentajeUtilidad = producto.precio_venta > 0 ? (gananciaBruta / producto.precio_venta) * 100 : 0;

    // Actualizar visualización del margen y utilidad
    document.getElementById('calc-precio-venta').innerText = `$${parseFloat(producto.precio_venta).toFixed(2)}`;
    document.getElementById('calc-ganancia-neta').innerText = `$${gananciaBruta.toFixed(2)}`;
    
    const elUtilidad = document.getElementById('calc-porcentaje');
    if(elUtilidad) {
        elUtilidad.innerText = `${porcentajeUtilidad.toFixed(0)}%`;
        elUtilidad.className = "text-green-400 font-black not-italic text-xl ml-2";
    }
}

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
    const n = document.getElementById('insumo-nombre').value;
    const u = document.getElementById('insumo-unidad').value.toLowerCase();
    const c = parseFloat(document.getElementById('insumo-costo').value) || 0;
    const s = parseFloat(document.getElementById('insumo-stock-nuevo').value) || 0;

    if (!n) return alert("El nombre es obligatorio");

    if (editandoId) {
        // Surtir sumando manualmente al stock actual
        const itemActual = insumosDB.find(i => i.id === editandoId);
        const { error } = await supabase
            .from('insumos')
            .update({ 
                nombre: n, 
                unidad: u, 
                costo_unitario: c, 
                stock_actual: itemActual.stock_actual + s 
            })
            .eq('id', editandoId);
        if (error) alert("Error al actualizar");
    } else {
        // Registro de un insumo nuevo
        await supabase.from('insumos').insert([{ nombre: n, unidad: u, costo_unitario: c, stock_actual: s }]);
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