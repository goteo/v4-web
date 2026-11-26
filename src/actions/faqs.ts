import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { labels, type Locale } from "../i18n/locales";
import { faqRepository } from "../repositories/faqs";

import type { ActionAPIContext } from "astro:actions";

const defaultLocale = import.meta.env.PUBLIC_DEFAULT_LANGUAGE as Locale;
const locales = Object.keys(labels) as Locale[];

const localizedText = z.object(
    Object.fromEntries(locales.map((locale) => [locale, z.string().trim().optional()])),
) as z.ZodType<Partial<Record<Locale, string>>>;

const faqsSchema = z.array(
    z
        .object({
            id: z.number().int().positive().optional(),
            question: localizedText,
            answer: localizedText,
        })
        // The default locale is required, so every visitor gets a text through the fallback.
        .refine(
            ({ question, answer }) => !!question[defaultLocale] && !!answer[defaultLocale],
            "pages.admin.comm.faqs.errors.missingText",
        )
        // Half a translation would show a question in one language and its answer in another.
        .refine(
            ({ question, answer }) =>
                locales.every((locale) => !!question[locale] === !!answer[locale]),
            "pages.admin.comm.faqs.errors.incompleteTranslation",
        ),
);

/**
 * Actions are posted to /_actions/*, which the /admin firewall rule does not
 * match, so the role has to be checked here.
 * @param context The action context
 */
function assertAdmin({ locals: { session, t } }: ActionAPIContext) {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.comm.faqs.errors.forbidden"),
        });
    }
}

export const saveFaqs = defineAction({
    input: z.object({ faqs: z.string() }),
    handler: async ({ faqs }, context) => {
        assertAdmin(context);

        const { t } = context.locals;

        let parsed: unknown;

        try {
            parsed = JSON.parse(faqs);
        } catch {
            parsed = undefined;
        }

        const result = faqsSchema.safeParse(parsed);

        if (!result.success) {
            const [issue] = result.error.issues;

            throw new ActionError({ code: "BAD_REQUEST", message: t(issue.message) });
        }

        await faqRepository.saveAll(result.data, defaultLocale);

        // New FAQs get their ids here, so the next save updates them instead of adding them again.
        return faqRepository.getAll();
    },
});
