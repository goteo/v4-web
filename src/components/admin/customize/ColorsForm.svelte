<script lang="ts">
    import { actions } from "astro:actions";
    import { untrack } from "svelte";

    import { t } from "../../../i18n/store";
    import {
        MINIMUM_CONTRAST_RATIO,
        validateThemeColorContrast,
    } from "../../../utils/colorContrast";
    import {
        DARK_THEME_COLOR_DEFAULTS,
        DARK_THEME_COLOR_TOKENS,
        GENERIC_THEME_COLOR_TOKENS,
        LIGHT_THEME_COLOR_TOKENS,
        THEME_COLOR_DEFAULTS,
        THEME_COLOR_TOKENS,
        isHexColor,
    } from "../../../utils/themeColors";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import ColorInput from "../../library/inputs/ColorInput.svelte";
    import Tabs from "../../library/layout/Tabs.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ContrastWarning } from "../../../utils/colorContrast";
    import type {
        DarkThemeColors,
        DarkThemeColorToken,
        GenericThemeColorToken,
        ThemeColors,
        ThemeColorToken,
    } from "../../../utils/themeColors";

    interface Props {
        config: {
            lightColors: ThemeColors;
            darkColors: DarkThemeColors;
        };
    }

    let { config }: Props = $props();

    const initialConfig = untrack(() => config);
    let lightColors = $state<ThemeColors>({ ...initialConfig.lightColors });
    let darkColors = $state<DarkThemeColors>({ ...initialConfig.darkColors });
    let activeTheme = $state<"generic" | "light" | "dark">("generic");
    let showError = $state(false);
    let errorMessage = $state("");
    let showSuccess = $state(false);
    let successMessage = $state("");

    const tabs = $derived([
        { id: "generic", label: $t("pages.admin.customize.colors.themes.generic") },
        { id: "light", label: $t("pages.admin.customize.colors.themes.light") },
        { id: "dark", label: $t("pages.admin.customize.colors.themes.dark") },
    ]);
    const contrastWarnings = $derived(validateThemeColorContrast(lightColors, darkColors));
    const hasInvalidColors = $derived(
        !THEME_COLOR_TOKENS.every((token) => isHexColor(lightColors[token])) ||
            !DARK_THEME_COLOR_TOKENS.every((token) => isHexColor(darkColors[token])),
    );

    function tokenLabel(token: ThemeColorToken): string {
        return $t(`pages.admin.customize.colors.tokens.${token}`);
    }

    function warningMessage(warning: ContrastWarning, includeTheme = false): string {
        return $t(
            includeTheme
                ? "pages.admin.customize.colors.contrast.warningWithTheme"
                : "pages.admin.customize.colors.contrast.warning",
            {
                theme: $t(`pages.admin.customize.colors.themes.${warning.theme}`),
                text: tokenLabel(warning.textToken),
                background: tokenLabel(warning.backgroundToken),
                ratio: warning.ratio,
                minimum: MINIMUM_CONTRAST_RATIO,
            },
        );
    }

    function warningsFor(
        theme: "light" | "dark",
        token: ThemeColorToken | DarkThemeColorToken,
    ): string[] {
        return contrastWarnings
            .filter((warning) => warning.theme === theme && warning.textToken === token)
            .map((warning) => warningMessage(warning));
    }

    function genericWarningsFor(token: GenericThemeColorToken): string[] {
        return contrastWarnings
            .filter((warning) => warning.textToken === token)
            .map((warning) => warningMessage(warning, true));
    }

    function showFailure(message: string): never {
        errorMessage = message;
        showError = true;
        throw new Error(message);
    }

    async function handleSave() {
        if (hasInvalidColors) {
            showFailure($t("pages.admin.customize.colors.errors.invalid"));
        }

        const { error } = await actions.saveThemeColors({ lightColors, darkColors });

        if (error) showFailure(error.message);

        successMessage = $t("pages.admin.customize.colors.feedback.saved");
        showSuccess = true;
    }

    async function handleReset() {
        if (!window.confirm($t("pages.admin.customize.colors.reset.confirm"))) return;

        const { error } = await actions.resetThemeColors({});

        if (error) showFailure(error.message);

        lightColors = { ...THEME_COLOR_DEFAULTS };
        darkColors = { ...DARK_THEME_COLOR_DEFAULTS };
        successMessage = $t("pages.admin.customize.colors.feedback.reset");
        showSuccess = true;
    }
