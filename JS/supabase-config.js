/**
 * CONFIGURACIÓN DE ENTORNOS — K-Profit
 * -----------------------------------
 * Un solo código, dos backends de Supabase:
 *   - prod: proyecto con usuarios reales
 *   - demo: proyecto para el portafolio (datos de ejemplo, reseteable)
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
        url: 'https://kcfdmirsvhldmcsikzrx.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZmRtaXJzdmhsZG1jc2lrenJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzIyMzEsImV4cCI6MjA4ODI0ODIzMX0.Au2ZR0eKwSSV5lIivml4y2f2ty8ioh14H8joGtxqDho'
    },
    demo: {
        // TODO: crear el proyecto demo en Supabase y pegar sus credenciales
        // (Settings > API). Las anon keys son públicas por diseño; la
        // seguridad real la da el RLS. Ver supabase/demo-setup.sql
        url: 'PENDIENTE_URL_PROYECTO_DEMO',
        key: 'PENDIENTE_ANON_KEY_DEMO',
        // Credenciales del usuario demo (se crean en Authentication > Users).
        // Es seguro publicarlas: solo exponen los datos de ejemplo del demo.
        demoEmail: 'demo@kprofit.app',
        demoPassword: 'KprofitDemo2026!'
    }
};

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
