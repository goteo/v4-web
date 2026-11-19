import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { setSession } from "../auth/session.ts";
import { apiUsersIdOrHandleGet, apiUsersIdPatch } from "../openapi/client/index.ts";
import { getSocialNetwork, SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks.ts";
import { zProfileForm } from "../validation/publicProfileValidation.ts";

export const updatePublicProfile = defineAction({
    accept: "json",
    input: z.object({
        form: zProfileForm,
        // Fields the user edited since the last save, tracked by the form
        changed: z.array(zProfileForm.keyof()),
    }),
    handler: async ({ form: input, changed: changedFields }, context) => {
        const { t, session } = context.locals;

        if (!session) {
            throw new ActionError({
                code: "UNAUTHORIZED",
                message: t("system.error.unauthorized"),
            });
        }

        const id = String(session.user.id);
        const headers = session.token.asHttpHeaders;

        // PATCH replaces the whole list, keep the links the form does not manage (websites, etc.)
        const currentLinks = (session.user.links ?? []).flatMap((link) => link.url ?? []);
        const links = [
            ...currentLinks.filter((url) => !getSocialNetwork(url)),
            ...SOCIAL_NETWORKS.flatMap((network) => {
                const url = input.links[network].trim();

                return (url && toSocialLinkUrl(network, url)) || [];
            }),
        ];

        // Only send what the user edited: the API re-validates every field it gets
        const changed = new Set<string>(changedFields);
        const userPatch = Object.fromEntries(
            Object.entries({
                avatar: input.avatar,
                description: input.description.trim(),
                links,
            }).filter(([key]) => changed.has(key)),
        );

        try {
            if (Object.keys(userPatch).length > 0) {
                const { error } = await apiUsersIdPatch({ path: { id }, headers, body: userPatch });

                if (error) {
                    throw error;
                }
            }

            // Keep the session cookie in sync so header and profile pages show fresh data
            const { data: user } = await apiUsersIdOrHandleGet({
                path: { idOrHandle: id },
                headers,
            });

            if (user) {
                setSession(context.cookies, { ...session, user });
            }

            return { user: user ?? session.user };
        } catch (error) {
            console.error("User profile update error:", error);

            const detail =
                typeof error === "object" && error !== null && "detail" in error
                    ? (error as { detail?: string | null }).detail
                    : undefined;

            throw new ActionError({
                code: "BAD_REQUEST",
                message: detail || t("pages.me.manage.error"),
            });
        }
    },
});
