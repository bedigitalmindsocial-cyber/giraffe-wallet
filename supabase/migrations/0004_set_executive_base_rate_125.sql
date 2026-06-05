-- Set the catalog base hourly rate to Rs.125 for multiplier-1 roles
-- (Executive) and recalculate non-overridden future service prices.
-- Existing tasks keep their credit_cost_locked value.

insert into settings (id, base_hourly_rate, markup_multiplier, credit_value, updated_at)
values ('00000000-0000-0000-0000-000000000001', 125, 2.5, 500, now())
on conflict (id) do update set
  base_hourly_rate = 125,
  markup_multiplier = settings.markup_multiplier,
  credit_value = settings.credit_value,
  updated_at = now();

select recalc_service_credit_costs();
