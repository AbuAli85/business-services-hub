-- Add sample services data using the correct column names
-- First, ensure we have some provider profiles to reference

INSERT INTO public.services (id, provider_id, service_name, description, category, status, base_price, currency, created_at, updated_at) 
VALUES 
    ('770e8400-e29b-41d4-a716-446655440000', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Digital Marketing Campaign', 'Comprehensive digital marketing services including social media management, SEO, and content creation for businesses in Oman.', 'Digital Marketing', 'active', 500.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440001', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Website Development', 'Custom website development using modern technologies like React and Next.js. Perfect for businesses looking to establish their online presence.', 'IT Services', 'active', 800.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440002', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Business Consulting', 'Strategic business consulting for startups and growing companies. Get expert advice to scale your business effectively.', 'Consulting', 'active', 300.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440003', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Legal Document Review', 'Professional legal document review and drafting services. Ensure your contracts and agreements are legally sound.', 'Legal Services', 'active', 150.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440004', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Graphic Design', 'Logo design, branding, and marketing materials creation. Make your business stand out with professional design.', 'Design & Branding', 'active', 200.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440005', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Accounting Services', 'Bookkeeping, tax preparation, and financial consulting. Keep your finances organized and compliant.', 'Accounting', 'active', 250.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440006', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Content Creation', 'Blog writing, copywriting, and content strategy for social media and websites.', 'Content Creation', 'active', 180.000, 'OMR', NOW(), NOW()),
    ('770e8400-e29b-41d4-a716-446655440007', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', 'Translation Services', 'Professional translation services between Arabic, English, and other languages.', 'Translation', 'active', 120.000, 'OMR', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
