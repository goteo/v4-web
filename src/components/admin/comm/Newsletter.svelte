<script lang="ts">
    import {
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import PlusIcon from "../../icons/actions/PlusIcon.svelte";
    import FiltersIcon from "../../icons/filters/Filters.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import FilterComposer from "../../library/filters/FilterComposer.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import Search from "../../library/inputs/Search.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import TabNavigation from "../../library/layout/TabNavigation.svelte";
    import Pagination from "../../library/paginations/Pagination.svelte";

    export interface NewsletterTemplateItem {
        id: number | string;
        name: string;
        description: string;
    }

    interface Props {
        templates?: NewsletterTemplateItem[];
        onSendNewsletter?: (payload: Record<string, unknown>) => void;
        onSearchCommunications?: (filters: Record<string, unknown>) => void;
        onEditTemplate?: (id: number | string) => void;
    }

    let {
        templates = [],
        onSendNewsletter,
        onSearchCommunications,
        onEditTemplate,
    }: Props = $props();

    let activeTab = $state("send");
    const navTabs = $derived([
        { id: "send", label: $t("pages.admin.newsletter.tabs.send") },
        { id: "templates", label: $t("pages.admin.newsletter.tabs.templates") },
        { id: "communications", label: $t("pages.admin.newsletter.tabs.communications") },
    ]);

    let selectedTemplate = $state("");
    let recipientBlocks = $state([0]);
    let selectedRecipients = $state<Record<number, string>>({});
    let isTest = $state(false);
    let onlySpanish = $state(false);

    function addRecipientBlock() {
        recipientBlocks = [...recipientBlocks, recipientBlocks.length];
    }

    let searchQuery = $state("");
    let currentPage = $state(1);
    let itemsPerPage = 10;

    let filteredTemplates = $derived(
        templates.filter(
            (tmpl) =>
                tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

    let filterDirectedTo = $state("");
    let filterProjectName = $state("");
    let filterPaymentMethod = $state("");
    let filterInterest = $state("");
    /* GOTEO-OC-DONATION-CERTIFICATE: certificate recipient filter is exclusive to the
     * donation-certificate feature of Goteo under Fundación Platoniq, hidden in the
     * open-core. Re-enable when a feature toggle exists. Do not delete.
     *
     * let filterCertificate = $state("");
     */
    let filterPreferredLanguage = $state("");
    let filterNewsletterLanguage = $state("");
    let filterStatus = $state("");
    let filterDates = $state("");
    let filterNameEmail = $state("");
    let filterLocation = $state("");
    let filterProfile = $state("");

    let isSubmitting = $state(false);

    const recipientOptions = $derived([
        { value: "all", label: $t("pages.admin.newsletter.send.recipients.all") },
        { value: "promoters", label: $t("pages.admin.newsletter.send.recipients.promoters") },
        { value: "donors", label: $t("pages.admin.newsletter.send.recipients.donors") },
    ]);

    function handleSendSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!selectedTemplate) {
            alert($t("pages.admin.newsletter.send.errors.noTemplate"));
            return;
        }

        isSubmitting = true;
        onSendNewsletter?.({
            templateId: selectedTemplate,
            recipients: selectedRecipients,
            isTest,
            onlySpanish,
        });
        isSubmitting = false;
    }

    function handleSearchSubmit(e?: SubmitEvent | Record<string, unknown>) {
        if (e && typeof e === "object" && "preventDefault" in e) {
            (e as SubmitEvent).preventDefault();
        }

        const payload =
            e && typeof e === "object" && !("preventDefault" in e)
                ? e
                : {
                      directedTo: filterDirectedTo,
                      projectName: filterProjectName,
                      paymentMethod: filterPaymentMethod,
                      interest: filterInterest,
                      /* GOTEO-OC-DONATION-CERTIFICATE: certificate field, hidden in open-core. Re-enable with feature toggle.
                       * certificate: filterCertificate, */
                      preferredLanguage: filterPreferredLanguage,
                      newsletterLanguage: filterNewsletterLanguage,
                      status: filterStatus,
                      dates: filterDates,
                      nameEmail: filterNameEmail,
                      location: filterLocation,
                      profile: filterProfile,
                  };

        isSubmitting = true;
        onSearchCommunications?.(payload);
        isSubmitting = false;
    }
</script>

<div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
        <h1 class="text-3xl font-bold text-black">{$t("pages.admin.newsletter.title")}</h1>
        <p class="text-content max-w-2xl">{$t("pages.admin.newsletter.description")}</p>
    </header>

    <TabNavigation
        tabs={navTabs}
        currentTab={activeTab}
        onTabClick={(id: string | number) => {
            activeTab = String(id);
        }}
    />

    {#if activeTab === "send"}
        <form onsubmit={handleSendSubmit} class="flex flex-col gap-10">
            <section class="flex flex-col gap-4">
                <h2 class="text-xl font-bold text-black">
                    {$t("pages.admin.newsletter.send.templateSection")}
                </h2>
                <div class="max-w-md">
                    <Select id="template-select" labelText="" bind:value={selectedTemplate}>
                        <option value="" disabled selected
                            >{$t("pages.admin.newsletter.send.placeholders.selectTemplate")}</option
                        >
                        {#each templates as item (item.id)}
                            <option value={item.id}>{item.name}</option>
                        {/each}
                    </Select>
                </div>
            </section>

            <section class="flex flex-col gap-4">
                <h2 class="text-xl font-bold text-black">
                    {$t("pages.admin.newsletter.send.recipientsSection")}
                </h2>
                <div class="flex flex-col gap-4">
                    <div class="flex flex-wrap items-center gap-4">
                        {#each recipientBlocks as blockId (blockId)}
                            <div class="w-72">
                                <Select
                                    id={`recipients-filter-${blockId}`}
                                    labelText=""
                                    bind:value={selectedRecipients[blockId]}
                                >
                                    <option value="" disabled selected
                                        >{$t(
                                            "pages.admin.newsletter.send.placeholders.selectRecipient",
                                        )}</option
                                    >
                                    {#each recipientOptions as opt}
                                        <option value={opt.value}>{opt.label}</option>
                                    {/each}
                                </Select>
                            </div>
                        {/each}
                    </div>
                    <div>
                        <button
                            type="button"
                            onclick={addRecipientBlock}
                            class="text-secondary flex cursor-pointer items-center gap-2 font-bold transition-opacity hover:opacity-80"
                        >
                            <PlusIcon />
                            <span>{$t("pages.admin.newsletter.send.addMore")}</span>
                        </button>
                    </div>
                </div>
            </section>

            <section class="flex flex-col gap-4 border-t border-gray-200 pt-8">
                <h2 class="text-xl font-bold text-black">
                    {$t("pages.admin.newsletter.send.optionsSection")}
                </h2>
                <div class="flex flex-col gap-3">
                    <Checkbox
                        id="is-test"
                        bind:checked={isTest}
                        label={$t("pages.admin.newsletter.send.options.isTest")}
                    />
                    <Checkbox
                        id="only-spanish"
                        bind:checked={onlySpanish}
                        label={$t("pages.admin.newsletter.send.options.onlySpanish")}
                    />
                </div>
            </section>

            <div class="flex justify-start">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    kind="primary"
                    class="bg-primary hover:bg-primary-dark rounded-full px-10 py-4 text-lg font-bold"
                >
                    {isSubmitting
                        ? $t("system.loading")
                        : $t("pages.admin.newsletter.send.startAction")}
                </Button>
            </div>
        </form>
    {:else if activeTab === "templates"}
        <div class="flex flex-col gap-6">
            <form
                onsubmit={(e) => e.preventDefault()}
                class="border-grey flex w-full flex-col items-start gap-6 self-stretch rounded-4xl border bg-white px-8 py-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.10)]"
            >
                <div class="flex w-full flex-col items-center gap-4 md:flex-row">
                    <div class="flex w-full flex-1">
                        <Search
                            id="search-templates"
                            bind:value={searchQuery}
                            placeholder={$t("pages.admin.newsletter.filters.search")}
                            class="w-full"
                        />
                    </div>

                    <div class="flex shrink-0 items-center gap-4">
                        <Button
                            type="submit"
                            kind="ghost"
                            class="bg-variant1 text-secondary hover:bg-variant1/80 flex items-center justify-center gap-2 rounded-3xl border-0 px-6 py-4 font-bold text-nowrap shadow-none transition-colors"
                        >
                            {$t("common.search")}
                        </Button>

                        <Button
                            type="button"
                            kind="ghost"
                            class="border-variant1 text-secondary flex items-center justify-center gap-2 rounded-3xl border bg-white px-6 py-4 font-bold text-nowrap"
                        >
                            <FiltersIcon />
                            {$t("pages.admin.filter.btns.openFilters")}
                        </Button>
                    </div>
                </div>
            </form>

            <Table class="w-full border-separate border-spacing-y-2">
                <TableHead>
                    <TableHeadCell class="bg-black p-4 text-base text-white first:rounded-l-lg">
                        <span class="normal-case"
                            >{$t("pages.admin.newsletter.table.headers.template")}</span
                        >
                    </TableHeadCell>
                    <TableHeadCell class="bg-black p-4 text-base text-white last:rounded-r-lg">
                        <span class="normal-case"
                            >{$t("pages.admin.newsletter.table.headers.description")}</span
                        >
                    </TableHeadCell>
                </TableHead>
                <TableBody class="text-base">
                    {#each filteredTemplates as item (item.id)}
                        <TableBodyRow class="bg-white">
                            <TableBodyCell
                                class="border-variant1 rounded-l-md border-t border-b border-l p-4 font-semibold text-black"
                            >
                                {item.name}
                            </TableBodyCell>
                            <TableBodyCell
                                class="border-variant1 flex items-center justify-between rounded-r-md border-t border-r border-b p-4 text-gray-500"
                            >
                                <span>{item.description}</span>
                                <Button
                                    type="button"
                                    kind="ghost"
                                    class="text-secondary p-0 font-bold underline"
                                    onclick={() => onEditTemplate?.(item.id)}
                                >
                                    {$t("common.edit")}
                                </Button>
                            </TableBodyCell>
                        </TableBodyRow>
                    {:else}
                        <TableBodyRow class="bg-white">
                            <TableBodyCell colspan={2} class="p-8 text-center text-gray-500">
                                {$t("common.noData")}
                            </TableBodyCell>
                        </TableBodyRow>
                    {/each}
                </TableBody>
            </Table>

            <Pagination {currentPage} totalItems={filteredTemplates.length} {itemsPerPage} />
        </div>
    {:else if activeTab === "communications"}
        <div class="flex flex-col gap-8">
            <h2 class="text-2xl font-bold text-black">
                {$t("pages.admin.newsletter.communications.searchTitle")}
            </h2>

            <!-- Integración del compositor de filtros -->
            <FilterComposer
                resource="users"
                onParamsChange={(params) => {
                    handleSearchSubmit(params);
                }}
            />
        </div>
    {/if}
</div>
