<script lang="ts">
    import { t } from "../../../../i18n/store";
    import {
        apiGatewaysGetCollection,
        apiProjectsGetCollection,
        apiTipjarsGetCollection,
        type Gateway,
    } from "../../../../openapi/client";
    import { client } from "../../../../openapi/client/client.gen";
    import { apiGatewaysIdGetUrl } from "../../../../openapi/client/operation-paths.gen";
    import { DEFAULT_CURRENCY } from "../../../../utils/currencies";
    import { highlightMatch } from "../../../../utils/highlights";
    import { toCollectionItems } from "../../../../utils/hydra";
    import SearchIcon from "../../../icons/actions/Search.svelte";
    import CloseIcon from "../../../icons/navigation/Close.svelte";
    import Spinner from "../../../icons/status/Spinner.svelte";
    import CurrencyInput from "../../../library/inputs/CurrencyInput.svelte";
    import Select from "../../../library/inputs/Select.svelte";
    import TextArea from "../../../library/inputs/TextArea.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import SearchCategoryLabel from "../../SearchCategoryLabel.svelte";

    import type { CreateChargeForm } from "../../../../types/admin-charge";

    let { form = $bindable() }: { form: CreateChargeForm } = $props();

    type Target =
        | { type: "project"; id: string; label: string; accounting: string }
        | { type: "tipjar"; id: string; label: string; accounting: string };

    let gateways = $state<Gateway[]>([]);
    let gatewaysLoading = $state(true);

    let targetQuery = $state(form.charge.targetLabel ?? "");
    let targetResults = $state<Target[]>([]);
    let targetIsLoading = $state(false);
    let targetSearched = $state(false);
    let targetDropdownOpen = $state(false);

    const CURRENCIES = [DEFAULT_CURRENCY];

    async function loadGateways() {
        gatewaysLoading = true;
        try {
            const { data, error } = await apiGatewaysGetCollection({
                baseUrl: "/api/relay",
            });
            if (error) {
                console.error("Failed to load gateways:", error);
            }
            gateways = toCollectionItems<Gateway>(data);
        } finally {
            gatewaysLoading = false;
        }
    }

    let targetDebounce: ReturnType<typeof setTimeout> | undefined;

    async function searchTargets(text: string) {
        const trimmed = text.trim();
        if (trimmed.length < 3) {
            targetResults = [];
            targetSearched = false;
            return;
        }
        targetIsLoading = true;
        targetSearched = true;

        try {
            const [projectsRes, tipjarsRes] = await Promise.all([
                apiProjectsGetCollection({
                    baseUrl: "/api/relay",
                    query: { title: trimmed },
                }),
                apiTipjarsGetCollection({
                    baseUrl: "/api/relay",
                    query: { name: trimmed },
                }),
            ]);

            const projects = toCollectionItems<any>(projectsRes.data);
            const tipjars = toCollectionItems<any>(tipjarsRes.data);

            targetResults = [
                ...projects.map((p: any): Target => ({
                    type: "project",
                    id: String(p.id ?? ""),
                    label: p.title ?? `Proyecto #${p.id}`,
                    accounting: p.accounting ?? "",
                })),
                ...tipjars.map((tj: any): Target => ({
                    type: "tipjar",
                    id: String(tj.id ?? ""),
                    label: tj.name ?? `Tipjar #${tj.id}`,
                    accounting: tj.accounting ?? "",
                })),
            ].filter((t) => t.accounting);
        } finally {
            targetIsLoading = false;
        }
    }

    function onTargetInput(text: string) {
        clearTimeout(targetDebounce);
        if (!text.trim()) {
            targetResults = [];
            targetSearched = false;
            targetDropdownOpen = false;
            return;
        }
        targetDropdownOpen = true;
        targetDebounce = setTimeout(() => searchTargets(text), 300);
    }

    function selectTarget(t: Target) {
        form.charge.targetType = t.type;
        form.charge.targetLabel = t.label;
        form.charge.targetIri = t.accounting;
        targetQuery = t.label;
        targetResults = [];
        targetSearched = false;
        targetDropdownOpen = false;
    }

    function clearTarget() {
        form.charge.targetIri = "";
        form.charge.targetLabel = "";
        targetQuery = "";
        targetResults = [];
        targetSearched = false;
    }

    function onGatewayChange(value: string) {
        form.charge.gatewayIri = client.buildUrl({
            url: apiGatewaysIdGetUrl,
            path: { id: value },
        });
        const gw = gateways.find((g) => g.id === value);
        form.charge.gatewayName = gw?.name ?? value;
    }

    export function validate(): boolean {
        return Boolean(
            form.charge.targetIri &&
            form.charge.gatewayIri &&
            form.charge.title.trim() &&
            form.charge.money.amount > 0 &&
            form.charge.money.currency,
        );
    }

    $effect(() => {
        loadGateways();
    });
</script>

