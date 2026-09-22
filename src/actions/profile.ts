import { ActionError, defineAction } from "astro:actions";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdorganizationPatch,
    apiUsersIdPatch,
    apiUsersIdpersonPatch,
} from "../openapi/client/index.ts";
import { zProfileForm } from "../validation/profileValidation.ts";

export const updateProfile = defineAction({
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

        try {
            // User first: switching to `organization` makes the API create the Organization record
            const { error: userError } = await apiUsersIdPatch({
                path: { id },
                headers,
                body: {
                    // `email` is required by the User type; unchanged here, edited from access settings
                    email: session.user.email,
                    handle: input.handle,
                    avatar: input.avatar,
                    description: input.description.trim(),
                    type: input.type,
                    territory: {
                        country: input.country || null,
                        subLvl1: input.subLvl1 || null,
                        subLvl2: input.subLvl2 || null,
                        address: input.address.trim() || null,
                    },
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
