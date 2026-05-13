-- Schema de PostgreSQL para horarios de la Facultad de Psicología (UBA).
-- Ejecutar contra una DB recién creada:  psql horarios < schema.sql

CREATE TABLE IF NOT EXISTS materias (
    codigo  INTEGER PRIMARY KEY,
    nombre  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catedras (
    id              INTEGER PRIMARY KEY,
    materia_codigo  INTEGER NOT NULL REFERENCES materias(codigo),
    numero          TEXT,
    titular         TEXT,
    cuatrimestre    TEXT
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_curso') THEN
        CREATE TYPE tipo_curso AS ENUM ('teorico', 'seminario', 'comision');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS cursos (
    id              BIGSERIAL PRIMARY KEY,
    catedra_id      INTEGER NOT NULL REFERENCES catedras(id) ON DELETE CASCADE,
    tipo            tipo_curso NOT NULL,
    codigo          TEXT NOT NULL,
    dia             TEXT,
    hora_inicio     TIME,
    hora_fin        TIME,
    profesor        TEXT,
    vacantes        INTEGER,
    obligatorio     TEXT,
    aula            TEXT,
    sede            TEXT,
    observaciones   TEXT
    -- (catedra_id, tipo, codigo) NO es único: la fuente puede listar dos
    -- teóricos "I" con co-titulares en bloques consecutivos.
);

CREATE INDEX IF NOT EXISTS idx_cursos_dia       ON cursos(dia);
CREATE INDEX IF NOT EXISTS idx_cursos_catedra   ON cursos(catedra_id);
CREATE INDEX IF NOT EXISTS idx_catedras_materia ON catedras(materia_codigo);

-- Relación many-to-many: una comisión obliga a 0, 1 o 2 cursos (teórico y/o
-- seminario) de la misma cátedra. Resuelta por el scraper a partir del campo
-- cursos.obligatorio. Casos como "I - A", "J - I" (orden invertido) o "IV - II"
-- (dos teóricos) se modelan uniformemente como filas en esta tabla.
CREATE TABLE IF NOT EXISTS comision_obliga (
    comision_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    obliga_a_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    PRIMARY KEY (comision_id, obliga_a_id),
    CHECK (comision_id <> obliga_a_id)
);

CREATE INDEX IF NOT EXISTS idx_comision_obliga_obliga_a ON comision_obliga(obliga_a_id);

-- Subscripciones: registro de pagos vía Mercado Pago. clerk_user_id es FK lógica
-- (no hay tabla users propia: Firebase Auth es la fuente de verdad). El nombre
-- "clerk_user_id" es histórico y se mantiene por compatibilidad: hoy almacena
-- el uid de Firebase como string opaco. mp_external_reference y mp_payment_id
-- UNIQUE dan idempotencia ante webhook duplicado (MP reintenta y a veces manda
-- el mismo payment con distinto request).
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     BIGSERIAL PRIMARY KEY,
    clerk_user_id          TEXT NOT NULL,
    valid_from             TIMESTAMPTZ NOT NULL,
    valid_until            TIMESTAMPTZ NOT NULL,
    mp_payment_id          TEXT UNIQUE,
    mp_external_reference  TEXT UNIQUE,
    amount_ars             NUMERIC(10, 2),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user_until
    ON subscriptions(clerk_user_id, valid_until DESC);

-- Planes guardados como favoritos por usuarios Pro. plan_data almacena el Plan
-- tal cual lo devuelve /planes (snapshot en JSON: los cursos cambian entre
-- cuatrimestres, no tiene sentido FKearlo a cursos.id). clerk_user_id: mismo
-- comentario que en subscriptions — hoy guarda el uid de Firebase.
CREATE TABLE IF NOT EXISTS favorite_plans (
    id              BIGSERIAL PRIMARY KEY,
    clerk_user_id   TEXT NOT NULL,
    plan_data       JSONB NOT NULL,
    -- Snapshot de los filtros (días excluidos, franjas, sedes, selección por
    -- materia) que el usuario tenía al guardar. Se muestran en la card de la
    -- página de favoritos.
    filters_data    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_user
    ON favorite_plans(clerk_user_id, created_at DESC);
