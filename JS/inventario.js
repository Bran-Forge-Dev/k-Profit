let insumos = [
    { id: 1, nombre: 'Pollo (Tiras)', unidad: 'gr', costo: 0.165, stock: 5000 },
    { id: 2, nombre: 'Papa Blanca', unidad: 'gr', costo: 0.0433, stock: 3000 },
    { id: 3, nombre: 'Refresco Cola', unidad: 'pza', costo: 15.00, stock: 24 }
];
let editandoId = null;
const tbody = document.getElementById('tabla-insumos');
const modal = document.getElementById('modal-insumo');

window.cargarInsumos = function() {
    tbody.innerHTML = '';
    insumos.forEach(item => {
        tbody.innerHTML += `<tr class="border-b border-slate-800">
            <td class="p-6 font-bold">${item.nombre}</td>
            <td class="p-6 text-slate-500">${item.unidad}</td>
            <td class="p-6 text-center font-mono text-orange-400">${item.stock} ${item.unidad}</td>
            <td class="p-6 text-right"><button onclick="prepararEdicion(${item.id})" class="bg-slate-800 px-4 py-2 rounded-lg text-xs">SURTIR</button></td>
        </tr>`;
    });
}
window.prepararEdicion = (id) => {
    const item = insumos.find(i => i.id === id);
    editandoId = id;
    document.getElementById('insumo-nombre').value = item.nombre;
    document.getElementById('insumo-stock-nuevo').value = '';
    modal.classList.remove('hidden');
}
window.guardarInsumo = () => {
    const s = parseFloat(document.getElementById('insumo-stock-nuevo').value) || 0;
    if (editandoId) {
        const i = insumos.findIndex(item => item.id === editandoId);
        insumos[i].stock += s;
    }
    cargarInsumos(); modal.classList.add('hidden');
}
window.cerrar = () => modal.classList.add('hidden');
cargarInsumos();