import { ActionError, defineAction } from "astro:actions";

import { passwordGrant } from "../auth/grant.ts";
import { buildSession, setSession } from "../auth/session.ts";
import {
    apiUsersPost,
    apiUsersIdpersonPatch,
    apiUsersIdorganizationPatch,
} from "../openapi/client/index.ts";
import { zRegisterForm } from "../validation/registerValidation.ts";

const DUPLICATE_EMAIL = /already in use|already exists|already registered|duplicate|taken/i;

interface ApiViolation {
    propertyPath?: string;
    message?: string;
}

function violationsOf(error: unknown): ApiViolation[] {
    if (typeof error !== "object" || error === null) {
        return [];
    }

    const { violations } = error as { violations?: unknown };

    return Array.isArray(violations) ? (violations as ApiViolation[]) : [];
}

function isEmailInUse(error: unknown): boolean {
    const fromViolations = violationsOf(error).some(
        (violation) =>
            violation.propertyPath === "email" && DUPLICATE_EMAIL.test(violation.message ?? ""),
    );

    if (fromViolations) {
        return true;
    }

    return (
        typeof error === "object" &&
        error !== null &&
        "detail" in error &&
        DUPLICATE_EMAIL.test((error as { detail?: string | null }).detail ?? "")
    );
}

/**
 * Turns an API constraint violation into a descriptive, localized message.
 */
function violationMessage(violation: ApiViolation, t: (key: string) => string): string | undefined {
    const { propertyPath, message = "" } = violation;

    switch (propertyPath) {
        case "email":
            return DUPLICATE_EMAIL.test(message)
                ? t("pages.checkout.register.error.emailInUse")
                : t("pages.checkout.register.form.validation.emailInvalid");
        case "password":
            return /short/i.test(message)
                ? t("pages.checkout.register.form.validation.password.minLength")
                : t("pages.checkout.register.form.validation.passwordInvalid");
        case "taxId":
            return t("pages.checkout.register.form.validation.taxIdInvalid");
        case "legalName":
        case "firstName":
        case "lastName":
            return t("pages.checkout.register.form.validation.required");
        default:
            return undefined;
    }
}

function apiErrorMessages(error: unknown, t: (key: string) => string): string[] {
    return [
        ...new Set(
            violationsOf(error)
                .map((violation) => violationMessage(violation, t))
                .filter((message): message is string => Boolean(message)),
        ),
    ];
}

export const register = defineAction({
    accept: "form",
    input: zRegisterForm,
    handler: async (input, context) => {
        const { t } = context.locals;

        // Tracks whether the account exists in the API, so post-creation
        // failures can tell the user their account was created.
        let accountCreated = false;

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

            accountCreated = true;

            const userId = String(user.id);
            const auth = await passwordGrant({ identifier, password });

            if (!auth.access_token) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: t("pages.checkout.login.error.invalidCredentials"),
                });
            }

            const headers = auth.asHttpHeaders;

            const { error: personError } = await apiUsersIdpersonPatch({
                path: { id: userId },
                headers,
                body:
                    input.type === "individual"
                        ? { taxId, firstName: firstname, lastName: lastname }
                        : { firstName: firstname, lastName: lastname },
            });

            if (personError) {
                throw personError;
            }

            if (input.type === "organization") {
                const { error: organizationError } = await apiUsersIdorganizationPatch({
                    path: { id: userId },
                    headers,
                    body: { taxId: taxId!, legalName: legalName! },
                });

                if (organizationError) {
                    throw organizationError;
                }
            }

            const session = await buildSession(auth);
            setSession(context.cookies, session);

            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) {
                throw error;
            }

            console.error("User register error:", error);

            if (isEmailInUse(error)) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: t("pages.checkout.register.error.emailInUse"),
                });
            }

            const details = apiErrorMessages(error, t);

            if (accountCreated) {
                const message = t("pages.checkout.register.error.accountCreatedProfileFailed");

                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: details.length > 0 ? `${message} ${details.join(" ")}` : message,
                });
            }

            if (details.length > 0) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: details.join(" "),
                });
            }

            throw new ActionError({
                code: "BAD_REQUEST",
                message: t("pages.checkout.register.error.unexpectedRegistration"),
            });
        }
    },
});
