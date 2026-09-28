-- ============================================================
-- K-PROFIT · DATOS SEMILLA DEL USUARIO DEMO
-- ============================================================
-- La demo vive en el MISMO proyecto Supabase que prod; el aislamiento
-- lo da el RLS por user_id. Pasos:
--   1. En Authentication > Users crea el usuario demo
--      (ej. demo@kprofit.app / KprofitDemo2026!, marcar Auto Confirm)
--      y copia su UUID.
--   2. Pega ese UUID en la variable `uid` de la SECCIÓN B y córrela.
--   3. Ajusta demoEmail/demoPassword en JS/supabase-config.js si usaste otros.
--
-- La SECCIÓN A solo hace falta si algún día migras la demo a un
-- proyecto Supabase separado (esquema + RLS). En el proyecto actual
-- las tablas ya existen — no la corras aquí.
--
-- Para resetear la demo: borra las filas del usuario demo con
--   delete from dev_productos where user_id = '<uuid>';  -- (y resto de tablas)
-- y vuelve a correr la SECCIÓN B.
-- ============================================================


-- ============ SECCIÓN A: ESQUEMA + RLS (referencia, no correr en prod) ============

create table if not exists dev_productos (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id),
    icono       text,
    nombre      text not null,
    descripcion text,
    categoria   text,
    precio_venta numeric not null,
    created_at  timestamptz default now()
);

create table if not exists dev_insumos (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id),
    nombre        text not null,
    unidad        text,
    costo_unitario numeric default 0,
    stock_actual  numeric default 0,
    created_at    timestamptz default now()
);

create table if not exists dev_recetas (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null references auth.users(id),
    producto_id        uuid not null references dev_productos(id) on delete cascade,
    insumo_id          uuid not null references dev_insumos(id) on delete cascade,
    cantidad_necesaria numeric not null,
    created_at         timestamptz default now()
);

create table if not exists dev_ventas (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references auth.users(id),
    total_venta   numeric not null,
    pago_con      numeric,
    cambio        numeric,
    fecha         timestamptz default now(),
    detalle_venta text
);

create table if not exists dev_cajas_financieras (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id),
    nombre          text,
    porcentaje      numeric not null,
    saldo_acumulado numeric default 0,
    created_at      timestamptz default now()
);

-- RLS: cada usuario solo ve y modifica sus propios datos
alter table dev_productos          enable row level security;
alter table dev_insumos            enable row level security;
alter table dev_recetas            enable row level security;
alter table dev_ventas             enable row level security;
alter table dev_cajas_financieras  enable row level security;

create policy "owner" on dev_productos         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on dev_insumos           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on dev_recetas           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on dev_ventas            for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner" on dev_cajas_financieras for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============ SECCIÓN B: DATOS SEMILLA ============
-- Reemplaza el UUID de abajo por el del usuario demo que creaste.

do $$
declare
    uid uuid := 'PEGA_AQUI_EL_UUID_DEL_USUARIO_DEMO';

    -- insumos
    v_pollo    uuid; v_papa uuid; v_aceite uuid; v_harina uuid;
    v_refresco uuid; v_agua  uuid;

    -- productos
    v_paquete8 uuid; v_paquete12 uuid; v_tenders uuid;
    v_papas    uuid; v_refresco_p uuid; v_agua_p uuid;
begin
    -- Insumos
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Pollo fresco',        'kg',  65.00, 25)   returning id into v_pollo;
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Papa',                'kg',  28.00, 40)   returning id into v_papa;
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Aceite vegetal',      'lt',  48.00, 20)   returning id into v_aceite;
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Harina para empanizar','kg', 35.00, 10)   returning id into v_harina;
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Refresco 600ml',      'pza', 18.00, 48)   returning id into v_refresco;
    insert into dev_insumos (user_id, nombre, unidad, costo_unitario, stock_actual) values
        (uid, 'Agua embotellada',    'pza', 10.00, 36)   returning id into v_agua;

    -- Productos (categoria debe coincidir con los filtros: paquetes/extras/bebidas)
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '🍗', 'Paquete 8 piezas', '8 piezas de pollo + papas familiares', 'paquetes', 249.00) returning id into v_paquete8;
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '🍗', 'Paquete 12 piezas', '12 piezas + papas + 2 refrescos', 'paquetes', 349.00) returning id into v_paquete12;
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '🍟', 'Papas grandes', 'Orden grande de papas fritas', 'extras', 59.00) returning id into v_papas;
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '🌶️', 'Tenders x5', '5 tiras empanizadas con aderezo', 'extras', 89.00) returning id into v_tenders;
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '🥤', 'Refresco 600ml', 'Botella fría, sabores varios', 'bebidas', 25.00) returning id into v_refresco_p;
    insert into dev_productos (user_id, icono, nombre, descripcion, categoria, precio_venta) values
        (uid, '💧', 'Agua 500ml', 'Botella de agua natural', 'bebidas', 15.00) returning id into v_agua_p;

    -- Recetas (insumo_id + cantidad por unidad vendida)
    insert into dev_recetas (user_id, producto_id, insumo_id, cantidad_necesaria) values
        (uid, v_paquete8,  v_pollo,    1.6),
        (uid, v_paquete8,  v_papa,     0.8),
        (uid, v_paquete8,  v_aceite,   0.3),
        (uid, v_paquete8,  v_harina,   0.2),
        (uid, v_paquete12, v_pollo,    2.4),
        (uid, v_paquete12, v_papa,     1.0),
        (uid, v_paquete12, v_aceite,   0.45),
        (uid, v_paquete12, v_harina,   0.3),
        (uid, v_paquete12, v_refresco, 2),
        (uid, v_tenders,   v_pollo,    0.35),
        (uid, v_tenders,   v_harina,   0.1),
        (uid, v_tenders,   v_aceite,   0.1),
        (uid, v_papas,     v_papa,     0.4),
        (uid, v_papas,     v_aceite,   0.08),
        (uid, v_refresco_p, v_refresco, 1),
        (uid, v_agua_p,    v_agua,      1);

    -- Cajas financieras (regla 40/10/50)
    insert into dev_cajas_financieras (user_id, nombre, porcentaje, saldo_acumulado) values
        (uid, 'Surtido', 40, 0),
        (uid, 'Gastos',  10, 0),
        (uid, 'Salario', 50, 0);

    -- Ventas de ejemplo para que el reporte de finanzas muestre datos
    insert into dev_ventas (user_id, total_venta, pago_con, cambio, fecha, detalle_venta) values
        (uid, 249.00, 300.00,  51.00, now() - interval '5 hours', '1x Paquete 8 piezas'),
        (uid, 374.00, 400.00,  26.00, now() - interval '3 hours', '1x Paquete 12 piezas, 1x Refresco 600ml'),
        (uid, 134.00, 200.00,  66.00, now() - interval '1 hour',  '1x Papas grandes, 1x Tenders x5');
end $$;
