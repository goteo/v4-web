<script lang="ts">
    import { t } from "../../../../i18n/store";
    import { apiGatewaysGetCollection, type Gateway } from "../../../../openapi/client";
    import { client } from "../../../../openapi/client/client.gen";
    import { apiGatewaysIdGetUrl } from "../../../../openapi/client/operation-paths.gen";
    import { DEFAULT_CURRENCY, formatCurrency, parseCurrency } from "../../../../utils/currencies";
    import { toCollectionItems } from "../../../../utils/hydra";
    import { createAccountingSearcher } from "../../../../utils/searchers";
    import ResourceSearch from "../../../library/inputs/ResourceSearch.svelte";
    import Select from "../../../library/inputs/Select.svelte";
    import TextArea from "../../../library/inputs/TextArea.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";

    import type { CreateChargeForm } from "../../../../types/admin-charge";
    import type { SearchResultItem } from "../../../../utils/resourceSearch";

    let { form = $bindable() }: { form: CreateChargeForm } = $props();

    let gateways = $state<Gateway[]>([]);
    let gatewaysLoading = $state(true);

    let targetQuery = $state(form.charge.targetLabel ?? "");

    const searchTargets = createAccountingSearcher({
        baseUrl: "/api/relay",
        resources: ["projects", "tipjars"],
    });

    let amountInput = $state(
        form.charge.money.amount
            ? formatCurrency(form.charge.money.amount, form.charge.money.currency)
            : "",
    );

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

    function selectTarget(item: SearchResultItem) {
        form.charge.targetType = item.id.startsWith("tipjar-") ? "tipjar" : "project";
        form.charge.targetLabel = item.label;
        form.charge.targetIri = item.value;
    }

    function clearTarget() {
        form.charge.targetIri = "";
        form.charge.targetLabel = "";
    }

    function onGatewayChange(value: string) {
        form.charge.gatewayIri = client.buildUrl({
            url: apiGatewaysIdGetUrl,
            path: { id: value },
        });
        const gw = gateways.find((g) => g.id === value);
        form.charge.gatewayName = gw?.name ?? value;
    }

    function onAmountInput(value: string) {
        amountInput = value;
    }

    function onAmountBlur() {
        if (!amountInput.trim()) {
            form.charge.money.amount = 0;
            return;
        }
        const parsed = parseCurrency(amountInput, form.charge.money.currency);
        form.charge.money.amount = parsed;
        amountInput = formatCurrency(parsed, form.charge.money.currency);
    }

    function onCurrencyChange(value: string) {
        form.charge.money.currency = value;
        if (form.charge.money.amount > 0) {
            amountInput = formatCurrency(form.charge.money.amount, value);
        }
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
    <ResourceSearch
        id="create-charge-target"
        search={searchTargets}
        bind:value={targetQuery}
        label={$t("pages.admin.charges.create.fields.target")}
        placeholder={$t("pages.admin.charges.create.fields.targetSearchPlaceholder")}
        onSelect={selectTarget}
        onClear={clearTarget}
    />

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
        <TextInput
            type="text"
            value={amountInput}
            labelText={$t("pages.admin.charges.headers.amount")}
            helperText={$t("pages.admin.charges.create.fields.amountHelper")}
            required={true}
            onInput={(value) => onAmountInput(value.toString())}
            onBlur={onAmountBlur}
        />
        <Select
            labelText={$t("pages.admin.charges.create.fields.currency")}
            required={true}
            value={form.charge.money.currency}
            onChange={onCurrencyChange}
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
