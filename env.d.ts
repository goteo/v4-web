/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
    interface Locals {
        /**
         * Language code of one of the available localisations.\
         * Based on requesting client preferences, fallsback to `PUBLIC_DEFAULT_LANGUAGE`.
         */
        lang: import("./src/i18n/locales/index").Locale;

        /**
         * A sorted list of language codes as preferred by the requesting client.\
         * Languages first in the list have a higher preference.
         */
        langs: string[];

        /**
         * Translation function with locale set.
         */
        t: ReturnType<typeof import("./src/i18n/utils").useTranslations>;

        /**
         * The detected session.
         */
        session: import("./src/auth/types").Session | undefined;

        /**
         * Set when the API did not answer its health check and the request was sent to `/500`.
         */
        apiDown?: boolean;
    }
}

declare namespace Cloudflare {
    interface Env {
        DB: D1Database;
    }
}
