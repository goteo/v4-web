import ca from "../src/i18n/locales/ca.json" with { type: "json" };
import en from "../src/i18n/locales/en.json" with { type: "json" };
import es from "../src/i18n/locales/es.json" with { type: "json" };

/** Expected texts come from the locale files, so a copy change does not break tests. */
export const messages = { es, en, ca };
