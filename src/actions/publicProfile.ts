import { ActionError, defineAction } from "astro:actions";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdorganizationPatch,
    apiUsersIdPatch,
    apiUsersIdpersonPatch,
} from "../openapi/client/index.ts";
import { getSocialNetwork, SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks.ts";
import { zProfileForm } from "../validation/publicProfileValidation.ts";

export const updatePublicProfile = defineAction({
    accept: "json",
    input: zProfileForm,
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
            // User first: switching to `organization` makes the API create the Organization record
            const { error: userError } = await apiUsersIdPatch({
                path: { id },
                headers,
                body: {
                    // The API rejects a handle already in the DB, including the User's own
                    ...(input.handle !== session.user.handle && { handle: input.handle }),
                    avatar: input.avatar,
                    description: input.description.trim(),
                    type: input.type,
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

            if (isOrganization) {
                const { error: organizationError } = await apiUsersIdorganizationPatch({
                    path: { id },
                    headers,
                    body: {
                        taxId: input.taxId.trim(),
                        legalName: input.legalName.trim(),
                        businessName: input.businessName.trim(),
                    },
                });

                if (organizationError) {
                    throw organizationError;
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
