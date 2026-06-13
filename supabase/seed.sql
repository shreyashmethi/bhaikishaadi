-- Add real family members here. login_token auto-generates.
insert into users (name, phone, role) values
  ('Shreyash',  '+917498737274', 'admin'),
  ('Papa',   '+919225334460', 'family'),
  ('Mummy',  '+919665294987', 'family'),
  ('Guda',  '+919503246906', 'family'),
  ('Bhaiya', '+917276590453', 'family');

-- Get each person's personal login link to share on WhatsApp:
--   select name, 'https://<your-app>.vercel.app/login?t=' || login_token as link from users;

insert into tasks (category, title, priority) values
  ('Venue',        'Confirm venue booking & advance paid',   'high'),
  ('Venue',        'Book rooms for outstation guests',       'normal'),
  ('Venue',        'Confirm venue check-in/out timings',     'normal'),
  ('Catering',     'Confirm headcount & per-plate rate',     'high'),
  ('Catering',     'Pay catering advance',                   'high'),
  ('Catering',     'Arrange special meals (jain/diabetic)',  'normal'),
  ('Decor',        'Finalize theme/colors per function',     'normal'),
  ('Decor',        'Flowers & lighting confirmation',        'normal'),
  ('Cards',        'Finalize card design & print',           'normal'),
  ('Cards',        'Build guest list',                       'normal'),
  ('Cards',        'Distribute physical cards',              'normal'),
  ('Cards',        'Send digital invite & WhatsApp broadcast','normal'),
  ('Attire',       'Groom''s outfits per function',          'normal'),
  ('Attire',       'Family outfits coordination',            'normal'),
  ('Attire',       'Tailoring & alterations deadline',       'normal'),
  ('Photography',  'Book photographer & videographer',       'high'),
  ('Photography',  'Share shot list & timeline',             'normal'),
  ('Photography',  'Confirm pre-wedding shoot',              'normal'),
  ('Rituals',      'Book pandit & confirm muhurat',          'high'),
  ('Rituals',      'Procure puja samagri',                   'normal'),
  ('Rituals',      'Haldi / Mehendi material',               'normal'),
  ('Sangeet',      'Book DJ & sound',                        'normal'),
  ('Sangeet',      'Choreographer & rehearsal schedule',     'normal'),
  ('Sangeet',      'Book mehendi artist',                    'normal'),
  ('Logistics',    'Arrange baraat (ghodi/car/band)',        'normal'),
  ('Logistics',    'Guest pickup/drop coordination',         'normal'),
  ('Logistics',    'Parking arrangement',                    'normal'),
  ('Gifts',        'Order return gifts',                     'low'),
  ('Gifts',        'Shagun / envelopes ready',               'low'),
  ('Gifts',        'Welcome kits for outstation guests',     'low');
