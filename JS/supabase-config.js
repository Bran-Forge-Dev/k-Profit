/**
 * CONFIGURACIÓN DE ENTORNOS — K-Profit
 * -----------------------------------
 * Un solo código, dos entornos sobre el MISMO proyecto Supabase:
 *   - prod: usuarios reales del negocio
 *   - demo: usuario de demostración para el portafolio
 *
 * El aislamiento lo da el RLS: cada usuario solo ve sus propios datos
 * por user_id, así que la demo es simplemente "un usuario más".
 *
 * CÓMO SE ELIGE EL ENTORNO (en orden de prioridad):
 *   1. ?env=demo o ?env=prod en la URL (se guarda en localStorage,
 *      útil para probar en local sin cambiar código)
 *   2. HOST_ENV: dominio exacto -> entorno (agrega aquí tus URLs de Netlify/Vercel)
 *   3. Si el hostname contiene "demo" -> demo
 *   4. Por defecto -> prod
 */

var ENVIRONMENTS = {
    prod: {
        url: 'https://zskmxfxafxgbdohcxvgf.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpza214ZnhhZnhnYmRvaGN4dmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzIyNjksImV4cCI6MjA4ODI0ODI2OX0.LNQ2N8dx8chWj7NL1HVAjp37bGSu9sKUCMxLZuEEGY0'
    },
    demo: {
        // Credenciales del usuario demo — créalo en Authentication > Users
        // del proyecto principal (marcar "Auto Confirm"). Es seguro
        // publicarlas: el RLS lo limita exclusivamente a sus datos de ejemplo.
        demoEmail: 'demo@kprofit.app',
        demoPassword: 'KprofitDemo2026!'
    }
};

// La demo comparte el backend de prod (ver comentario superior).
// Si algún día quieres un proyecto Supabase separado para la demo,
// solo reemplaza estas dos líneas por su url/key:
ENVIRONMENTS.demo.url = ENVIRONMENTS.prod.url;
ENVIRONMENTS.demo.key = ENVIRONMENTS.prod.key;

// Dominio exacto -> entorno. Ejemplo:
//   'kprofit-demo.netlify.app': 'demo',
//   'kprofit.com': 'prod'
var HOST_ENV = {
    'localhost': 'prod',
    '127.0.0.1': 'prod'
};

function detectarEntorno() {
    var param = new URLSearchParams(window.location.search).get('env');
    if (param === 'demo' || param === 'prod') {
        localStorage.setItem('kprofit_env', param);
        return param;
    }

    // El override guardado solo se respeta en local, para que un visitante
    // del sitio real nunca quede atrapado en el entorno demo.
    var esLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === '';
    if (esLocal) {
        var guardado = localStorage.getItem('kprofit_env');
        if (guardado === 'demo' || guardado === 'prod') return guardado;
    }

    if (HOST_ENV[window.location.hostname]) return HOST_ENV[window.location.hostname];
    if (window.location.hostname.includes('demo')) return 'demo';
    return 'prod';
}

var APP_ENV = detectarEntorno();
var APP_CONFIG = ENVIRONMENTS[APP_ENV];

if (APP_CONFIG.url.indexOf('https://') !== 0) {
    console.error('[K-Profit] Entorno "' + APP_ENV + '" sin credenciales configuradas. Edita JS/supabase-config.js');
}

// window.supabase = librería CDN; la variable global `supabase` queda como el cliente
var supabase = window.supabase.createClient(APP_CONFIG.url, APP_CONFIG.key);

console.log('[K-Profit] Entorno activo: ' + APP_ENV);
