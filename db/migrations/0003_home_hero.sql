-- Home hero block managed from /admin/home/hero
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
CREATE TABLE
    IF NOT EXISTS home_hero (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        primary_cta_text TEXT,
        primary_cta_link TEXT,
        secondary_cta_text TEXT,
        secondary_cta_link TEXT,
        media_url TEXT,
        media_type TEXT,
        starts_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        date_created INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

-- Default hero until an admin schedules one. Copy is the default locale (es),
-- as authored in the Figma home design.
INSERT INTO
    home_hero (
        title,
        content,
        media_url,
        media_type,
        starts_at,
        date_created
    )
SELECT
    'Financia el cambio que el mundo necesita',
    'Arrancamos una nueva etapa con la misma brújula que nos ha guiado desde el principio: impulsar proyectos que transformen el mundo desde la justicia social, la participación democrática y la defensa de los derechos humanos y de los ecosistemas. Únete a una comunidad que transforma realidades. ¡Sé parte de la solución!',
    '/images/home/hero.png',
    'image/png',
    unixepoch() * 1000,
    unixepoch() * 1000
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            home_hero
    );
