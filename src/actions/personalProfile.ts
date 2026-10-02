import { ActionError, defineAction } from "astro:actions";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdPatch,
    apiUsersIdpersonGet,
    apiUsersIdpersonPatch,
} from "../openapi/client/index.ts";
import { getSocialNetwork, SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks.ts";
import { zPersonalProfileForm } from "../validation/personalProfileValidation.ts";

/**
 * Saves the private part of the profile: the `Person` record, the `Territory` on the `User` and
 * the identity row (avatar, bio, social networks) that this section shares with the public one.
 * The email is deliberately left out: changing it needs a confirmation flow the API does not
 * expose here.
 */
export const updatePersonalProfile = defineAction({
    accept: "json",
    input: zPersonalProfileForm,
    handler: async (input, context) => {
        const { t, session } = context.locals;

        if (!session) {
            throw new ActionError({
                code: "UNAUTHORIZED",
                message: t("system.error.unauthorized"),
            });
        }

        const id = String(session.user.id);
        const headers = session.token.asHttpHeaders;
        const isOrganization = input.type === "organization";

        // PATCH replaces the whole list, keep the links the form does not manage (websites, etc.)
        const currentLinks = (session.user.links ?? []).flatMap((link) => link.url ?? []);
        const links = [
            ...currentLinks.filter((url) => !getSocialNetwork(url)),
            ...SOCIAL_NETWORKS.flatMap((network) => {
                const url = input.links[network].trim();

                return (url && toSocialLinkUrl(network, url)) || [];
            }),
        ];

        try {
            const { error: userError } = await apiUsersIdPatch({
                path: { id },
                headers,
                body: {
                    avatar: input.avatar,
                    description: input.description.trim(),
                    links,
                    // A missing country is stored as "ZZ", which the API rejects as invalid
                    ...(input.country && {
                        territory: {
                            country: input.country,
                            subLvl1: input.subLvl1 || null,
                            subLvl2: input.subLvl2 || null,
                            address: input.address.trim() || null,
                        },
                    }),
                },
            });

            if (userError) {
                throw userError;
            }

            const { error: personError } = await apiUsersIdpersonPatch({
                path: { id },
                headers,
                body: {
                    firstName: input.firstName.trim(),
                    lastName: input.lastName.trim(),
                    // For organizations the tax id belongs to the legal entity, not the representative
                    ...(isOrganization ? {} : { taxId: input.taxId.trim() }),
                },
            });

            if (personError) {
                throw personError;
            }

            // The names feed the display name, refresh the cookie so the header stays in sync
            const [{ data: user }, { data: person }] = await Promise.all([
                apiUsersIdOrHandleGet({ path: { idOrHandle: id }, headers }),
                apiUsersIdpersonGet({ path: { id }, headers }),
            ]);

            if (user) {
                setSession(context.cookies, { ...session, user });
            }

            return { user: user ?? session.user, person };
        } catch (error) {
            console.error("Personal profile update error:", error);

            const detail =
                typeof error === "object" && error !== null && "detail" in error
                    ? (error as { detail?: string | null }).detail
                    : undefined;

            throw new ActionError({
                code: "BAD_REQUEST",
                message: detail || t("pages.me.manage.personal.error"),
            });
        }
    },
});
