import { ActionError, defineAction } from "astro:actions";

import { setSession } from "../auth/session.ts";
import {
    apiUsersIdOrHandleGet,
    apiUsersIdorganizationPatch,
    apiUsersIdPatch,
    apiUsersIdpersonGet,
    apiUsersIdpersonPatch,
    type Organization,
    type Person,
    type UserUserUpdationDto,
} from "../openapi/client/index.ts";
import { zPersonalProfileForm } from "../validation/personalProfileValidation.ts";

/**
 * Saves the private part of the profile: the `Person` and `Organization` records, the `Territory`
 * and the private flags on the `User`, and the identity row (avatar, bio, social networks) that this section shares with the public one.
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
            const nextUser: Partial<UserUserUpdationDto> = {
                handle: input.handle,
                type: input.type,
                shareLocation: input.shareLocation,
                supportAnonymously: input.supportAnonymously,
                referralSource: input.referralSource || null,
            };
            // Send only what changed: the API rejects an unchanged handle as already in use
            const userPatch: Partial<UserUserUpdationDto> = Object.fromEntries(
                Object.entries(nextUser).filter(
                    ([key, value]) =>
                        (session.user[key as keyof typeof session.user] ?? null) !== value,
                ),
            );

            if (input.country) {
                const currentTerritory = session.user.territory;
                const newTerritory = {
                    country: input.country,
                    subLvl1: input.subLvl1 || null,
                    subLvl2: input.subLvl2 || null,
                    address: input.address.trim() || null,
                    postalCode: input.postalCode.trim() || null,
                };
                if (
                    !currentTerritory ||
                    currentTerritory.country !== newTerritory.country ||
                    (currentTerritory.subLvl1 ?? null) !== newTerritory.subLvl1 ||
                    (currentTerritory.subLvl2 ?? null) !== newTerritory.subLvl2 ||
                    (currentTerritory.address ?? null) !== newTerritory.address ||
                    (currentTerritory.postalCode ?? null) !== newTerritory.postalCode
                ) {
                    userPatch.territory = newTerritory;
                }
            }

            if (Object.keys(userPatch).length > 0) {
                const { error } = await apiUsersIdPatch({
                    path: { id },
                    headers,
                    body: userPatch as UserUserUpdationDto,
                });

                if (error) {
                    throw error;
                }
            }

            if (isOrganization) {
                const organizationPatch: Partial<Organization> = {
                    legalName: input.legalName.trim(),
                    businessName: input.businessName.trim(),
                    taxId: input.taxId.trim(),
                    taxIdType: input.taxIdType || null,
                    legalForm: input.legalForm || null,
                    publicEntity: input.publicEntity,
                };

                const { error } = await apiUsersIdorganizationPatch({
                    path: { id },
                    headers,
                    body: organizationPatch as Organization,
                });

                if (error) {
                    throw error;
                }
            }

            const currentPerson = await apiUsersIdpersonGet({ path: { id }, headers }).then(
                (r) => r.data,
            );
            const nextPerson: Partial<Person> = {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                // On organizations the tax id belongs to the Organization record
                ...(!isOrganization && {
                    taxId: input.taxId.trim(),
                    taxIdType: input.taxIdType || null,
                    birthYear: input.birthYear ? Number(input.birthYear) : null,
                    gender: input.gender || null,
                }),
            };
            const personPatch = Object.fromEntries(
                Object.entries(nextPerson).filter(
                    ([key, value]) =>
                        (currentPerson?.[key as keyof Person] ?? "") !== (value ?? ""),
                ),
            );

            if (Object.keys(personPatch).length > 0) {
                const { error } = await apiUsersIdpersonPatch({
                    path: { id },
                    headers,
                    body: personPatch as Person,
                });

                if (error) {
                    throw error;
                }
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
