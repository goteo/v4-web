<script lang="ts">
    import { onMount } from "svelte";

    import ChargesTable, { type ChargeSortKey, type ExtendedCharge } from "./ChargesTable.svelte";
    import CreateChargeModal from "./CreateChargeModal.svelte";
    import { session } from "../../../auth/store";
    import { t } from "../../../i18n/store";
    import {
        apiAccountingsIdGet,
        apiGatewayChargesGetCollection,
        apiGatewayChargestotalsGetCollection,
        apiGatewayCheckoutsIdGet,
        apiGatewaysGetCollection,
        apiTipjarsIdGet,
        type ApiGatewayChargesGetCollectionData,
        type ApiGatewayChargestotalsGetCollectionData,
        type GatewayCharge,
        type GatewayCheckout,
    } from "../../../openapi/client/index.ts";
    import { apiGatewayChargesGetCollectionUrl } from "../../../openapi/client/operation-paths.gen";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { extractId } from "../../../utils/extractId";
    import { toCollectionItems } from "../../../utils/hydra";
    import {
        parseQueryFilters,
        splitOrderParams,
        syncQueryFiltersToUrl,
    } from "../../../utils/queryParams";
    import { isEnabled, tipjarId } from "../../../utils/tipping";
    import Button from "../../library/buttons/Button.svelte";
    import Dashboard from "../AdminDashboard.svelte";

    const initialParams =
        typeof window !== "undefined"
            ? splitOrderParams(
                  parseQueryFilters(window.location.search, {
                      exclude: ["page", "itemsPerPage"],
                  }),
              )
            : { filters: {}, order: {} };

    const sortFieldMap: Record<ChargeSortKey, string> = {
        "date-asc": "dateCreated",
        "date-desc": "dateCreated",
        "amount-asc": "money.amount",
        "amount-desc": "money.amount",
        "status-asc": "status",
        "status-desc": "status",
    };

    const initialSort = ((Object.keys(sortFieldMap) as ChargeSortKey[]).find(
        (key) =>
            initialParams.order[sortFieldMap[key]] === "asc" ||
            initialParams.order[sortFieldMap[key]] === "desc",
    ) ?? "date-desc") as ChargeSortKey;

    const table = useAdminTableState<ChargeSortKey>(initialSort);

    let filters: ApiGatewayChargesGetCollectionData["query"] = $state(initialParams.filters);

    let paymentGatewayById = $state<Map<string, string>>(new Map());

    let createOpen = $state(false);
    let createSubmitting = $state(false);

    let charges = $state<ExtendedCharge[]>([]);
    let totalTips = $state<string>("—");
    let selectedProjectsCount = $state<number | string>("—");

    async function loadTotalTips() {
        if (!isEnabled || !$session) return;

        const { data: tipjar } = await apiTipjarsIdGet({
            baseUrl: "/api/relay",
            path: { id: tipjarId },
        });
        const accountingId = tipjar?.accounting ? extractId(tipjar.accounting) : null;
        if (!accountingId) return;

        const { data: accounting } = await apiAccountingsIdGet({
            baseUrl: "/api/relay",
            path: { id: accountingId },
        });
        if (accounting?.balance) {
            totalTips = formatCurrency(accounting.balance.amount, accounting.balance.currency);
        }
    }

    let projectsCountRequestId = 0;

    async function loadSelectedProjectsCount(
        chargeFilters: ApiGatewayChargesGetCollectionData["query"],
    ) {
        const requestId = ++projectsCountRequestId;
        selectedProjectsCount = "—";

        const headers: Record<string, string> = Object.assign(
            { Accept: "application/ld+json" },
            ($session?.token.asHttpHeaders as Record<string, string>) ?? {},
        );

        const { data, error } = await apiGatewayChargestotalsGetCollection({
            baseUrl: "/api/relay",
            query: chargeFilters as ApiGatewayChargestotalsGetCollectionData["query"],
            headers,
        });

        if (requestId !== projectsCountRequestId) return;

        if (error || data?.projects === undefined) {
            console.error("Failed to load selected projects count:", error);
            return;
        }

        selectedProjectsCount = data.projects;
    }

    function buildChargesQuery(
        filters: ApiGatewayChargesGetCollectionData["query"],
        page: number,
        itemsPerPage: number,
    ): ApiGatewayChargesGetCollectionData["query"] {
        const query: ApiGatewayChargesGetCollectionData["query"] = {
            page,
            itemsPerPage,
            ...filters,
        };

        const sortField = sortFieldMap[table.selectedSort];
        if (sortField) {
            const direction = table.selectedSort.endsWith("-asc") ? "asc" : "desc";
            (query as any)[`order[${sortField}]`] = direction;
        }

        return query;
    }

    function getCollectionTotalItems(collection: unknown): number {
        if (Array.isArray(collection)) {
            return collection.length;
        }
        if (!collection || typeof collection !== "object") return 0;

        const record = collection as Record<string, unknown>;
        const totalItems = record.totalItems ?? record["hydra:totalItems"];

        return typeof totalItems === "number"
            ? totalItems
            : toCollectionItems<GatewayCharge>(collection).length;
    }

    async function fetchCheckout(iri: string | undefined, headers?: Record<string, string>) {
        const id = extractId(iri);
        if (!id) return;

        const { data, error } = await apiGatewayCheckoutsIdGet({
            baseUrl: "/api/relay",
            path: { id },
            headers,
        });

        if (error) {
            console.error(`Failed to fetch checkout ${iri}:`, error);
            return;
        }

        return data;
    }

    async function loadCharges(
        filters: ApiGatewayChargesGetCollectionData["query"],
    ): Promise<ExtendedCharge[] | undefined> {
        table.isLoading = true;
        let chargesArr: ExtendedCharge[] = [];

        const checkouts: Map<string, GatewayCheckout | undefined> = new Map();

        try {
            const query = buildChargesQuery(filters, table.currentPage, table.itemsPerPage);

            const headers: Record<string, string> = Object.assign(
                { Accept: "application/ld+json" },
                ($session?.token.asHttpHeaders as Record<string, string>) ?? {},
            );

            const { data: collection, error } = await apiGatewayChargesGetCollection({
                baseUrl: "/api/relay",
                query: query as any,
                headers,
            });

            if (error) {
                console.error("Failed to fetch gateway charges:", error);
                return;
            }

            const loadedCharges = toCollectionItems<GatewayCharge>(collection);
            table.totalItems = getCollectionTotalItems(collection);

            const uniqueCheckoutIris = [
                ...new Set(loadedCharges.map((c) => c.checkout).filter(Boolean)),
            ];

            const checkoutResults = await Promise.all(
                uniqueCheckoutIris.map((iri) => fetchCheckout(iri, headers)),
            );

            for (let i = 0; i < uniqueCheckoutIris.length; i++) {
                checkouts.set(uniqueCheckoutIris[i]!, checkoutResults[i]);
            }

            chargesArr = loadedCharges.map((charge): ExtendedCharge => {
                const checkout = checkouts.get(charge.checkout ?? "");

                return {
                    ...charge,
                    checkoutOrigin: checkout?.origin ?? "—",
                    paymentGateway: checkout?.gateway,
                    platformLinks: checkout?.links ?? [],
                    trackingCodes: checkout?.trackings ?? [],
                };
            });
        } finally {
            table.isLoading = false;
            table.isFirstLoad = false;
            return chargesArr;
        }
    }

    async function handleApplyFilters(newFilters: ApiGatewayChargesGetCollectionData["query"]) {
        filters = { ...newFilters };
        table.currentPage = 1;
    }

    const reloadCharges = async () => {
        charges = [];
        const loaded = await loadCharges(filters);
        if (loaded === undefined) return;
        charges = loaded;
    };

    $effect(() => {
        reloadCharges();
    });

    let prevProjectsCountKey: string | undefined;

    $effect(() => {
        const currentFilters = Object.fromEntries(
            Object.entries(filters ?? {}).filter(
                ([, value]) => value !== undefined && value !== "",
            ),
        ) as ApiGatewayChargesGetCollectionData["query"];
        const key = JSON.stringify(currentFilters);

        if (key === prevProjectsCountKey) return;

        prevProjectsCountKey = key;
        loadSelectedProjectsCount(currentFilters);
    });

    $effect(() => {
        const sortField = sortFieldMap[table.selectedSort];
        const direction = table.selectedSort.endsWith("-asc") ? "asc" : "desc";

        syncQueryFiltersToUrl(
            filters ?? ({} as Record<string, unknown>),
            sortField ? { [sortField]: direction } : undefined,
        );
    });

    let chargeSlides = $derived([
        { title: $t("domain.charges.totalizers.selected"), amount: selectedProjectsCount },
        { title: $t("domain.charges.totalizers.totalTips"), amount: totalTips },
    ]);

    function handleSelectTarget(accounting: string): void {
        handleApplyFilters({ target: accounting });
    }

    onMount(async () => {
        const { data: paymentGateways } = await apiGatewaysGetCollection();

        const map = new Map<string, string>();
        for (const g of paymentGateways ?? []) {
            if (g.id) map.set(String(g.id), g.name ?? "");
        }
        paymentGatewayById = map;

        loadTotalTips();
    });
