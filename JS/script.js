// Estado global del carrito
let carrito = [];

// Elementos del DOM
const contenedorCarrito = document.querySelector('aside .flex-1');
const displayTotal = document.querySelector('.text-green-400');
const botonVaciar = document.querySelector('button.text-slate-500');

// 1. Función para actualizar la interfaz del ticket
function actualizarInterfaz() {
    contenedorCarrito.innerHTML = '';
    let totalAcumulado = 0;

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = '<p class="text-slate-500 italic">Selecciona un producto...</p>';
    }

    carrito.forEach((item, index) => {
        totalAcumulado += item.precio * item.cantidad;
        
        contenedorCarrito.innerHTML += `
            <div class="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                <div>
                    <p class="font-bold">${item.nombre}</p>
                    <p class="text-xs text-slate-400">${item.cantidad} x $${item.precio.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="cambiarCantidad(${index}, -1)" class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600">-</button>
                    <span class="font-mono font-bold">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600">+</button>
                </div>
            </div>
        `;
    });

    displayTotal.innerText = `$${totalAcumulado.toFixed(2)}`;
}

// 2. Función para agregar productos
window.agregarAlCarrito = function(nombre, precio) {
    const itemExistente = carrito.find(p => p.nombre === nombre);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ nombre, precio, cantidad: 1 });
    }
    actualizarInterfaz();
}

// 3. Función para botones + y -
window.cambiarCantidad = function(index, cambio) {
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }
    actualizarInterfaz();
}

// 4. Vaciar carrito
botonVaciar.addEventListener('click', () => {
    carrito = [];
    actualizarInterfaz();
});


/* Modal */
const modal = document.getElementById('modal-cobro');
const inputEfectivo = document.getElementById('input-efectivo');

// 1. Abrir el modal y pasar el total
window.abrirModal = function() {
    const totalActual = parseFloat(displayTotal.innerText.replace('$', ''));
    if (totalActual <= 0) return alert("Agrega productos primero");
    
    document.getElementById('modal-total').innerText = `$${totalActual.toFixed(2)}`;
    modal.classList.remove('hidden');
    inputEfectivo.focus();
}

window.cerrarModal = function() {
    modal.classList.add('hidden');
    inputEfectivo.value = '';
    document.getElementById('modal-cambio').innerText = '$0.00';
}

// 2. Lógica de pago rápido (billetes y escrito)
window.pagoRapido = function(monto) {
    // 1. Ponemos el valor del billete en el input
    inputEfectivo.value = monto;
    
    // 2. ¡IMPORTANTE! Llamamos manualmente a la función de calcular el cambio
    calcularCambio();
}

// 3. Calcular cambio automáticamente
inputEfectivo.addEventListener('input', calcularCambio);

function calcularCambio() {
    const total = parseFloat(document.getElementById('modal-total').innerText.replace('$', ''));
    const pago = parseFloat(inputEfectivo.value) || 0;
    const cambio = pago - total;
    
    const displayCambio = document.getElementById('modal-cambio');
    displayCambio.innerText = `$${(cambio > 0 ? cambio : 0).toFixed(2)}`;
}

window.confirmarVenta = function() {
    alert("¡Venta registrada con éxito!");
    carrito = []; // Limpiamos carrito
    actualizarInterfaz();
    cerrarModal();
}