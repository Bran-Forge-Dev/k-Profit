/**
 * 1. CONFIGURACIÓN DE ELEMENTOS
 */
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');

/**
 * 2. LÓGICA DE INICIO DE SESIÓN
 */
async function iniciarSesion(email, password, btn, textoBtn) {
    btn.disabled = true;
    btn.innerText = 'VALIDANDO...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Error de acceso: " + error.message);
            btn.disabled = false;
            btn.innerText = textoBtn;
        } else {
            console.log("Acceso concedido para:", data.user.email);
            // RUTA: Entramos a la carpeta html para buscar ventas
            window.location.href = 'html/ventas.html';
        }
    } catch (err) {
        console.error("Error inesperado:", err);
        alert("Ocurrió un error al intentar conectar.");
        btn.disabled = false;
        btn.innerText = textoBtn;
    }
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        iniciarSesion(emailInput.value.trim(), passwordInput.value, submitBtn, 'ENTRAR');
    });
}

/**
 * 2.5 MODO DEMO — visible solo cuando APP_ENV === 'demo'
 * El botón entra con el usuario demo configurado en supabase-config.js
 */
if (window.APP_ENV === 'demo') {
    const envBadge = document.getElementById('env-badge');
    const demoPanel = document.getElementById('demo-panel');
    const btnDemo = document.getElementById('btn-demo');

    if (envBadge) envBadge.classList.remove('hidden');
    if (demoPanel) demoPanel.classList.remove('hidden');
    if (btnDemo) {
        btnDemo.addEventListener('click', () => {
            iniciarSesion(APP_CONFIG.demoEmail, APP_CONFIG.demoPassword, btnDemo, 'EXPLORAR DEMO SIN REGISTRO');
        });
    }
}

/**
 * 3. FUNCIÓN DE CERRAR SESIÓN
 */
window.cerrarSesion = async function() {
    if (confirm("¿Seguro que quieres salir de K-Profit?")) {
        try {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            
            console.log("Sesión cerrada. Regresando a la raíz...");

            // RUTA: El ../ le dice al navegador "salte de la carpeta html y busca el index"
            window.location.replace('../index.html');

        } catch (err) {
            console.error("Error al cerrar sesión:", err);
            window.location.replace('../index.html');
        }
    }
};

/**
 * 4. VERIFICACIÓN DE SESIÓN ACTIVA
 */
async function revisarSesionActiva() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const path = window.location.pathname;
    // Detectamos si estamos en la raíz o en el index
    const esRaiz = path.includes('index.html') || path.endsWith('/') || !path.includes('/html/');

    // Caso A: Hay sesión y estoy en el Login -> Entrar a la carpeta
    if (session && esRaiz) {
        window.location.replace('html/ventas.html');
        return;
    }

    // Caso B: NO hay sesión y estoy DENTRO de la carpeta -> Salir a la raíz
    if (!session && !esRaiz) {
        localStorage.clear();
        window.location.replace('../index.html');
    }
}

document.addEventListener('DOMContentLoaded', revisarSesionActiva);