<div class="flex flex-col gap-6">
    <div class="relative">
        <label
            for="create-charge-target"
            class="text-secondary absolute -top-2 left-3 z-10 bg-white px-1 text-xs leading-4 font-medium"
        >
            {$t("pages.admin.charges.create.fields.target")}
        </label>
        <div class="relative w-full">
            <input
                id="create-charge-target"
                type="text"
                value={targetQuery}
                placeholder={$t("pages.admin.charges.create.fields.targetSearchPlaceholder")}
                oninput={(e) =>
                    onTargetInput(e.target instanceof HTMLInputElement ? e.target.value : "")}
                onfocus={() => targetDropdownOpen && (targetDropdownOpen = true)}
                class="border-secondary text-content w-full rounded-lg border bg-white p-4 pr-10 text-base outline-none placeholder:text-gray-400 focus:ring-0"
            />
            {#if targetQuery}
                <button
                    type="button"
                    class="absolute top-1/2 right-3 h-6 w-6 -translate-y-1/2 rounded-full hover:bg-gray-300"
                    onclick={clearTarget}
                >
                    <CloseIcon />
                </button>
            {:else}
                <div class="absolute top-1/2 right-3 h-8 w-8 -translate-y-1/2">
                    <SearchIcon width="32" height="32" />
                </div>
            {/if}
        </div>

        {#if targetDropdownOpen && targetSearched}
            <div
                class="border-secondary absolute top-full z-20 mt-2 max-h-72 w-full space-y-3 overflow-y-auto rounded-lg border bg-gray-200 p-3 shadow-lg"
            >
                {#if targetIsLoading}
                    <div class="flex justify-center py-4">
                        <Spinner />
                    </div>
                {:else if targetResults.length > 0}
                    {#if targetResults.some((r) => r.type === "project")}
                        <div>
                            <SearchCategoryLabel class="mb-2">
                                {$t("domain.charges.entityLabels.projects")}
                            </SearchCategoryLabel>
                            <div class="flex flex-col gap-2">
                                {#each targetResults.filter((r) => r.type === "project") as item}
                                    <button
                                        type="button"
                                        class="w-full cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition hover:shadow-md"
                                        onclick={() => selectTarget(item)}
                                    >
                                        <div class="text-base font-semibold text-gray-800">
                                            {@html highlightMatch(item.label, targetQuery)}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                    {#if targetResults.some((r) => r.type === "tipjar")}
                        <div>
                            <SearchCategoryLabel class="mt-3 mb-2">
                                {$t("domain.charges.entityLabels.tipjars")}
                            </SearchCategoryLabel>
                            <div class="flex flex-col gap-2">
                                {#each targetResults.filter((r) => r.type === "tipjar") as item}
                                    <button
                                        type="button"
                                        class="w-full cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition hover:shadow-md"
                                        onclick={() => selectTarget(item)}
                                    >
                                        <div class="text-base font-semibold text-gray-800">
                                            {@html highlightMatch(item.label, targetQuery)}
                                        </div>
                                        <div class="mt-1 text-xs text-gray-500 italic">
                                            {$t("domain.charges.entityLabels.tipjarId")}: {item.id}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {:else}
                    <p class="text-sm text-gray-400">
                        {$t("pages.admin.charges.filters.search.noResults")}
                    </p>
                {/if}
            </div>
        {/if}
    </div>

    <Select
        labelText={$t("pages.admin.charges.headers.paymentGateway")}
        required={true}
        disabled={gatewaysLoading}
        value=""
        onChange={onGatewayChange}
    >
        <option value="" disabled selected={!form.charge.gatewayIri}>
            {gatewaysLoading ? "..." : $t("pages.admin.charges.create.fields.gatewayPlaceholder")}
        </option>
        {#each gateways as gw (gw.id)}
            <option value={gw.id} selected={form.charge.gatewayIri.endsWith(`/${gw.id}`)}>
                {gw.name ?? gw.id}
            </option>
        {/each}
    </Select>

    <div class="grid grid-cols-2 gap-4">
        <CurrencyInput
            amount={form.charge.money.amount}
            currency={form.charge.money.currency}
            labelText={$t("pages.admin.charges.headers.amount")}
            helperText={$t("pages.admin.charges.create.fields.amountHelper")}
            required={true}
            onInput={(money) => (form.charge.money = money)}
        />
        <Select
            labelText={$t("pages.admin.charges.create.fields.currency")}
            required={true}
            value={form.charge.money.currency}
            onChange={(value) => (form.charge.money.currency = value)}
        >
            {#each CURRENCIES as c}
                <option value={c} selected={form.charge.money.currency === c}>{c}</option>
            {/each}
        </Select>
    </div>

    <TextInput
        bind:value={form.charge.title}
        labelText={$t("pages.admin.charges.create.fields.chargeTitle")}
        required={true}
    />

    <TextArea
        bind:value={form.charge.description}
        labelText={$t("pages.admin.charges.create.fields.chargeDescription")}
    />
</div>
