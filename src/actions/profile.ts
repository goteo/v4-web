import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdorganizationPatch,
    apiUsersIdPatch,
    apiUsersIdpersonPatch,
} from "../openapi/client/index.ts";
import { getSocialNetwork, SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks.ts";
import { zProfileForm } from "../validation/profileValidation.ts";

import type { Organization } from "../openapi/client/index.ts";

export const updateProfile = defineAction({
    accept: "json",
    input: z.object({
        form: zProfileForm,
        // Fields the user edited, recorded as they were written
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

        // Only send what the user edited: the API re-validates and re-encrypts every field it gets
        const changed = new Set<string>(changedFields);
        // Switching type moves the tax id and creates the Organization record, send all its fields
        const typeChanged = changed.has("type");
        const pick = <T extends object>(values: T, all = false) =>
            Object.fromEntries(
                Object.entries(values).filter(([key]) => all || changed.has(key)),
            ) as Partial<T>;

        const territoryChanged = ["country", "subLvl1", "subLvl2", "address"].some((field) =>
            changed.has(field),
        );
        const territory = {
            country: input.country,
            subLvl1: input.subLvl1 || null,
            subLvl2: input.subLvl2 || null,
            address: input.address.trim() || null,
        };

        try {
            // User first: switching to `organization` makes the API create the Organization record
            const { error: userError } = await apiUsersIdPatch({
                path: { id },
                headers,
                body: {
                    // The API rejects a handle already in the DB, including the User's own
                    ...pick({
                        handle: input.handle,
                        ...(input.avatar && { avatar: input.avatar }),
                        description: input.description.trim(),
                        type: input.type,
                    }),
                    // Always sent: the API resets an omitted list to empty
                    links,
                    // A missing country is stored as "ZZ", which the API rejects as invalid
                    ...(input.country && territoryChanged && { territory }),
                },
            });

            if (userError) {
                throw userError;
            }

            const personBody = pick(
                {
                    firstName: input.firstName.trim(),
                    lastName: input.lastName.trim(),
                    // For organizations the tax id belongs to the legal entity, not the representative
                    ...(!isOrganization && { taxId: input.taxId.trim() }),
                },
                typeChanged,
            );

            if (Object.keys(personBody).length > 0) {
                const { error: personError } = await apiUsersIdpersonPatch({
                    path: { id },
                    headers,
                    body: personBody,
                });

                if (personError) {
                    throw personError;
                }
            }

            const organizationBody = pick(
                {
                    taxId: input.taxId.trim(),
                    legalName: input.legalName.trim(),
                    businessName: input.businessName.trim(),
                },
                typeChanged,
            );

            if (isOrganization && Object.keys(organizationBody).length > 0) {
                const { error: organizationError } = await apiUsersIdorganizationPatch({
                    path: { id },
                    headers,
                    body: organizationBody as Organization,
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