</script>

<div class="flex flex-col gap-10">
    <header class="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div class="flex max-w-2xl flex-col gap-2">
            <Title level={2} variant="headline">
                {$t("pages.admin.customize.colors.title")}
            </Title>
            <p class="text-content text-base">
                {$t("pages.admin.customize.colors.description")}
            </p>
        </div>
        <div class="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ActionableButton action={handleReset} autoreset={2000} kind="ghost" class="w-fit px-6">
                {$t("pages.admin.customize.colors.reset.button")}
            </ActionableButton>
            <ActionableButton
                action={handleSave}
                autoreset={2000}
                class="w-fit px-6"
                disabled={hasInvalidColors}
            >
                {$t("pages.admin.customize.colors.save")}
            </ActionableButton>
        </div>
    </header>
    <section
        class="bg-purple-soft border-grey flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
        aria-label={$t("pages.admin.customize.colors.contrast.title")}
    >
        <Title level={3} variant="subsection">
            {$t("pages.admin.customize.colors.contrast.title")}
        </Title>
        <p class="text-content text-sm">
            {$t("pages.admin.customize.colors.contrast.description", {
                minimum: MINIMUM_CONTRAST_RATIO,
            })}
        </p>
    </section>

    <Tabs
        {tabs}
        activeTab={activeTheme}
        alignment="left"
        useDataAttributes={false}
        onTabChange={(tab) => (activeTheme = tab as "generic" | "light" | "dark")}
    />

    {#if activeTheme === "generic"}
        <section class="flex flex-col gap-6">
            <div>
                <Title level={3} variant="subsection">
                    {$t("pages.admin.customize.colors.themes.generic")}
                </Title>
                <p class="text-content text-sm">
                    {$t("pages.admin.customize.colors.themes.genericDescription")}
                </p>
            </div>
            <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {#each GENERIC_THEME_COLOR_TOKENS as token}
                    <ColorInput
                        bind:value={lightColors[token]}
                        labelText={tokenLabel(token)}
                        helperText={`--color-${token}`}
                        pickerLabel={$t("pages.admin.customize.colors.picker", {
                            color: tokenLabel(token),
                        })}
                        error={!isHexColor(lightColors[token])
                            ? $t("pages.admin.customize.colors.errors.hex")
                            : undefined}
                        contrastWarnings={genericWarningsFor(token)}
                    />
                {/each}
            </div>
        </section>
    {:else if activeTheme === "light"}
        <section class="flex flex-col gap-6">
            <div>
                <Title level={3} variant="subsection">
                    {$t("pages.admin.customize.colors.themes.light")}
                </Title>
                <p class="text-content text-sm">
                    {$t("pages.admin.customize.colors.themes.lightDescription")}
                </p>
            </div>
            <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {#each LIGHT_THEME_COLOR_TOKENS as token}
                    <ColorInput
                        bind:value={lightColors[token]}
                        labelText={tokenLabel(token)}
                        helperText={`--color-${token}`}
                        pickerLabel={$t("pages.admin.customize.colors.picker", {
                            color: tokenLabel(token),
                        })}
                        error={!isHexColor(lightColors[token])
                            ? $t("pages.admin.customize.colors.errors.hex")
                            : undefined}
                        contrastWarnings={warningsFor("light", token)}
                    />
                {/each}
            </div>
        </section>
    {:else}
        <section class="flex flex-col gap-6">
            <div>
                <Title level={3} variant="subsection">
                    {$t("pages.admin.customize.colors.themes.dark")}
                </Title>
                <p class="text-content text-sm">
                    {$t("pages.admin.customize.colors.themes.darkDescription")}
                </p>
            </div>
            <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {#each DARK_THEME_COLOR_TOKENS as token}
                    <ColorInput
                        bind:value={darkColors[token]}
                        labelText={tokenLabel(token)}
                        helperText={`--color-${token}`}
                        pickerLabel={$t("pages.admin.customize.colors.picker", {
                            color: tokenLabel(token),
                        })}
                        error={!isHexColor(darkColors[token])
                            ? $t("pages.admin.customize.colors.errors.hex")
                            : undefined}
                        contrastWarnings={warningsFor("dark", token)}
                    />
                {/each}
            </div>
        </section>
    {/if}
</div>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
<Toast floating variant="success" bind:showToast={showSuccess}>{successMessage}</Toast>
