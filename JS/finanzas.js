// 1. Simulación de ventas (En el futuro esto vendrá de Supabase)
let ventasRealizadas = [
    { id: 101, fecha: '2026-03-01', total: 115 },
    { id: 102, fecha: '2026-03-01', total: 245 },
    { id: 103, fecha: '2026-03-01', total: 135 }
];

// 2. Función para procesar las finanzas (Regla 40/10/50)
function procesarFinanzas() {
    // Sumamos todas las ventas
    const totalVendido = ventasRealizadas.reduce((acc, venta) => acc + venta.total, 0);

    // Aplicamos los porcentajes
    const surtido = totalVendido * 0.40;
    const gastos = totalVendido * 0.10;
    const salario = totalVendido * 0.50;

    // Actualizamos la interfaz con seguridad (validando que existan los IDs)
    const elTotal = document.getElementById('total-acumulado');
    const elSurtido = document.getElementById('caja-surtido');
    const elGastos = document.getElementById('caja-gastos');
    const elSalario = document.getElementById('caja-salario');

    if (elTotal) elTotal.innerText = `$${totalVendido.toFixed(2)}`;
    if (elSurtido) elSurtido.innerText = `$${surtido.toFixed(2)}`;
    if (elGastos) elGastos.innerText = `$${gastos.toFixed(2)}`;
    if (elSalario) elSalario.innerText = `$${salario.toFixed(2)}`;
}

// 3. Lógica para marcar la página activa en el Nav (Versión Robusta)
function marcarPaginaActiva() {
    // Obtenemos el nombre del archivo actual en minúsculas
    let currentPath = window.location.pathname.split("/").pop().toLowerCase();
    
    // Si estamos en la raíz o index, por defecto marcamos Ventas
    if (currentPath === "" || currentPath === "index.html") {
        currentPath = "ventas.html";
    }

    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        // Obtenemos el destino del enlace en minúsculas para comparar
        const linkPath = link.getAttribute('href').split("/").pop().toLowerCase();

        if (currentPath === linkPath) {
            // Estilos de página ACTIVA
            link.classList.add('text-orange-500', 'border-b-2', 'border-orange-500');
            link.classList.remove('text-slate-400');
        } else {
            // Estilos de página INACTIVA
            link.classList.remove('text-orange-500', 'border-b-2', 'border-orange-500');
            link.classList.add('text-slate-400');
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    marcarPaginaActiva();
    procesarFinanzas();
});