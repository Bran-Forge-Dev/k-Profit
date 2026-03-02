// Estado global del carrito
let carrito = [];

// Elementos del DOM
const contenedorCarrito = document.querySelector('aside .flex-1');
const displayTotal = document.querySelector('.text-green-400');
const botonVaciar = document.querySelector('aside button.text-slate-500');

// --- 1. LÓGICA DEL CARRITO ---

function actualizarInterfaz() {
    if (!contenedorCarrito) return;
    
    contenedorCarrito.innerHTML = '';
    let totalAcumulado = 0;

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = '<p class="text-slate-500 italic text-center mt-10">Selecciona un producto...</p>';
        displayTotal.innerText = `$0.00`;
        return;
    }

    carrito.forEach((item, index) => {
        totalAcumulado += item.precio * item.cantidad;
        
        contenedorCarrito.innerHTML += `
            <div class="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 mb-2">
                <div>
                    <p class="font-bold">${item.nombre}</p>
                    <p class="text-xs text-slate-400">${item.cantidad} x $${item.precio.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="cambiarCantidad(${index}, -1)" class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">-</button>
                    <span class="font-mono font-bold">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">+</button>
                </div>
            </div>
        `;
    });

    displayTotal.innerText = `$${totalAcumulado.toFixed(2)}`;
}

window.agregarAlCarrito = function(nombre, precio) {
    const itemExistente = carrito.find(p => p.nombre === nombre);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ nombre, precio, cantidad: 1 });
    }
    actualizarInterfaz();
}

window.cambiarCantidad = function(index, cambio) {
    if(!carrito[index]) return;
    
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }
    actualizarInterfaz();
}

if (botonVaciar) {
    botonVaciar.addEventListener('click', () => {
        if(confirm("¿Vaciar toda la orden?")) {
            carrito = [];
            actualizarInterfaz();
        }
    });
}

// --- 2. LÓGICA DEL MODAL DE COBRO ---

const modal = document.getElementById('modal-cobro');
const inputEfectivo = document.getElementById('input-efectivo');

window.abrirModal = function() {
    const totalActual = parseFloat(displayTotal.innerText.replace('$', ''));
    if (totalActual <= 0) return alert("Agrega productos primero");
    
    document.getElementById('modal-total').innerText = `$${totalActual.toFixed(2)}`;
    modal.classList.remove('hidden');
    
    setTimeout(() => inputEfectivo.focus(), 100);
}

window.cerrarModal = function() {
    modal.classList.add('hidden');
    inputEfectivo.value = '';
    document.getElementById('modal-cambio').innerText = '$0.00';
}

window.pagoRapido = function(monto) {
    inputEfectivo.value = monto;
    calcularCambio();
}

if (inputEfectivo) {
    inputEfectivo.addEventListener('input', calcularCambio);
}

function calcularCambio() {
    const totalStr = document.getElementById('modal-total').innerText.replace('$', '');
    const total = parseFloat(totalStr);
    const pago = parseFloat(inputEfectivo.value) || 0;
    const cambio = pago - total;
    
    const displayCambio = document.getElementById('modal-cambio');
    if (displayCambio) {
        displayCambio.innerText = `$${(cambio > 0 ? cambio : 0).toFixed(2)}`;
        displayCambio.className = cambio < 0 ? "text-2xl md:text-3xl font-bold text-red-500" : "text-2xl md:text-3xl font-bold text-orange-400";
    }
}

window.confirmarVenta = function() {
    const total = parseFloat(displayTotal.innerText.replace('$', ''));
    const pago = parseFloat(inputEfectivo.value) || 0;

    if (pago < total) return alert("El pago es menor al total");

    alert("¡Venta registrada con éxito!");
    carrito = []; 
    actualizarInterfaz();
    cerrarModal();
}

// --- 3. LÓGICA DE FILTRADO Y RESALTADO (CORREGIDA) ---

window.resaltarFiltro = function(categoria, botonSeleccionado) {
    // A. Resaltado Visual de Botones
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('bg-orange-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });

    botonSeleccionado.classList.add('bg-orange-600', 'text-white');
    botonSeleccionado.classList.remove('bg-slate-800', 'text-slate-300');

    // B. Filtrado Real de Tarjetas de Producto
    const productos = document.querySelectorAll('.producto-card');
    productos.forEach(card => {
        if (categoria === 'todos') {
            card.classList.remove('hidden');
        } else {
            // Verifica si la tarjeta tiene la clase de la categoría (paquetes, extras, bebidas)
            if (card.classList.contains(categoria)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        }
    });
}

// --- 4. NAVEGACIÓN ACTIVA (NAV PRINCIPAL) ---

function marcarPaginaActiva() {
    let currentPath = window.location.pathname.split("/").pop().toLowerCase();
    if (currentPath === "" || currentPath === "index.html") currentPath = "index.html";

    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop().toLowerCase();

        if (currentPath === linkPath) {
            link.classList.add('text-orange-500', 'border-b-2', 'border-orange-500');
            link.classList.remove('text-slate-400');
        } else {
            link.classList.remove('text-orange-500', 'border-b-2', 'border-orange-500');
            link.classList.add('text-slate-400');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    marcarPaginaActiva();
    actualizarInterfaz();
});