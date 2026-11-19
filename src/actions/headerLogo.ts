import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { headerLogoRepository } from "../repositories/headerLogo";

const LOGO_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const mediaUrl = z.string().refine((value) => {
    if (value.startsWith("/")) {
        return true;
    }

    try {
        const url = new URL(value);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}, "system.constraint.text.expectedUrl");

const logoInputSchema = z.object({
    mediaUrl,
    mediaType: z.enum(LOGO_MEDIA_TYPES),
    altText: z.string().trim().min(1, "system.constraint.text.notEmpty"),
});

/**
 * The header is public, but its management lives under /admin/customize. Actions
 * are posted to /_actions/*, which the /admin firewall rule does not match, so
 * the role has to be checked here.
 */
function assertAdmin(session: App.Locals["session"], t: App.Locals["t"]): void {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.customize.logo.errors.forbidden"),
        });
    }
}

export const createHeaderLogo = defineAction({
    accept: "form",
    input: logoInputSchema,
    handler: async (input, context) => {
        const { session, t } = context.locals;

        assertAdmin(session, t);

        await headerLogoRepository.create({
            mediaUrl: input.mediaUrl,
            mediaType: input.mediaType,
            altText: input.altText,
            dateCreated: new Date(),
        });
    },
});

export const getHeaderLogoData = defineAction({
    handler: async (_input, context) => {
        const { session, t } = context.locals;

        assertAdmin(session, t);

        return {
            logos: await headerLogoRepository.getAll(),
        };
    },
});

export const deleteHeaderLogo = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive(),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        assertAdmin(session, t);

        await headerLogoRepository.delete(input.id);
    },
});
