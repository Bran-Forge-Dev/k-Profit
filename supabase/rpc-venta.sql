-- ============================================================
-- K-PROFIT · VENTA ATÓMICA (RPC)
-- ============================================================
-- Corre esto UNA VEZ en el SQL Editor.
--
-- Antes: el frontend hacia ~10 llamadas separadas (venta + un update
-- por ingrediente + cajas). Si el internet se caía a la mitad, la
-- venta quedaba registrada pero el stock sin descontar.
--
-- Ahora todo ocurre en una sola transacción de base de datos: si algo
-- falla, se revierte TODO (ni venta ni stock ni cajas se alteran).
--
-- La función es SECURITY INVOKER: corre con los permisos del usuario
-- autenticado y respeta el RLS (incluido el bloqueo por licencia).
-- ============================================================

create or replace function public.registrar_venta(
    p_items   jsonb,          -- [{producto_id, cantidad}, ...]
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

    -- 1. Registrar la venta
    insert into dev_ventas (user_id, total_venta, pago_con, cambio, fecha, detalle_venta)
    values (v_user, p_total, p_pago, p_cambio, p_fecha, p_detalle);

    -- 2. Descuento de stock según receta de cada producto
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

    -- 3. Distribución financiera (regla 40/10/50)
    update dev_cajas_financieras
    set saldo_acumulado = saldo_acumulado + (p_total * porcentaje / 100)
    where user_id = v_user;
end;
$$;

-- Solo usuarios autenticados pueden ejecutarla
revoke all on function public.registrar_venta(jsonb, numeric, numeric, numeric, timestamptz, text) from public;
grant execute on function public.registrar_venta(jsonb, numeric, numeric, numeric, timestamptz, text) to authenticated;
