// 1. Datos iniciales - COSTOS ACTUALIZADOS
let insumos = [
    { id: 1, nombre: 'Pollo (Tiras)', unidad: 'gr', costo: 0.165, stock: 5000 },
    { id: 2, nombre: 'Papa Blanca', unidad: 'gr', costo: 0.0433, stock: 3000 },
    { id: 3, nombre: 'Refresco Cola 355ml', unidad: 'pza', costo: 15.00, stock: 24 }
];

// Recetas corregidas con los gramos que mencionaste
const recetas = {
    combo_individual: { 
        precioVenta: 135, 
        ing: [
            { n: 'pollo', q: 200, l: 'Pollo (200g)' }, 
            { n: 'papa', q: 130, l: 'Papas (130g)' }, 
            { n: 'refresco', q: 1, l: 'Refresco (1 pza)' }
        ] 
    },
    combo_mediano: { 
        precioVenta: 245, 
        ing: [
            { n: 'pollo', q: 400, l: 'Pollo (400g)' }, 
            { n: 'papa', q: 260, l: 'Papas (260g)' } 
        ] 
    },
    combo_grande: { 
        precioVenta: 315, 
        ing: [
            { n: 'pollo', q: 600, l: 'Pollo (600g)' }, 
            { n: 'papa', q: 260, l: 'Papas (260g)' } 
        ] 
    },
    combo_familiar: { 
        precioVenta: 415, 
        ing: [
            { n: 'pollo', q: 800, l: 'Pollo (800g)' }, 
            { n: 'papa', q: 360, l: 'Papas (360g)' } 
        ] 
    },
    k_tira_extra: { 
        precioVenta: 30, 
        ing: [
            { n: 'pollo', q: 50, l: 'Pollo (50g)' }
        ] 
    },
    papas_medianas: { 
        precioVenta: 40, 
        ing: [
            { n: 'papa', q: 130, l: 'Papas (130g)' }
        ] 
    },
    papas_grandes: { 
        precioVenta: 70, 
        ing: [
            { n: 'papa', q: 260, l: 'Papas (260g)' }
        ] 
    },
    papas_familiares: { 
        precioVenta: 70, 
        ing: [
            { n: 'papa', q: 360, l: 'Papas (360g)' }
        ] 
    },
    refresco: { 
        precioVenta: 30, 
        ing: [
            { n: 'refresco', q: 1, l: 'Refresco (1 pza - 355ml)' }
        ] 
    }
};

let editandoId = null;
const tbody = document.getElementById('tabla-insumos');
const modal = document.getElementById('modal-insumo');

// 2. Resumen Superior
function actualizarResumen() {
    const pollo = insumos.find(i => i.nombre.toLowerCase().includes('pollo'));
    const papa = insumos.find(i => i.nombre.toLowerCase().includes('papa'));
    document.getElementById('resumen-pollo-stock').innerText = pollo ? `${pollo.stock.toLocaleString()} gr` : '0 gr';
    document.getElementById('resumen-papa-stock').innerText = papa ? `${papa.stock.toLocaleString()} gr` : '0 gr';
    document.getElementById('resumen-total-items').innerText = `${insumos.length} Items`;
}

