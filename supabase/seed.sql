-- Default categories for NEXUS Finance
INSERT INTO public.categories (name, icon, color, is_custom) VALUES
('vivienda', 'home', '#3b82f6', false),
('alimentacion', 'utensils', '#10b981', false),
('transporte', 'car', '#f59e0b', false),
('educacion', 'graduation-cap', '#8b5cf6', false),
('servicios', 'zap', '#06b6d4', false),
('tecnologia', 'laptop', '#6366f1', false),
('entretenimiento', 'film', '#ec4899', false),
('compras', 'shopping-bag', '#f43f5e', false),
('salud', 'heart-pulse', '#14b8a6', false),
('suscripciones', 'repeat', '#a855f7', false),
('otros', 'more-horizontal', '#64748b', false)
ON CONFLICT DO NOTHING;
