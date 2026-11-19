import { getContrast } from "polished";

import { DARK_THEME_COLOR_DEFAULTS, THEME_COLOR_DEFAULTS, isHexColor } from "./themeColors";

import type { DarkThemeColors, ThemeColors, ThemeColorToken } from "./themeColors";

export const MINIMUM_CONTRAST_RATIO = 4.5;

export const CONTRAST_TEXT_TOKENS = [
    "primary",
    "secondary",
    "tertiary",
    "content",
    "black",
] as const satisfies readonly ThemeColorToken[];

export const CONTRAST_BACKGROUND_TOKENS = [
    "white",
    "grey",
    "purple-soft",
    "variant1",
    "variant2",
] as const satisfies readonly ThemeColorToken[];

export interface ContrastWarning {
    theme: "light" | "dark";
    textToken: ThemeColorToken;
    backgroundToken: ThemeColorToken;
    ratio: number;
}

function findWarnings(theme: "light" | "dark", colors: ThemeColors): ContrastWarning[] {
    return CONTRAST_TEXT_TOKENS.flatMap((textToken) =>
        CONTRAST_BACKGROUND_TOKENS.flatMap((backgroundToken) => {
            const textColor = colors[textToken];
            const backgroundColor = colors[backgroundToken];

            if (!isHexColor(textColor) || !isHexColor(backgroundColor)) return [];

            const ratio = getContrast(textColor, backgroundColor);

            return ratio < MINIMUM_CONTRAST_RATIO
                ? [{ theme, textToken, backgroundToken, ratio: Number(ratio.toFixed(2)) }]
                : [];
        }),
    );
}

/** Dark tokens inherit from the light palette unless global.css explicitly overrides them. */
export function getEffectiveDarkThemeColors(
    lightColors: Partial<ThemeColors>,
    darkColors: Partial<DarkThemeColors>,
): ThemeColors {
    return {
        ...THEME_COLOR_DEFAULTS,
        ...lightColors,
        ...DARK_THEME_COLOR_DEFAULTS,
        ...darkColors,
    };
}

export function validateThemeColorContrast(
    lightColors: Partial<ThemeColors>,
    darkColors: Partial<DarkThemeColors>,
): ContrastWarning[] {
    const effectiveLight = { ...THEME_COLOR_DEFAULTS, ...lightColors };
    const effectiveDark = getEffectiveDarkThemeColors(lightColors, darkColors);

    return [...findWarnings("light", effectiveLight), ...findWarnings("dark", effectiveDark)];
}
