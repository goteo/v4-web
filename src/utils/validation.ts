import type { z } from "zod";

export type ValidationError = {
    issue: z.core.$ZodIssue;
    message: string;
    params?: Record<string, string | number>;
};

export function validate<T>(value: unknown, schema: z.ZodType<T>): ValidationError[] {
    const result = schema.safeParse(value);

    if (result.success) {
        return [];
    }

    return result.error.issues.map((issue) => ({
        issue,
        message: `system.validation.${issue.code}`,
        params: {
            value: String(value),
            field: issue.path.join("."),
            ...getValidationParams(issue),
        },
    }));
}

export function getValidationParams(
    issue: z.core.$ZodIssue,
): Record<string, string | number> | undefined {
    switch (issue.code) {
        case "too_small":
            return { min: Number(issue.minimum) };
        case "invalid_format":
            return { format: issue.pattern || issue.format };
        default:
            break;
    }
}
