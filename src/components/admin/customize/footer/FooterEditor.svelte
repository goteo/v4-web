<script lang="ts">
    import { actions } from "astro:actions";
    import { Modal } from "flowbite-svelte";
    import { tick, untrack } from "svelte";

    import { languagesList, type Locale } from "../../../../i18n/locales";
    import { t } from "../../../../i18n/store";
    import { localized } from "../../../../layouts/footer-data";
    import { FOOTER_SOCIAL_NETWORKS } from "../../../../types/footer";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import FooterView from "../../../footer/FooterView.svelte";
    import Trash from "../../../icons/actions/Trash.svelte";
    import Chevron from "../../../icons/navigation/Chevron.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import Checkbox from "../../../library/inputs/Checkbox.svelte";
    import ImageUploadModal from "../../../library/inputs/ImageUploadModal.svelte";
    import Select from "../../../library/inputs/Select.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import TabNavigation from "../../../library/layout/TabNavigation.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type {
        FooterConfig,
        FooterSection,
        FooterLinkItem,
        FooterPartner,
        LocalizedText,
    } from "../../../../types/footer";
    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    interface Props {
        config: FooterConfig;
    }

    let { config: initial }: Props = $props();

    const defaultLanguage = getDefaultLanguage() as Locale;

    // Own copy, sent whole on save. `$state.snapshot` because Astro hydrates props as a
    // `$state` proxy, which `structuredClone` cannot copy.
    let config = $state<FooterConfig>($state.snapshot(untrack(() => initial)));
    const languageTabs = Object.entries(languagesList).map(([id, label]) => ({ id, label }));
    let language = $state<Locale>(defaultLanguage);

    let errorMessage = $state("");
    let showError = $state(false);
    let showSaved = $state(false);

    // The partner list and position the upload modal fills; `index` past the end adds one.
    let uploadTarget = $state<{ list: FooterPartner[]; index: number } | null>(null);
    let isUploadOpen = $state(false);

    function move<T>(list: T[], index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= list.length) return;

        [list[index], list[target]] = [list[target], list[index]];
    }

    function openUpload(list: FooterPartner[], index: number) {
        uploadTarget = { list, index };
        isUploadOpen = true;
    }

    function handleUpload([file]: UploadedObject[]) {
        if (!file || !uploadTarget) return;

        const { list, index } = uploadTarget;

        if (index < list.length) {
            list[index].src = file.url;
        } else {
            list.push({ src: file.url, alt: "", href: "" });
        }

        uploadTarget = null;
    }

    let form: HTMLFormElement;

    // The `.wrapper` max width: the preview is drawn at that size and zoomed into its box.
    const PREVIEW_WIDTH = 1440;
    let previewWidth = $state(0);

    // The navigation column or logo group being edited in the modal.
    type EditableList = "navColumns" | "partnerGroups";

    let editing = $state<{ list: EditableList; index: number } | null>(null);
    let isEditOpen = $state(false);

    function edit(list: EditableList, index: number) {
        editing = { list, index };
        isEditOpen = true;
    }

    function addColumn() {
        config.navColumns.push({ title: {}, links: [{ label: {}, href: "" }] });
        edit("navColumns", config.navColumns.length - 1);
    }

    function addGroup() {
        config.partnerGroups.push({ title: {}, partners: [] });
        edit("partnerGroups", config.partnerGroups.length - 1);
    }

    // A row is highlighted while any of its fields has focus (`focus-within`).
    const rowClass =
        "focus-within:ring-primary flex items-center gap-3 rounded-lg focus-within:ring-2";

    /**
     * Clicking an element of the preview focuses its row in the form, matched through the
     * `data-edit` path the preview puts on it. The preview's own links never navigate.
     */
    async function focusField(event: MouseEvent) {
        event.preventDefault();

        const path = (event.target as Element).closest<HTMLElement>("[data-edit]")?.dataset.edit;

        if (!path) return;

        // Columns and logo groups are edited in a modal: open it and wait until it has rendered.
        // ponytail: two frames, because the dialog grabs focus itself when its intro starts.
        const [list, index] = path.split(".");

        if (list === "navColumns" || list === "partnerGroups") {
            edit(list, Number(index));
            await tick();
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
        }

        const row = form.querySelector(`[data-field="${path}"]`);

        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        row?.querySelector<HTMLElement>("input, select, button")?.focus({ preventScroll: true });
    }

    async function save() {
        const { error } = await actions.saveFooter({ config: JSON.stringify(config) });

        if (error) {
            errorMessage =
                error.code === "INTERNAL_SERVER_ERROR" ? $t("system.error.unknown") : error.message;
            showError = true;

            throw error;
        }

        showSaved = true;
    }
