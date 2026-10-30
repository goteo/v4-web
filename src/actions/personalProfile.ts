import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

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

const TERRITORY_FIELDS = ["country", "subLvl1", "subLvl2", "address", "postalCode"];

/**
 * Saves the private part of the profile: the `Person` and `Organization` records, the `Territory`
 * and the private flags on the `User`, and the identity row (avatar, bio, social networks) that this section shares with the public one.
 * The email is deliberately left out: changing it needs a confirmation flow the API does not
 * expose here.
 */
export const updatePersonalProfile = defineAction({
    accept: "json",
    input: z.object({
        form: zPersonalProfileForm,
        // Fields the user edited since the last save, tracked by the form
        changed: z.array(zPersonalProfileForm.keyof()),
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

        // Only send what the user edited: the API re-validates every field it gets, and rejects
        // an unchanged handle as already in use
        const changed = new Set<string>(changedFields);
        // Switching type moves the tax id to the other record, send all of its fields
        const typeChanged = changed.has("type");
        const pick = <T extends object>(values: T, all = false) =>
            Object.fromEntries(
                Object.entries(values).filter(([key]) => all || changed.has(key)),
            ) as Partial<T>;
        const hasFields = (values: object) => Object.keys(values).length > 0;

        try {
            const userPatch: Partial<UserUserUpdationDto> = pick({
                handle: input.handle,
                type: input.type,
                shareLocation: input.shareLocation,
                supportAnonymously: input.supportAnonymously,
                referralSource: input.referralSource || null,
            });

            if (input.country && TERRITORY_FIELDS.some((field) => changed.has(field))) {
                userPatch.territory = {
                    country: input.country,
                    subLvl1: input.subLvl1 || null,
                    subLvl2: input.subLvl2 || null,
                    address: input.address.trim() || null,
                    postalCode: input.postalCode.trim() || null,
                };
            }

            if (hasFields(userPatch)) {
                const { error } = await apiUsersIdPatch({
                    path: { id },
                    headers,
                    body: userPatch as UserUserUpdationDto,
                });

                if (error) {
                    throw error;
                }
            }

            const organizationPatch: Partial<Organization> = pick(
                {
                    legalName: input.legalName.trim(),
                    businessName: input.businessName.trim(),
                    taxId: input.taxId.trim(),
                    taxIdType: input.taxIdType || null,
                    legalForm: input.legalForm || null,
                    publicEntity: input.publicEntity,
                },
                typeChanged,
            );

            if (isOrganization && hasFields(organizationPatch)) {
                const { error } = await apiUsersIdorganizationPatch({
                    path: { id },
                    headers,
                    body: organizationPatch as Organization,
                });

                if (error) {
                    throw error;
                }
            }

            const personPatch: Partial<Person> = {
                ...pick({ firstName: input.firstName.trim(), lastName: input.lastName.trim() }),
                // On organizations the tax id belongs to the Organization record
                ...(!isOrganization &&
                    pick(
                        {
                            taxId: input.taxId.trim(),
                            taxIdType: input.taxIdType || null,
                            birthYear: input.birthYear ? Number(input.birthYear) : null,
                            gender: input.gender || null,
                        },
                        typeChanged,
                    )),
            };

            if (hasFields(personPatch)) {
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
