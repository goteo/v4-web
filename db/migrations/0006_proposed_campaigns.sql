CREATE TABLE IF NOT EXISTS proposed_campaigns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date_created    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    date_updated    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS proposed_campaign_slots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id   INTEGER NOT NULL REFERENCES proposed_campaigns(id) ON DELETE CASCADE,
    tab           TEXT    NOT NULL CHECK (tab IN ('ending-soon', 'most-successful')),
    position      INTEGER NOT NULL,
    project_id    TEXT    NOT NULL,
    UNIQUE(proposal_id, tab, position)
);
