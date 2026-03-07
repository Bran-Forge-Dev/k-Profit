// Configuración centralizada de Supabase
var supabaseUrl = 'https://zskmxfxafxgbdohcxvgf.supabase.co'; // Búscala en Settings > API
var supabaseKey = 'sb_publishable_KTUD6IxK7g2zSZIJr-vnPg_ww0z2nlZ'; // Es la "Anon Key" que aparece en tu captura

// Inicializamos el cliente de Supabase
var supabase = supabase.createClient(supabaseUrl, supabaseKey);
