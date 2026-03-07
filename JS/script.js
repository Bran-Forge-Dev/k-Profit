/**
 * 1. CONFIGURACIÓN Y ESTADO GLOBAL
 * Usamos 'var' para evitar el error "Identifier already declared" si se recarga el script.
 */
var carrito = carrito || []; 

// Referencias al DOM
const gridProductos = document.getElementById('grid-productos');
const contenedorCarrito = document.getElementById('contenedor-carrito');
const displayTotalTicket = document.getElementById('total-ticket');
const modalCobro = document.getElementById('modal-cobro');
const inputEfectivo = document.getElementById('input-efectivo');

/**
 * 2. CARGA DINÁMICA DESDE SUPABASE
 */
async function cargarCatalogoDinamico() {
    if (!gridProductos) return;
    gridProductos.innerHTML = '';

    const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al cargar catálogo:', error.message);
        return;
    }

    if (productos.length === 0) {
        gridProductos.innerHTML = '<div class="col-span-full text-center p-20 text-slate-600 italic">No hay productos disponibles.</div>';
        return;
    }

    productos.forEach(prod => {
        gridProductos.innerHTML += `
            <button class="producto-card ${prod.categoria} group bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl transition-all hover:border-orange-500 active:scale-95 text-left" 
            onclick="agregarAlCarrito('${prod.nombre}', ${prod.precio_venta}, '${prod.id}')">
                <span class="text-4xl mb-3 block">${prod.icono}</span> 
                <h3 class="font-black text-lg leading-tight text-white uppercase italic tracking-tighter">${prod.nombre}</h3>
                <p class="text-slate-400 text-[11px] mt-1 mb-3 line-clamp-2 leading-tight">
                    ${prod.descripcion || 'Sin descripción detallada'}
                </p>
                <span class="text-orange-500 font-mono font-bold text-xl block">$${parseFloat(prod.precio_venta).toFixed(2)}</span>
            </button>`;
    });
}

/**
 * 3. LÓGICA DEL CARRITO
 */
function actualizarInterfaz() {
    if (!contenedorCarrito) return;
    contenedorCarrito.innerHTML = '';
    let totalAcumulado = 0;

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = '<p class="text-slate-500 italic text-center mt-10 text-xs">Esperando orden...</p>';
        displayTotalTicket.innerText = `$0.00`;
        return;
    }

    carrito.forEach((item, index) => {
        totalAcumulado += item.precio * item.cantidad;
        contenedorCarrito.innerHTML += `
            <div class="flex justify-between items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 mb-2">
                <div class="max-w-[140px]">
                    <p class="font-bold text-xs truncate text-white">${item.nombre}</p>
                    <p class="text-[10px] text-slate-500 font-mono">$${item.precio.toFixed(2)} c/u</p>
                </div>
                <div class="flex items-center gap-2 bg-slate-950 p-1 rounded-xl">
                    <button onclick="cambiarCantidad(${index}, -1)" class="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-lg text-xs hover:bg-slate-700">-</button>
                    <span class="font-mono text-xs font-bold w-4 text-center text-white">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" class="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-lg text-xs hover:bg-slate-700">+</button>
                </div>
            </div>`;
    });
    displayTotalTicket.innerText = `$${totalAcumulado.toFixed(2)}`;
}

