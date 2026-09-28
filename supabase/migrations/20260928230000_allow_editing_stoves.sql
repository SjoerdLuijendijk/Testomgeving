-- Team members may edit all stove details after creation. The stove number stays fixed;
-- row access is still limited to team members by the "stoves update" policy.
grant update (brand, model, condition, height_cm, width_cm, depth_cm, flue_outlet, flue_diameter_mm, price_cents)
  on public.stoves to authenticated;
