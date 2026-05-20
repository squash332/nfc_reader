PRAGMA foreign_keys = OFF;

DELETE FROM events;
DELETE FROM cards;
DELETE FROM accounts;
DELETE FROM users;

INSERT INTO users (id, full_name, email, position) VALUES
(1, 'Alice Johnson',  'alice.johnson@company.com',  'Manager'),
(2, 'Bob Smith',      'bob.smith@company.com',      'Employee'),
(3, 'Charlie Davis',  'charlie.davis@company.com',  'Intern'),
(4, 'Diana Ross',     'diana.ross@company.com',     'Employee'),
(5, 'Evan Lee',       'evan.lee@company.com',       'Manager');

INSERT INTO cards (id, user_id, card_uid, description, is_active) VALUES
(1, 1, 'UID1001', 'Alice main card',  1),
(2, 2, 'UID1002', 'Bob main card',    1),
(3, 2, 'UID1003', 'Bob backup card',  1),
(4, 3, 'UID1004', 'Charlie card',     1),
(5, 4, 'UID1005', 'Diana card',       1),
(6, 5, 'UID1006', 'Evan card',        1);

INSERT INTO events (user_id, card_id, event_type, event_time) VALUES
-- Today — 2026-05-06
(1, 1, 'in',       '2026-05-06 08:02:00'),
(1, 1, 'out',      '2026-05-06 17:01:00'),
(2, 2, 'in',       '2026-05-06 09:15:00'),
(2, 2, 'out',      '2026-05-06 18:05:00'),
(3, 4, 'in',       '2026-05-06 10:00:00'),  -- Charlie still inside
(5, 6, 'in',       '2026-05-06 07:48:00'),
(5, 6, 'out',      '2026-05-06 16:33:00'),

-- Yesterday — 2026-05-05
(1, 1, 'in',       '2026-05-05 08:10:00'),
(1, 1, 'out',      '2026-05-05 17:00:00'),
(4, 5, 'in',       '2026-05-05 08:45:00'),
(4, 5, 'out',      '2026-05-05 17:15:00'),
(2, 3, 'in',       '2026-05-05 08:55:00'),
(2, 3, 'out',      '2026-05-05 17:10:00'),

-- Earlier this week — 2026-05-04
(3, 4, 'in',       '2026-05-04 10:10:00'),
(3, 4, 'out',      '2026-05-04 15:00:00'),
(1, 1, 'in',       '2026-05-04 08:00:00'),
(1, 1, 'out',      '2026-05-04 16:50:00'),
(5, 6, 'in',       '2026-05-04 07:50:00'),
(5, 6, 'out',      '2026-05-04 16:20:00'),

-- Last week
(2, 2, 'in',       '2026-04-30 09:05:00'),
(2, 2, 'out',      '2026-04-30 17:55:00'),
(4, 5, 'in',       '2026-04-28 08:30:00'),
(4, 5, 'out',      '2026-04-28 17:00:00'),
(1, 1, 'in',       '2026-04-25 08:05:00'),
(1, 1, 'out',      '2026-04-25 16:58:00'),
(3, 4, 'in',       '2026-04-21 10:05:00'),
(3, 4, 'out',      '2026-04-21 14:55:00'),
(5, 6, 'in',       '2026-04-15 07:52:00'),
(5, 6, 'out',      '2026-04-15 16:25:00'),
(2, 2, 'in',       '2026-04-10 09:12:00'),
(2, 2, 'out',      '2026-04-10 17:48:00'),
(4, 5, 'rejected', '2026-04-10 06:55:00'),
(1, 1, 'in',       '2026-04-07 08:01:00'),
(1, 1, 'out',      '2026-04-07 17:03:00'),
(3, 4, 'rejected', '2026-04-07 21:30:00');

INSERT INTO accounts (user_id, email, password_hash, role) VALUES
(NULL, 'admin',        '$2b$12$dOxnVCFqOWXx8q0ScrTH3urU1Wt4.yYGX9SIVbTFsqkCLOGruytAG', 'admin'),
(1,    'alice.johnson@company.com', '$2b$12$wMejTys4hxGW4saiUsdzrOOsH3bqzR8q1ALAhWUNISDwcbEcgX9BS', 'user'),
(2,    'bob.smith@company.com',     '$2b$12$wMejTys4hxGW4saiUsdzrOOsH3bqzR8q1ALAhWUNISDwcbEcgX9BS', 'user'),
(3,    'charlie.davis@company.com', '$2b$12$wMejTys4hxGW4saiUsdzrOOsH3bqzR8q1ALAhWUNISDwcbEcgX9BS', 'user'),
(4,    'diana.ross@company.com',    '$2b$12$wMejTys4hxGW4saiUsdzrOOsH3bqzR8q1ALAhWUNISDwcbEcgX9BS', 'user'),
(5,    'evan.lee@company.com',      '$2b$12$wMejTys4hxGW4saiUsdzrOOsH3bqzR8q1ALAhWUNISDwcbEcgX9BS', 'user');

PRAGMA foreign_keys = ON;