</script>

<Dashboard
    title={$t("pages.admin.charges.title")}
    description={$t("pages.admin.charges.description")}
    filters={{
        resource: "gateway_charges",
        filters: filters,
        onApplyFilters: handleApplyFilters,
        onSelectTarget: handleSelectTarget,
    }}
    filterTags={{
        title: $t("pages.admin.charges.lastContributions"),
        filters: filters,
        onCloseFilter: handleApplyFilters,
        resource: "gateway_charges",
    }}
    csv={{
        endpoint: apiGatewayChargesGetCollectionUrl,
        filenamePrefix: "gateway-charges",
        queryParams: filters,
        totalItems: table.totalItems,
    }}
    slider={{
        slides: chargeSlides,
        isLoading: table.isLoading,
    }}
>
    {#snippet actions()}
        <Button
            kind="primary"
            size="md"
            onclick={() => (createOpen = true)}
            disabled={createSubmitting}
        >
            {$t("pages.admin.charges.create.trigger")}
        </Button>
    {/snippet}
    <ChargesTable
        {charges}
        currentPage={table.currentPage}
        itemsPerPage={table.itemsPerPage}
        selectedSort={table.selectedSort}
        totalItems={table.totalItems}
        isLoading={table.isLoading}
        {paymentGatewayById}
        onPageChange={table.handlePageChange}
        onItemsPerPageChange={table.handleItemsPerPageChange}
        onSortChange={table.handleSortChange}
    />
</Dashboard>

<CreateChargeModal
    bind:open={createOpen}
    bind:submitting={createSubmitting}
    onCreated={reloadCharges}
/>
