import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { themeColorsRepository } from "../repositories/themeColors";
import { DARK_THEME_COLOR_TOKENS, THEME_COLOR_TOKENS, isHexColor } from "../utils/themeColors";

const hexColorSchema = z
    .string()
    .refine(isHexColor, "Colors must use #RRGGBB or #RRGGBBAA notation");

function assertAdmin(
    session: { user: { roles?: string[] } } | undefined,
    t: (key: string) => string,
) {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.customize.colors.errors.forbidden"),
        });
    }
}

export const saveThemeColors = defineAction({
    accept: "json",
    input: z.object({
        lightColors: z.record(z.enum(THEME_COLOR_TOKENS), hexColorSchema),
        darkColors: z.record(z.enum(DARK_THEME_COLOR_TOKENS), hexColorSchema),
    }),
    handler: async (input, context) => {
        assertAdmin(context.locals.session, context.locals.t);

        await themeColorsRepository.save(input.lightColors, input.darkColors);
    },
});

export const resetThemeColors = defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (_input, context) => {
        assertAdmin(context.locals.session, context.locals.t);

        await themeColorsRepository.reset();
    },
});