window.agregarAlCarrito = (nombre, precio, id) => {
    const existe = carrito.find(p => p.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({ id, nombre, precio, cantidad: 1 });
    actualizarInterfaz();
};

window.cambiarCantidad = (index, cambio) => {
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
    actualizarInterfaz();
};

window.vaciarCarrito = () => { if(confirm("¿Vaciar orden?")) { carrito = []; actualizarInterfaz(); } };

/**
 * 4. LÓGICA DE COBRO, RESTA DE STOCK Y FINANZAS
 */
window.confirmarVenta = async () => {
    const total = parseFloat(displayTotalTicket.innerText.replace('$', ''));
    const pago = parseFloat(inputEfectivo.value) || 0;

    if (pago < total) return alert("El pago es menor al total");

    try {
        // A. Registrar la venta en la nube
        const { error: errorVenta } = await supabase
            .from('ventas')
            .insert([{ total_venta: total, pago_con: pago, cambio: pago - total }]);

        if (errorVenta) throw errorVenta;

        // B. DESCUENTO AUTOMÁTICO DE STOCK POR RECETA (GRAMOS/PIEZAS)
        for (const item of carrito) {
            // Buscamos los componentes del producto en la tabla 'recetas'
            const { data: receta, error: errReceta } = await supabase
                .from('recetas')
                .select('insumo_id, cantidad_necesaria')
                .eq('producto_id', item.id);

            if (receta && receta.length > 0) {
                for (const ingrediente of receta) {
                    const descuentoTotal = ingrediente.cantidad_necesaria * item.cantidad;
                    
                    // 1. Consultar stock actual del insumo
                    const { data: insumo } = await supabase
                        .from('insumos')
                        .select('stock_actual')
                        .eq('id', ingrediente.insumo_id)
                        .single();
                    
                    if (insumo) {
                        // 2. Ejecutar la resta: Stock Actual - Cantidad necesaria
                        await supabase
                            .from('insumos')
                            .update({ stock_actual: insumo.stock_actual - descuentoTotal })
                            .eq('id', ingrediente.insumo_id);
                    }
                }
            }
        }

        // C. Distribución Financiera (40/10/50)
        await actualizarCajasFinancieras(total);

        alert("¡Venta exitosa! El inventario se ha actualizado correctamente.");
        carrito = []; 
        actualizarInterfaz();
        cerrarModal();
        cargarCatalogoDinamico(); 

    } catch (err) {
        console.error("Error crítico:", err);
        alert("Error al procesar la venta. Revisa la consola.");
    }
};

async function actualizarCajasFinancieras(montoTotal) {
    const { data: cajas } = await supabase.from('cajas_financieras').select('*');
    if (!cajas) return;

    for (const caja of cajas) {
        const incremento = (montoTotal * caja.porcentaje) / 100;
        await supabase
            .from('cajas_financieras')
            .update({ saldo_acumulado: caja.saldo_acumulado + incremento }) 
            .eq('id', caja.id);
    }
}

/**
 * 5. AUXILIARES DE UI
 */
window.abrirModal = () => {
    const total = parseFloat(displayTotalTicket.innerText.replace('$', ''));
    if (total <= 0) return alert("Agrega productos primero");
    document.getElementById('modal-total').innerText = `$${total.toFixed(2)}`;
    modalCobro.classList.remove('hidden');
    setTimeout(() => inputEfectivo.focus(), 100);
};

window.cerrarModal = () => { modalCobro.classList.add('hidden'); inputEfectivo.value = ''; };

window.pagoRapido = (v) => { inputEfectivo.value = v; calcularCambio(); };

function calcularCambio() {
    const total = parseFloat(document.getElementById('modal-total').innerText.replace('$', ''));
    const pago = parseFloat(inputEfectivo.value) || 0;
    const cambio = pago - total;
    const elCambio = document.getElementById('modal-cambio');
    elCambio.innerText = `$${(cambio > 0 ? cambio : 0).toFixed(2)}`;
    elCambio.className = cambio < 0 ? "text-2xl font-bold text-red-500 font-mono" : "text-2xl font-bold text-orange-400 font-mono";
}

if(inputEfectivo) inputEfectivo.addEventListener('input', calcularCambio);

window.resaltarFiltro = (cat, btn) => {
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('bg-orange-600', 'text-white');
        b.classList.add('bg-slate-800', 'text-slate-400');
    });
    btn.classList.replace('bg-slate-800', 'bg-orange-600');
    btn.classList.replace('text-slate-400', 'text-white');

    document.querySelectorAll('.producto-card').forEach(card => {
        if (cat === 'todos' || card.classList.contains(cat)) card.classList.remove('hidden');
        else card.classList.add('hidden');
    });
};

document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoDinamico();
    actualizarInterfaz();
});