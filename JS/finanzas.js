/**
 * 1. CONFIGURACIÓN, SELECTORES Y PROTECCIÓN DE RUTA
 */
var elTotalDia = document.getElementById('total-acumulado');
var elSurtido = document.getElementById('caja-surtido');
var elGastos = document.getElementById('caja-gastos');
var elSalario = document.getElementById('caja-salario');
var tablaMovimientos = document.getElementById('tabla-movimientos-body');
var selectorFecha = document.getElementById('filtro-fecha');

/**
 * FUNCIÓN AUXILIAR: Obtener fecha local en formato AAAA-MM-DD
 */
function obtenerFechaLocalActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * 2. CARGA DE DATOS DESDE SUPABASE (Tablas dev_)
 */
async function cargarFinanzasReales() {
    const user = await obtenerUsuario();
    if (!user) return;

    let fechaFiltro = selectorFecha?.value;
    
    if (!fechaFiltro) {
        fechaFiltro = obtenerFechaLocalActual();
        if (selectorFecha) selectorFecha.value = fechaFiltro;
    }

    // Filtramos por fecha y por user_id para que los reportes sean privados
    const { data: ventas, error: errV } = await supabase
        .from('dev_ventas')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', `${fechaFiltro}T00:00:00Z`)
        .lte('fecha', `${fechaFiltro}T23:59:59Z`)
        .order('fecha', { ascending: false });

    if (errV) return console.error("Error cargando ventas:", errV.message);

    actualizarInterfazFinanzas(ventas);
}

/**
 * 3. RENDERIZADO DE LA INTERFAZ
 */
function actualizarInterfazFinanzas(ventas) {
    // 1. Calcular el Total Bruto del día
    const totalDia = ventas ? ventas.reduce((acc, v) => acc + parseFloat(v.total_venta || 0), 0) : 0;
    
    // 2. Cálculos dinámicos para las cajas (40/10/50)
    const montoSurtido = totalDia * 0.40;
    const montoGastos = totalDia * 0.10;
    const montoSalario = totalDia * 0.50;

    // Actualizar etiquetas en la pantalla
    if (elTotalDia) elTotalDia.innerText = `$${totalDia.toFixed(2)}`;
    if (elSurtido) elSurtido.innerText = `$${montoSurtido.toFixed(2)}`;
    if (elGastos) elGastos.innerText = `$${montoGastos.toFixed(2)}`;
    if (elSalario) elSalario.innerText = `$${montoSalario.toFixed(2)}`;

    // 3. Tabla de movimientos
    if (tablaMovimientos) {
        if (!ventas || ventas.length === 0) {
            tablaMovimientos.innerHTML = `
                <tr>
                    <td colspan="3" class="p-10 text-center text-slate-600 italic uppercase text-[10px] tracking-widest">
                        No hay ventas registradas en esta fecha
                    </td>
                </tr>`;
        } else {
            tablaMovimientos.innerHTML = ventas.map(venta => {
                const fechaLimpia = venta.fecha.replace('Z', '').replace('+00:00', '');
                const horaLocal = new Date(fechaLimpia).toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });

                const concepto = venta.detalle_venta || "Registro de Venta";

                return `
                    <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                        <td class="p-6 text-slate-500 font-mono text-xs">${horaLocal}</td>
                        <td class="p-6">
                            <div class="flex flex-col">
                                <span class="text-white font-bold tracking-tight">${concepto}</span>
                                <span class="text-[10px] text-slate-500 uppercase tracking-tighter">ID: #${venta.id.toString().slice(-5)}</span>
                            </div>
                        </td>
                        <td class="p-6 text-right">
                            <span class="font-black text-green-400 font-mono text-lg">+$${parseFloat(venta.total_venta).toFixed(2)}</span>
                        </td>
                    </tr>`;
            }).join('');
        }
    }
}

/**
 * 4. EXPORTACIÓN A PDF
 */
window.exportarReportePDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fecha = selectorFecha.value || obtenerFechaLocalActual();

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('K-PROFIT | CORTE DE CAJA', 14, 25);
    doc.setFontSize(10);
    doc.text(`FECHA SELECCIONADA: ${fecha}`, 14, 33);

    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN FINANCIERO:', 14, 55);
    doc.autoTable({
        startY: 60,
        head: [['Caja', 'Detalle', 'Saldo']],
        body: [
            ['Surtido (40%)', 'Reposición de insumos', elSurtido?.innerText || "$0.00"],
            ['Gastos (10%)', 'Servicios generales', elGastos?.innerText || "$0.00"],
            ['Salario (50%)', 'Utilidad neta', elSalario?.innerText || "$0.00"],
            ['TOTAL DEL DIA', 'Venta bruta', elTotalDia?.innerText || "$0.00"]
        ],
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] }
    });

    const filasVentas = Array.from(document.querySelectorAll('#tabla-movimientos-body tr')).map(tr => {
        const celdas = tr.querySelectorAll('td');
        if (celdas.length < 3) return null;
        return Array.from(celdas).map(td => td.innerText.split('\n')[0]);
    }).filter(fila => fila !== null);

    if (filasVentas.length > 0) {
        doc.text('HISTORIAL DE MOVIMIENTOS:', 14, doc.lastAutoTable.finalY + 15);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Hora', 'Concepto', 'Monto']],
            body: filasVentas,
            theme: 'grid',
            styles: { fontSize: 9 }
        });
    }

    doc.save(`Reporte_Finanzas_${fecha}.pdf`);
};

/**
 * 5. INICIALIZACIÓN
 */
function marcarPaginaActiva() {
    let currentPath = window.location.pathname.split("/").pop().toLowerCase() || "index.html";
    document.querySelectorAll('nav a').forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop().toLowerCase();
        if (currentPath === linkPath) {
            link.classList.add('text-orange-500', 'border-b-2', 'border-orange-500');
        }
    });
}

if (selectorFecha) {
    selectorFecha.addEventListener('input', cargarFinanzasReales);
}

document.addEventListener('DOMContentLoaded', () => {
    marcarPaginaActiva();
    if (selectorFecha) {
        selectorFecha.value = obtenerFechaLocalActual();
    }
    cargarFinanzasReales();
});