// 3. Renderizar Tabla
window.cargarInsumos = function() {
    tbody.innerHTML = '';
    insumos.forEach(item => {
        tbody.innerHTML += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                <td class="p-6 font-bold text-white tracking-tight">${item.nombre}</td>
                <td class="p-6 text-slate-500 italic uppercase text-xs tracking-widest">${item.unidad}</td>
                <td class="p-6 text-center">
                    <span class="bg-slate-950 px-3 py-1 rounded-full font-mono text-orange-400 border border-orange-500/20 shadow-inner">
                        ${item.stock.toLocaleString()} <small class="text-[9px] uppercase">${item.unidad}</small>
                    </span>
                </td>
                <td class="p-6 font-mono text-green-400 text-center font-bold">$${item.costo.toFixed(4)}</td>
                <td class="p-6 text-right">
                    <button onclick="prepararEdicion(${item.id})" class="bg-slate-800 hover:bg-orange-600 text-orange-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all">SURTIR / EDITAR</button>
                </td>
            </tr>
        `;
    });
    actualizarResumen();
    actualizarAnalisisMargen();
}

// 4. Calculadora de Márgenes (CORREGIDA)
window.actualizarAnalisisMargen = function() {
    const selector = document.getElementById('selector-producto-analisis');
    if (!selector) return;
    
    const tipo = selector.value;
    const rec = recetas[tipo];
    const contenedor = document.getElementById('desglose-receta');
    let totalCostoProduccion = 0;
    
    contenedor.innerHTML = ''; 

    rec.ing.forEach(ingredienteReceta => {
        // Busqueda más precisa del insumo
        const insumoDB = insumos.find(ins => ins.nombre.toLowerCase().includes(ingredienteReceta.n.toLowerCase()));
        
        const costoCalculado = insumoDB ? insumoDB.costo * ingredienteReceta.q : 0;
        totalCostoProduccion += costoCalculado;
        
        contenedor.innerHTML += `
            <div class="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
                <span class="text-slate-400 font-medium">${ingredienteReceta.l}</span>
                <span class="font-mono text-white font-bold">$${costoCalculado.toFixed(2)}</span>
            </div>`;
    });

    const gananciaBruta = rec.precioVenta - totalCostoProduccion;
    const porcentajeMargen = (gananciaBruta / rec.precioVenta) * 100;

    document.getElementById('calc-precio-venta').innerText = `$${rec.precioVenta.toFixed(2)}`;
    document.getElementById('calc-ganancia-neta').innerText = `$${gananciaBruta.toFixed(2)}`;
    document.getElementById('calc-porcentaje').innerText = `${porcentajeMargen.toFixed(0)}%`;
}

// 5. Gestión de Modal
window.prepararNuevo = function() {
    editandoId = null;
    document.getElementById('insumo-nombre').value = '';
    document.getElementById('insumo-unidad').value = 'gr';
    document.getElementById('insumo-costo').value = '';
    document.getElementById('insumo-stock-nuevo').value = '';
    document.getElementById('label-unidad-dinamica').innerText = 'gr';
    document.getElementById('modal-titulo').innerText = "Nuevo Insumo";
    modal.classList.remove('hidden');
}

window.prepararEdicion = function(id) {
    const item = insumos.find(i => i.id === id);
    editandoId = id;
    document.getElementById('insumo-nombre').value = item.nombre;
    document.getElementById('insumo-unidad').value = item.unidad;
    document.getElementById('insumo-costo').value = item.costo;
    document.getElementById('insumo-stock-nuevo').value = ''; 
    document.getElementById('label-unidad-dinamica').innerText = item.unidad;
    document.getElementById('modal-titulo').innerText = `Surtir ${item.nombre}`;
    modal.classList.remove('hidden');
}

window.cerrarModalInsumo = function() { modal.classList.add('hidden'); }

document.getElementById('insumo-unidad').addEventListener('input', (e) => {
    const label = document.getElementById('label-unidad-dinamica');
    if (label) label.innerText = e.target.value || '...';
});

window.guardarInsumo = function() {
    const n = document.getElementById('insumo-nombre').value;
    const u = document.getElementById('insumo-unidad').value.toLowerCase();
    const c = parseFloat(document.getElementById('insumo-costo').value) || 0;
    const s = parseFloat(document.getElementById('insumo-stock-nuevo').value) || 0;

    if (editandoId) {
        const i = insumos.findIndex(item => item.id === editandoId);
        insumos[i].stock += s;
        insumos[i].nombre = n; 
        insumos[i].unidad = u; 
        insumos[i].costo = c;
    } else {
        insumos.push({ id: Date.now(), nombre: n, unidad: u, costo: c, stock: s });
    }
    cargarInsumos();
    cerrarModalInsumo();
}

// Carga inicial
cargarInsumos();

// Script para marcar la página activa en el Nav
const currentPath = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll('nav a');

navLinks.forEach(link => {
    // Si el href del enlace coincide con el nombre del archivo actual
    if (link.getAttribute('href').includes(currentPath)) {
        link.classList.add('text-orange-500', 'border-b-2', 'border-orange-500');
        link.classList.remove('text-slate-400');
    } else {
        link.classList.remove('text-orange-500', 'border-b-2', 'border-orange-500');
        link.classList.add('text-slate-400');
    }
});