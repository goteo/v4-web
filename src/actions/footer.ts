import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { labels } from "../i18n/locales";
import { footerRepository } from "../repositories/footer";
import { FOOTER_SECTIONS, FOOTER_SOCIAL_NETWORKS } from "../types/footer";

import type { ActionAPIContext } from "astro:actions";

const defaultLocale = import.meta.env.PUBLIC_DEFAULT_LANGUAGE as keyof typeof labels;

// Site paths, anchors and http(s)/mailto URLs only: anything else (javascript:, data:)
// would end up as a clickable link on every page.
const href = z
    .string()
    .trim()
    .refine((value) => {
        if (value.startsWith("/") || value.startsWith("#")) {
            return true;
        }

        try {
            return ["http:", "https:", "mailto:"].includes(new URL(value).protocol);
        } catch {
            return false;
        }
    }, "pages.admin.customize.footer.errors.invalidUrl");

// The default locale is required, so every visitor gets a text through the fallback.
const localizedText = z
    .object(
        Object.fromEntries(
            Object.keys(labels).map((locale) => [locale, z.string().trim().optional()]),
        ),
    )
    .refine((text) => !!text[defaultLocale], "pages.admin.customize.footer.errors.missingText");

const link = z.object({ label: localizedText, href });

const partner = z.object({
    src: z.string().trim().min(1, "pages.admin.customize.footer.errors.missingImage"),
    alt: z.string().trim().min(1, "system.constraint.text.notEmpty"),
    href: z.union([z.literal(""), href]).optional(),
});

const footerSchema = z.object({
    hidden: z.record(z.enum(FOOTER_SECTIONS), z.boolean()),
    partnerGroups: z.array(z.object({ title: localizedText, partners: z.array(partner) })),
    navColumns: z.array(z.object({ title: localizedText, links: z.array(link) })),
    legalLinks: z.array(link),
    social: z.array(z.object({ network: z.enum(FOOTER_SOCIAL_NETWORKS), href })),
});

/**
 * Actions are posted to /_actions/*, which the /admin firewall rule does not
 * match, so the role has to be checked here.
 * @param context The action context
 */
function assertAdmin({ locals: { session, t } }: ActionAPIContext) {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.customize.footer.errors.forbidden"),
        });
    }
}

export const saveFooter = defineAction({
    input: z.object({ config: z.string() }),
    handler: async ({ config }, context) => {
        assertAdmin(context);

        const { t } = context.locals;

        let parsed: unknown;

        try {
            parsed = JSON.parse(config);
        } catch {
            parsed = undefined;
        }

        const result = footerSchema.safeParse(parsed);

        if (!result.success) {
            const [issue] = result.error.issues;

            throw new ActionError({ code: "BAD_REQUEST", message: t(issue.message) });
        }

        await footerRepository.save(result.data);
    },
});
