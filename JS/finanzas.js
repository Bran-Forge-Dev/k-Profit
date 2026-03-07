/**
 * 1. CONFIGURACIÓN Y SELECTORES
 * Usamos var para permitir la coexistencia global sin errores de redifinicón.
 */
var elTotalDia = document.getElementById('total-acumulado');
var elSurtido = document.getElementById('caja-surtido');
var elGastos = document.getElementById('caja-gastos');
var elSalario = document.getElementById('caja-salario');
var tablaMovimientos = document.getElementById('tabla-movimientos-body');
var selectorFecha = document.getElementById('filtro-fecha');

/**
 * 2. CARGA DE DATOS DESDE SUPABASE
 * Consulta el estado de las cajas financieras y el historial de ventas del día.
 */
async function cargarFinanzasReales() {
    // Lógica de "Reset a hoy": Si no hay fecha, usamos la actual
    let fechaFiltro = selectorFecha?.value;
    if (!fechaFiltro) {
        fechaFiltro = new Date().toISOString().split('T')[0];
        if (selectorFecha) selectorFecha.value = fechaFiltro;
    }

    // A. Obtener saldos de las cajas financieras (40/10/50)
    const { data: cajas, error: errC } = await supabase
        .from('cajas_financieras')
        .select('*');

    if (errC) return console.error("Error cargando cajas:", errC.message);

    // B. Obtener las VENTAS del día seleccionado
    const { data: ventas, error: errV } = await supabase
        .from('ventas')
        .select('*')
        .gte('fecha', `${fechaFiltro}T00:00:00Z`)
        .lte('fecha', `${fechaFiltro}T23:59:59Z`)
        .order('fecha', { ascending: false });

    if (errV) return console.error("Error cargando ventas:", errV.message);

    actualizarInterfazFinanzas(cajas, ventas);
}

/**
 * 3. RENDERIZADO DE LA INTERFAZ
 * Actualiza los montos en pantalla y la tabla de historial de ventas.
 */
function actualizarInterfazFinanzas(cajas, ventas) {
    // 1. Total del día (Suma de ventas)
    const totalDia = ventas ? ventas.reduce((acc, v) => acc + parseFloat(v.total_venta || 0), 0) : 0;
    if (elTotalDia) elTotalDia.innerText = `$${totalDia.toFixed(2)}`;

    // Inicializamos las cajas en $0.00 para evitar el N/A si no hay datos
    if (elSurtido) elSurtido.innerText = "$0.00";
    if (elGastos) elGastos.innerText = "$0.00";
    if (elSalario) elSalario.innerText = "$0.00";

    // 2. Mapeo de cajas por porcentaje o nombre
    if (cajas && cajas.length > 0) {
        cajas.forEach(caja => {
            const monto = `$${parseFloat(caja.saldo_acumulado || 0).toFixed(2)}`;
            const nombre = (caja.nombre_caja || "").toLowerCase();
            const porcentaje = parseInt(caja.porcentaje);

            if (nombre.includes('surtido') || porcentaje === 40) {
                if (elSurtido) elSurtido.innerText = monto;
            } else if (nombre.includes('gastos') || porcentaje === 10) {
                if (elGastos) elGastos.innerText = monto;
            } else if (nombre.includes('salario') || nombre.includes('ganancia') || porcentaje === 50) {
                if (elSalario) elSalario.innerText = monto;
            }
        });
    }

    // 3. Tabla de movimientos (Historial de ventas)
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
                const horaLocal = new Date(venta.fecha).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });

                return `
                    <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                        <td class="p-6 text-slate-500 font-mono text-xs">${horaLocal}</td>
                        <td class="p-6">
                            <div class="flex flex-col">
                                <span class="text-white font-bold tracking-tight">Registro de Venta</span>
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
 * Genera un archivo PDF con el resumen financiero y el historial de ventas.
 */
window.exportarReportePDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fecha = selectorFecha.value || new Date().toISOString().split('T')[0];

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
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.split('\n')[0]);
    });

    if (filasVentas.length > 0 && filasVentas[0].length > 1) {
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
        selectorFecha.value = new Date().toISOString().split('T')[0];
    }
    cargarFinanzasReales();
});