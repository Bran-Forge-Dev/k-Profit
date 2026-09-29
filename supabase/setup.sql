-- ============================================================
-- K-PROFIT · SETUP COMPLETO DE BASE DE DATOS
-- ============================================================
-- ⚠️ DESTRUCTIVO: la SECCIÓN A borra y recrea todas las tablas dev_*.
-- Todos los datos existentes se pierden. Los usuarios de Auth NO se
-- tocan.
--
-- Pasos en el proyecto de Supabase:
--   1. Corre la SECCIÓN A (drop + esquema + RLS) en el SQL Editor.
--   2. En Authentication > Users crea el usuario demo
--      (ej. demo@kprofit.app / KprofitDemo2026!, marcar Auto Confirm)
--      y copia su UUID.
--   3. Pega ese UUID en `uid` de la SECCIÓN B y córrela.
--   4. Ajusta demoEmail/demoPassword en JS/supabase-config.js si usaste otros.
--
-- Al crear usuarios de clientes (Authentication > Users), llena el campo
-- "User Metadata" con:
--   {"nombre_negocio": "Pollos Juan", "whatsapp": "5281..."}
-- El trigger copia esos datos a su perfil automáticamente.
--
-- Para sembrar datos también en TU usuario real, corre la SECCIÓN B
-- una segunda vez con tu UUID.
--
-- Para resetear solo la demo: borra las filas del usuario demo y
-- vuelve a correr la SECCIÓN B.
-- ============================================================


-- ============ SECCIÓN A: DROP + ESQUEMA + RLS ============
-- El orden del drop no importa gracias a CASCADE (también elimina
-- las políticas RLS viejas y las FK entre tablas).

drop table if exists dev_recetas cascade;
drop table if exists dev_ventas cascade;
drop table if exists dev_cajas_financieras cascade;
drop table if exists dev_productos cascade;
drop table if exists dev_insumos cascade;
drop table if exists perfiles cascade;

create table dev_productos (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id),
    icono       text,
    nombre      text not null,
    descripcion text,
    categoria   text,
    precio_venta numeric not null,
    created_at  timestamptz default now()
);

create table dev_insumos (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id),
    nombre        text not null,
    unidad        text,
    costo_unitario numeric default 0,
    stock_actual  numeric default 0,
    created_at    timestamptz default now()
);

create table dev_recetas (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null references auth.users(id),
    producto_id        uuid not null references dev_productos(id) on delete cascade,
    insumo_id          uuid not null references dev_insumos(id) on delete cascade,
    cantidad_necesaria numeric not null,
    created_at         timestamptz default now()
);

create table dev_ventas (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references auth.users(id),
    total_venta   numeric not null,
    pago_con      numeric,
    cambio        numeric,
    fecha         timestamptz default now(),
    detalle_venta text
);

create table dev_cajas_financieras (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id),
    nombre          text,
    porcentaje      numeric not null,
    saldo_acumulado numeric default 0,
    created_at      timestamptz default now()
);

create table perfiles (
    id                uuid primary key references auth.users(id),
    fecha_vencimiento date not null,
    nombre_negocio    text,
    whatsapp          text,
    created_at        timestamptz default now()
);

-- RLS: cada usuario solo ve y modifica sus propios datos
alter table dev_productos          enable row level security;
alter table dev_insumos            enable row level security;
alter table dev_recetas            enable row level security;
alter table dev_ventas             enable row level security;
alter table dev_cajas_financieras  enable row level security;
alter table perfiles               enable row level security;

-- Dueño de la fila + licencia vigente (ver rls-licencias.sql)
create policy "owner" on dev_productos for all
    using (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date))
    with check (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date));
create policy "owner" on dev_insumos for all
    using (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date))
    with check (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date));
create policy "owner" on dev_recetas for all
    using (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date))
    with check (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date));
create policy "owner" on dev_ventas for all
    using (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date))
    with check (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date));
create policy "owner" on dev_cajas_financieras for all
    using (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date))
    with check (auth.uid() = user_id and exists (select 1 from perfiles p where p.id = auth.uid() and p.fecha_vencimiento >= current_date));

-- El perfil solo se puede leer, nunca editar (para que nadie se renueve solo)
create policy "own_profile_read" on perfiles for select using (auth.uid() = id);

-- Perfil automático con 30 días al crear un usuario en Auth
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.perfiles (id, fecha_vencimiento, nombre_negocio, whatsapp)
    values (
        new.id,
        current_date + 30,
        new.raw_user_meta_data->>'nombre_negocio',
        new.raw_user_meta_data->>'whatsapp'
    )
    on conflict (id) do nothing;

    insert into public.dev_cajas_financieras (user_id, nombre, porcentaje, saldo_acumulado)
    values
        (new.id, 'Surtido', 40, 0),
        (new.id, 'Gastos',  10, 0),
        (new.id, 'Salario', 50, 0)
    on conflict do nothing;

    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.crear_perfil_nuevo_usuario();

-- Backfill: perfil de 30 días para usuarios ya existentes
insert into perfiles (id, fecha_vencimiento)
select id, current_date + 30 from auth.users
on conflict (id) do nothing;

-- Backfill: cajas 40/10/50 a usuarios existentes que aún no las tengan
insert into dev_cajas_financieras (user_id, nombre, porcentaje, saldo_acumulado)
select u.id, c.nombre, c.porcentaje, 0
from auth.users u
cross join (values ('Surtido', 40), ('Gastos', 10), ('Salario', 50)) as c(nombre, porcentaje)
where not exists (
    select 1 from dev_cajas_financieras cf
    where cf.user_id = u.id and cf.nombre = c.nombre
);


-- ============ RPC: VENTA ATÓMICA ============
-- venta + stock + cajas en una sola transacción (ver rpc-venta.sql)

create or replace function public.registrar_venta(
    p_items   jsonb,
    p_total   numeric,
    p_pago    numeric,
    p_cambio  numeric,
    p_fecha   timestamptz,
    p_detalle text
)
returns void
language plpgsql
as $$
declare
    item jsonb;
    ing  record;
    v_user uuid := auth.uid();
begin
    if v_user is null then
        raise exception 'No autenticado';
    end if;

    insert into dev_ventas (user_id, total_venta, pago_con, cambio, fecha, detalle_venta)
    values (v_user, p_total, p_pago, p_cambio, p_fecha, p_detalle);

    for item in select * from jsonb_array_elements(p_items) loop
        for ing in
            select insumo_id, cantidad_necesaria
            from dev_recetas
            where producto_id = (item->>'producto_id')::uuid
              and user_id = v_user
        loop
            update dev_insumos
            set stock_actual = stock_actual - (ing.cantidad_necesaria * (item->>'cantidad')::numeric)
            where id = ing.insumo_id and user_id = v_user;
        end loop;
    end loop;

    update dev_cajas_financieras
    set saldo_acumulado = saldo_acumulado + (p_total * porcentaje / 100)
    where user_id = v_user;
end;
$$;

revoke all on function public.registrar_venta(jsonb, numeric, numeric, numeric, timestamptz, text) from public;
grant execute on function public.registrar_venta(jsonb, numeric, numeric, numeric, timestamptz, text) to authenticated;


-- ============ SECCIÓN B: DATOS SEMILLA ============
-- Reemplaza el UUID de abajo por el del usuario (demo o el tuyo)
-- antes de correr esta sección.

do $$
declare
    uid uuid := 'PEGA_AQUI_EL_UUID_DEL_USUARIO';

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
