import { ActionError, defineAction } from "astro:actions";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdPatch,
    apiUsersIdpersonGet,
    apiUsersIdpersonPatch,
    type UserUserUpdationDto,
} from "../openapi/client/index.ts";
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

        try {
            const userPatch: Partial<UserUserUpdationDto> = {};

            if (input.country) {
                const currentTerritory = session.user.territory;
                const newTerritory = {
                    country: input.country,
                    subLvl1: input.subLvl1 || null,
                    subLvl2: input.subLvl2 || null,
                    address: input.address.trim() || null,
                };
                if (
                    !currentTerritory ||
                    currentTerritory.country !== newTerritory.country ||
                    (currentTerritory.subLvl1 ?? null) !== newTerritory.subLvl1 ||
                    (currentTerritory.subLvl2 ?? null) !== newTerritory.subLvl2 ||
                    (currentTerritory.address ?? null) !== newTerritory.address
                ) {
                    userPatch.territory = newTerritory;
                }
            } else if (session.user.territory?.country) {
                // Country cleared in the form: do not send territory at all
                userPatch.territory = undefined;
            }

            let userError: unknown;
            if (Object.keys(userPatch).length > 0) {
                const { error } = await apiUsersIdPatch({
                    path: { id },
                    headers,
                    body: userPatch as UserUserUpdationDto,
                });
                userError = error;
            }

            if (userError) {
                throw userError;
            }

            let personError: unknown;
            if (!isOrganization) {
                const currentPerson = await apiUsersIdpersonGet({ path: { id }, headers }).then(
                    (r) => r.data,
                );
                const personPatch: Record<string, unknown> = {};
                const firstNameTrim = input.firstName.trim();
                if ((currentPerson?.firstName ?? "") !== firstNameTrim) {
                    personPatch.firstName = firstNameTrim;
                }
                const lastNameTrim = input.lastName.trim();
                if ((currentPerson?.lastName ?? "") !== lastNameTrim) {
                    personPatch.lastName = lastNameTrim;
                }
                const taxIdTrim = input.taxId.trim();
                if ((currentPerson?.taxId ?? "") !== taxIdTrim) {
                    personPatch.taxId = taxIdTrim;
                }
                if (Object.keys(personPatch).length > 0) {
                    const { error } = await apiUsersIdpersonPatch({
                        path: { id },
                        headers,
                        body: personPatch as any,
                    });
                    personError = error;
                }
            } else {
                personError = null;
            }

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
