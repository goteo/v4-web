import { ActionError, defineAction } from "astro:actions";

import { passwordGrant } from "../auth/grant.ts";
import { buildSession, setSession } from "../auth/session.ts";
import {
    apiUsersPost,
    apiUsersIdpersonPatch,
    apiUsersIdorganizationPatch,
} from "../openapi/client/index.ts";
import { zRegisterForm } from "../validation/registerValidation.ts";

export const register = defineAction({
    accept: "form",
    input: zRegisterForm,
    handler: async (input, context) => {
        const { t } = context.locals;

        try {
            const { identifier, password, firstname, lastname, taxId, legalName } = input;

            const { data: user, error } = await apiUsersPost({
                body: {
                    email: identifier,
                    password,
                    type: input.type,
                },
            });

            if (error) {
                throw error;
            }

            const userId = String(user.id);
            const auth = await passwordGrant({ identifier, password });

            if (!auth.access_token) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: t("pages.checkout.login.error.invalidCredentials"),
                });
            }

            if (input.type === "individual") {
                await apiUsersIdpersonPatch({
                    path: { id: userId },
                    headers: auth.asHttpHeaders,
                    body: {
                        taxId: taxId,
                        firstName: firstname,
                        lastName: lastname,
                    },
                });
            } else {
                await apiUsersIdpersonPatch({
                    path: { id: userId },
                    headers: auth.asHttpHeaders,
                    body: {
                        firstName: firstname,
                        lastName: lastname,
                    },
                });

                await apiUsersIdorganizationPatch({
                    path: { id: userId },
                    headers: auth.asHttpHeaders,
                    body: {
                        taxId: taxId!,
                        legalName: legalName!,
                    },
                });
            }

            const session = await buildSession(auth);
            setSession(context.cookies, session);

            return { success: true };
        } catch (error) {
            console.error("User register error:", error);

            throw new ActionError({
                code: "BAD_REQUEST",
                message: t("pages.checkout.register.error.unexpectedRegistration"),
            });
        }
    },
});
