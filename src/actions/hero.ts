import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { homeHeroRepository } from "../repositories/homeHero";
import { HOME_HERO_TABLE, translationRepository } from "../repositories/translations";
import { startOfDay } from "../utils/dates";

// The admin may translate the hero into ANY recognized language, not only the
// locales the UI is available in. A bare ISO-like code (e.g. "de", "pt", "eu")
// is enough; only well-formed codes are persisted.
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,8}([-_][a-z0-9]{2,8})*$/;

// Astro turns any empty form field into null unless the validator is optional,
// so every field the admin may leave blank has to be declared as such. The CTA
// fields are optional, but the form always submits them as trimmed strings, so
// an empty string has to be accepted as "no value".
const optionalText = z.string().optional();
const optionalUrl = z
    .string()
    .refine((value) => {
        if (value === "" || value.startsWith("/") || value.startsWith("#")) {
            return true;
        }

        try {
            const url = new URL(value);

            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }, "pages.admin.home.hero.errors.invalidUrl")
    .optional();

const scheduledDate = z.coerce
    .date()
    .refine((date) => date >= startOfDay(new Date()), "system.constraint.date.greaterThan");

// The same translatable fields exist for the base row and for each added locale.
const baseFields = z.object({
    title: z.string("system.constraint.text.notEmpty").min(1),
    content: z.string("system.constraint.text.notEmpty").min(1),
    primaryCtaText: optionalText,
    primaryCtaLink: optionalUrl,
    secondaryCtaText: optionalText,
    secondaryCtaLink: optionalUrl,
});

const translationFields = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    primaryCtaText: optionalText,
    primaryCtaLink: optionalUrl,
    secondaryCtaText: optionalText,
    secondaryCtaLink: optionalUrl,
});

const translationsSchema = z.record(z.string(), translationFields);

const TRANSLATION_COLUMNS: Record<keyof z.infer<typeof translationFields>, string> = {
    title: "title",
    content: "content",
    primaryCtaText: "primary_cta_text",
    primaryCtaLink: "primary_cta_link",
    secondaryCtaText: "secondary_cta_text",
    secondaryCtaLink: "secondary_cta_link",
};

// The locale written into the base row. The editor sends the authoring
// language (the platform language while present, otherwise the first selected
// one) and defaults to the platform language when absent.
const languageField = z.string().optional();

const heroInputSchema = z.object({
    ...baseFields.shape,
    mediaUrl: optionalUrl,
    mediaType: optionalText,
    startsAt: scheduledDate,
    language: languageField,
    // JSON payload with the translations of every added locale.
    translations: z.string().optional(),
});

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function parseTranslations(
    raw: string | undefined,
    t: Translator,
): Record<string, z.infer<typeof translationFields>> {
    if (!raw) {
        return {};
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new ActionError({
            code: "BAD_REQUEST",
            message: t("pages.admin.home.hero.errors.invalidTranslations"),
        });
    }

    const result = translationsSchema.safeParse(parsed);

    if (!result.success) {
        throw new ActionError({
            code: "BAD_REQUEST",
            message: t("pages.admin.home.hero.errors.invalidTranslations"),
        });
    }

    return Object.fromEntries(
        Object.entries(result.data).filter(([locale]) => LANGUAGE_CODE_PATTERN.test(locale)),
    );
}

function translationColumnValues(
    fields: z.infer<typeof translationFields>,
): Record<string, string> {
    const values: Record<string, string> = {};

    for (const [field, value] of Object.entries(fields)) {
        const text = value?.trim();

        if (text) {
            values[TRANSLATION_COLUMNS[field as keyof typeof TRANSLATION_COLUMNS]] = text;
        }
    }

    return values;
}

async function storeTranslations(
    heroId: number,
    translations: Record<string, z.infer<typeof translationFields>>,
): Promise<void> {
    for (const [locale, fields] of Object.entries(translations)) {
        const values = translationColumnValues(fields);

        if (Object.keys(values).length === 0) {
            continue;
        }

        await translationRepository.set(HOME_HERO_TABLE, heroId, locale, values);
    }
}

export const createHomeHero = defineAction({
    accept: "form",
    input: heroInputSchema,
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        const translations = parseTranslations(input.translations, t);

        const heroId = await homeHeroRepository.create({
            language: input.language || import.meta.env.PUBLIC_DEFAULT_LANGUAGE,
            title: input.title,
            content: input.content,
            primaryCtaText: input.primaryCtaText || null,
            primaryCtaLink: input.primaryCtaLink || null,
            secondaryCtaText: input.secondaryCtaText || null,
            secondaryCtaLink: input.secondaryCtaLink || null,
            mediaUrl: input.mediaUrl || null,
            mediaType: input.mediaType || null,
            startsAt: input.startsAt,
            dateCreated: new Date(),
        });

        await storeTranslations(heroId, translations);
    },
});

export const updateHomeHero = defineAction({
    accept: "form",
    input: heroInputSchema.extend({
        id: z.coerce.number().int().positive(),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        const translations = parseTranslations(input.translations, t);

        await homeHeroRepository.update(input.id, {
            language: input.language || import.meta.env.PUBLIC_DEFAULT_LANGUAGE,
            title: input.title,
            content: input.content,
            primaryCtaText: input.primaryCtaText || null,
            primaryCtaLink: input.primaryCtaLink || null,
            secondaryCtaText: input.secondaryCtaText || null,
            secondaryCtaLink: input.secondaryCtaLink || null,
            mediaUrl: input.mediaUrl || null,
            mediaType: input.mediaType || null,
            startsAt: input.startsAt,
        });

        // Replace the stored translations so locales dropped from the editor do
        // not keep stale rows. Depends on the D1 FK to home_hero (CASCADE).
        await translationRepository.deleteByRow(HOME_HERO_TABLE, input.id);
        await storeTranslations(input.id, translations);
    },
});

export const getHomeHeroData = defineAction({
    handler: async (_input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        return {
            heroes: await homeHeroRepository.getAll(),
        };
    },
});

export const deleteHomeHero = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive(),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        await homeHeroRepository.delete(input.id);
    },
});