</script>

{#snippet rowControls(list: unknown[], index: number)}
    <div class="flex shrink-0 items-center gap-1">
        <button
            type="button"
            class="text-secondary cursor-pointer p-1 disabled:opacity-30"
            aria-label={$t("pages.admin.customize.footer.actions.moveUp")}
            disabled={index === 0}
            onclick={() => move(list, index, -1)}
        >
            <Chevron direction="up" width="20" height="20" />
        </button>
        <button
            type="button"
            class="text-secondary cursor-pointer p-1 disabled:opacity-30"
            aria-label={$t("pages.admin.customize.footer.actions.moveDown")}
            disabled={index === list.length - 1}
            onclick={() => move(list, index, 1)}
        >
            <Chevron direction="down" width="20" height="20" />
        </button>
        <button
            type="button"
            class="text-tertiary cursor-pointer p-1"
            aria-label={$t("common.remove")}
            onclick={() => list.splice(index, 1)}
        >
            <Trash width="18" height="20" />
        </button>
    </div>
{/snippet}

{#snippet localizedInput(text: LocalizedText, placeholder: string)}
    <div class="flex-1">
        <TextInput
            bind:value={() => text[language] ?? "", (value) => (text[language] = String(value))}
            placeholder={language === defaultLanguage
                ? placeholder
                : text[defaultLanguage] || placeholder}
        />
    </div>
{/snippet}

{#snippet linkList(links: FooterLinkItem[], path: string)}
    <ul class="space-y-3">
        {#each links as link, index (link)}
            <li class={rowClass} data-field="{path}.{index}">
                {@render localizedInput(
                    link.label,
                    $t("pages.admin.customize.footer.fields.labelPlaceholder"),
                )}
                <div class="flex-1">
                    <TextInput
                        bind:value={link.href}
                        placeholder={$t("pages.admin.customize.footer.fields.hrefPlaceholder")}
                    />
                </div>
                {@render rowControls(links, index)}
            </li>
        {/each}
    </ul>
    <Button
        kind="ghost"
        size="sm"
        class="w-fit"
        onclick={() => links.push({ label: {}, href: "" })}
    >
        {$t("pages.admin.customize.footer.actions.addLink")}
    </Button>
{/snippet}

{#snippet partnerList(partners: FooterPartner[], path: string)}
    <ul class="space-y-3">
        {#each partners as partner, index (partner)}
            <li class={rowClass} data-field="{path}.{index}">
                <button
                    type="button"
                    class="bg-grey flex h-14 w-24 shrink-0 cursor-pointer items-center justify-center rounded-lg p-1"
                    aria-label={$t("pages.admin.customize.footer.actions.changeImage")}
                    onclick={() => openUpload(partners, index)}
                >
                    <img src={partner.src} alt="" class="max-h-full max-w-full object-contain" />
                </button>
                <div class="flex-1">
                    <TextInput
                        bind:value={partner.alt}
                        placeholder={$t("pages.admin.customize.footer.fields.altPlaceholder")}
                    />
                </div>
                <div class="flex-1">
                    <TextInput
                        bind:value={
                            () => partner.href ?? "", (value) => (partner.href = String(value))
                        }
                        placeholder={$t(
                            "pages.admin.customize.footer.fields.partnerHrefPlaceholder",
                        )}
                    />
                </div>
                {@render rowControls(partners, index)}
            </li>
        {/each}
    </ul>
    <Button
        kind="ghost"
        size="sm"
        class="w-fit"
        onclick={() => openUpload(partners, partners.length)}
    >
        {$t("pages.admin.customize.footer.actions.addPartner")}
    </Button>
{/snippet}

<!-- One language for the whole editor: the form and the modal switch it together. -->
{#snippet languageTabsNav()}
    <TabNavigation
        tabs={languageTabs}
        currentTab={language}
        onTabClick={(id) => (language = id as Locale)}
    />
{/snippet}

{#snippet sectionHeader(section: FooterSection, titleKey: string)}
    <div class="flex flex-wrap items-center justify-between gap-4">
        <Title level={3} variant="subsection">{$t(titleKey)}</Title>
        <Checkbox
            bind:checked={config.hidden[section]}
            label={$t("pages.admin.customize.footer.hideSection")}
        />
    </div>
{/snippet}

{#snippet summaryCard(list: EditableList, title: LocalizedText, count: string, index: number)}
    <li class="border-grey flex items-center gap-3 rounded-2xl border p-4">
        <div class="flex-1">
            <p class="text-secondary font-bold">
                {localized(title, language) ||
                    $t("pages.admin.customize.footer.fields.titlePlaceholder")}
            </p>
            <p class="text-content text-sm">{count}</p>
        </div>
        <Button kind="ghost" size="sm" onclick={() => edit(list, index)}>
            {$t("common.edit")}
        </Button>
        {@render rowControls(config[list], index)}
    </li>
{/snippet}

<section class="mb-10 space-y-3">
    <Title level={3} variant="subsection">
        {$t("pages.admin.customize.footer.sections.preview")}
    </Title>
    <p class="text-content text-sm">{$t("pages.admin.customize.footer.previewHelp")}</p>
    <!-- Mouse shortcut only: every field is reachable from the form below. -->
    <div
        role="presentation"
        class="[&_[data-edit]:hover]:outline-primary overflow-hidden [&_[data-edit]]:cursor-pointer [&_[data-edit]]:rounded-sm [&_[data-edit]:hover]:outline-2 [&_[data-edit]:hover]:outline-offset-2"
        onclick={focusField}
        bind:clientWidth={previewWidth}
    >
        <!-- Laid out as on a 1440px window (1360px of content), then zoomed to fit. -->
        <div
            class="w-360"
            style:zoom={previewWidth ? Math.min(1, previewWidth / PREVIEW_WIDTH) : undefined}
        >
            <FooterView {config} lang={language} t={$t} idPrefix="footer-preview" />
        </div>
    </div>
</section>

<form
    bind:this={form}
    class="space-y-10"
    onsubmit={(event) => {
        event.preventDefault();
    }}
>
    <div class="space-y-2">
        {@render languageTabsNav()}
        <p class="text-content text-sm">
            {$t("pages.admin.customize.footer.languageHelp", {
                language: languagesList[defaultLanguage],
            })}
        </p>
    </div>

    <div class="grid gap-10 xl:grid-cols-2">
        <section class="space-y-6">
            {@render sectionHeader("partners", "pages.admin.customize.footer.sections.partners")}

            <ul class="space-y-3">
                {#each config.partnerGroups as group, index (group)}
                    {@render summaryCard(
                        "partnerGroups",
                        group.title,
                        $t("pages.admin.customize.footer.logoCount", {
                            count: group.partners.length,
                        }),
                        index,
                    )}
                {/each}
            </ul>

            <Button kind="secondary" size="sm" class="w-fit" onclick={addGroup}>
                {$t("pages.admin.customize.footer.actions.addGroup")}
            </Button>
        </section>

        <section class="space-y-6">
            {@render sectionHeader(
                "navigation",
                "pages.admin.customize.footer.sections.navigation",
            )}

            <ul class="space-y-3">
                {#each config.navColumns as column, index (column)}
                    {@render summaryCard(
                        "navColumns",
                        column.title,
                        $t("pages.admin.customize.footer.linkCount", {
                            count: column.links.length,
                        }),
                        index,
                    )}
                {/each}
            </ul>

            <Button kind="secondary" size="sm" class="w-fit" onclick={addColumn}>
                {$t("pages.admin.customize.footer.actions.addColumn")}
            </Button>
        </section>
    </div>

    <!-- Inside the form so `focusField` finds its rows; Enter is already prevented. -->
    <Modal
        bind:open={isEditOpen}
        closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
        class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex max-h-[90vh] w-full max-w-200 -translate-x-1/2 -translate-y-1/2 divide-y-0 overflow-y-auto rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
        bodyClass="p-8"
    >
        {#if editing && config[editing.list][editing.index]}
            {@const { list, index } = editing}
            <div class="space-y-6">
                <Title level={2} variant="subsection">
                    {$t(
                        list === "navColumns"
                            ? "pages.admin.customize.footer.editColumn"
                            : "pages.admin.customize.footer.editGroup",
                    )}
                </Title>
                {@render languageTabsNav()}
                <div class={rowClass} data-field="{list}.{index}">
                    {@render localizedInput(
                        config[list][index].title,
                        $t("pages.admin.customize.footer.fields.titlePlaceholder"),
                    )}
                </div>
                {#if list === "navColumns"}
                    {@render linkList(config.navColumns[index].links, `navColumns.${index}.links`)}
                {:else}
                    {@render partnerList(
                        config.partnerGroups[index].partners,
                        `partnerGroups.${index}.partners`,
                    )}
                {/if}
                <div class="flex justify-end">
                    <Button class="w-fit" onclick={() => (isEditOpen = false)}>
                        {$t("common.close")}
                    </Button>
                </div>
            </div>
        {/if}
    </Modal>

    <div class="grid gap-10 xl:grid-cols-2">
        <section class="space-y-4">
            {@render sectionHeader("legal", "pages.admin.customize.footer.sections.legal")}
            {@render linkList(config.legalLinks, "legalLinks")}
        </section>

        <section class="space-y-4">
            {@render sectionHeader("social", "pages.admin.customize.footer.sections.social")}
            <ul class="space-y-3">
                {#each config.social as link, index (link)}
                    <li class={rowClass} data-field="social.{index}">
                        <Select bind:value={link.network} class="w-48">
                            {#each FOOTER_SOCIAL_NETWORKS as network (network)}
                                <option value={network}>
                                    {$t(`common.footer.a11y.social.${network}`)}
                                </option>
                            {/each}
                        </Select>
                        <div class="flex-1">
                            <TextInput
                                bind:value={link.href}
                                placeholder={$t(
                                    "pages.admin.customize.footer.fields.socialPlaceholder",
                                )}
                            />
                        </div>
                        {@render rowControls(config.social, index)}
                    </li>
                {/each}
            </ul>
            <Button
                kind="ghost"
                size="sm"
                class="w-fit"
                onclick={() => config.social.push({ network: "instagram", href: "" })}
            >
                {$t("pages.admin.customize.footer.actions.addSocial")}
            </Button>
        </section>
    </div>

    <ActionableButton action={save} autoreset={2000} class="w-fit">
        {$t("common.save")}
    </ActionableButton>
</form>

<ImageUploadModal
    bind:open={isUploadOpen}
    accept={["image/png", "image/jpeg", "image/webp"]}
    recommendedSize="300x120px"
    onConfirm={handleUpload}
/>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
<Toast floating variant="success" bind:showToast={showSaved}>
    {$t("pages.admin.customize.footer.saved")}
</Toast>
