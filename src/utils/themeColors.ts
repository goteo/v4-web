export const THEME_COLOR_DEFAULTS = {
    primary: "#59e9d3",
    secondary: "#462949",
    tertiary: "#e94668",
    content: "#575757",
    white: "#fbfbfb",
    black: "#3d3d3d",
    grey: "#f3f3ef",
    "purple-soft": "#faf9ff",
    "purple-med": "#f6f5ff",
    overlay: "#878282b2",
    variant1: "#e6e5f7",
    variant2: "#99ffcc",
    variant3: "#72d8ff",
    variant4: "#ffff99",
    "semantic-error": "#e9b1bd",
    "semantic-success": "#b1e9e1",
    "semantic-notification": "#c2eeff",
    "semantic-warning": "#ffffc2",
} as const;

export const DARK_THEME_COLOR_DEFAULTS = {
    primary: "#3d3d3d",
    secondary: "#94a3b8",
    grey: "#2a2a2a",
    variant1: "#3a3551",
    white: "#f8f9fa",
    "purple-soft": "#1a1730",
    "purple-med": "#22203a",
} as const;

export type ThemeColorToken = keyof typeof THEME_COLOR_DEFAULTS;
export type DarkThemeColorToken = keyof typeof DARK_THEME_COLOR_DEFAULTS;
export type GenericThemeColorToken = Exclude<ThemeColorToken, DarkThemeColorToken>;
export type ThemeColors = Record<ThemeColorToken, string>;
export type DarkThemeColors = Record<DarkThemeColorToken, string>;

export const THEME_COLOR_TOKENS = Object.keys(THEME_COLOR_DEFAULTS) as ThemeColorToken[];
export const DARK_THEME_COLOR_TOKENS = Object.keys(
    DARK_THEME_COLOR_DEFAULTS,
) as DarkThemeColorToken[];
export const LIGHT_THEME_COLOR_TOKENS = DARK_THEME_COLOR_TOKENS;
export const GENERIC_THEME_COLOR_TOKENS = THEME_COLOR_TOKENS.filter(
    (token) => !(token in DARK_THEME_COLOR_DEFAULTS),
) as GenericThemeColorToken[];

export function isHexColor(value: string): boolean {
    return /^#(?:[\da-f]{6}|[\da-f]{8})$/i.test(value);
}

/**
 * Produces the inline style consumed by the fallbacks in global.css. Style attributes are allowed
 * by the CSP, unlike a runtime-generated <style> element whose hash Astro cannot know at build time.
 */
export function buildThemeColorStyleAttribute(
    lightColors: Partial<ThemeColors>,
    darkColors: Partial<DarkThemeColors>,
): string {
    const lightDeclarations = THEME_COLOR_TOKENS.flatMap((token) => {
        const value = lightColors[token];
        return value && isHexColor(value) ? [`--custom-color-${token}: ${value};`] : [];
    });
    const darkDeclarations = DARK_THEME_COLOR_TOKENS.flatMap((token) => {
        const value = darkColors[token];
        return value && isHexColor(value) ? [`--custom-dark-color-${token}: ${value};`] : [];
    });

    return [...lightDeclarations, ...darkDeclarations].join(" ");
}
