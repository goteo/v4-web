<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t, locale } from "../../../i18n/store";
    import { createAuthError, getErrorTranslationKey } from "../../../openapi/api";
    import {
        apiGatewayChargestotalsGetCollection,
        apiGatewayChargesGetCollection,
        apiUsersIdPatch,
        type GatewayCharge,
    } from "../../../openapi/client/index.ts";
    import { formatCurrency } from "../../../utils/currencies";
    import { formatDate } from "../../../utils/dates";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import { chargeStatusStyles } from "../charges/ChargesTable.svelte";
    import DetailsRow, { type DetailsField } from "../DetailsRow.svelte";

    import type { UserRow } from "./UsersTable.svelte";
    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

    let {
        user,
        onRolesUpdated,
    }: {
        user: UserRow;
        onRolesUpdated?: (id: number, roles: string[]) => void;
    } = $props();

    let totalCollected = $state<string>("—");
    let recentCharges = $state<GatewayCharge[]>([]);

    let rolesModal = $state(false);
    let chargesModal = $state(false);
    let selectedRoles = $state<DropdownOption[]>([]);
    let roleSearch = $state("");
    let savingRoles = $state(false);
    let showError = $state(false);
    let errorMessage = $state("");

    $effect(() => {
        if (user.accounting) {
            loadUserFinancials(user.accounting);
        }
    });

    async function loadUserFinancials(accounting: string) {
        const { data: totalsData } = await apiGatewayChargestotalsGetCollection({
            baseUrl: "/api/relay",
            query: { "checkout.origin": accounting, status: "in_charge" },
        });
        totalCollected = totalsData?.money ? formatCurrency(totalsData.money) : "—";

        const { data: chargesData } = await apiGatewayChargesGetCollection({
            baseUrl: "/api/relay",
            query: { "checkout.origin": accounting, itemsPerPage: 6 },
        });
        recentCharges = chargesData ?? [];
    }

    function toRoleOption(role: string): DropdownOption {
        return { id: role, label: role, selected: false };
    }

    function openRolesModal() {
        selectedRoles = user.roles.map(toRoleOption);
        roleSearch = "";
        rolesModal = true;
    }

    /** Free text typed by the admin becomes a role id, e.g. "project reviewer" → ROLE_PROJECT_REVIEWER. */
    function toRoleId(text: string): string {
        const normalized = text
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        if (!normalized) return "";
        return normalized.startsWith("ROLE_") ? normalized : `ROLE_${normalized}`;
    }

    const roleOptions = $derived.by(() => {
        const search = roleSearch.trim().toLowerCase();
        const all = [...new Set([...user.roles, ...selectedRoles.map((o) => o.id)])].map(
            toRoleOption,
        );
        const matches = all.filter((o) => o.id.toLowerCase().includes(search));

        const custom = toRoleId(roleSearch);
        if (custom && !all.some((o) => o.id === custom)) {
            matches.push(toRoleOption(custom));
        }

        return matches;
    });

    async function saveRoles() {
        savingRoles = true;
        const roles = selectedRoles.map((o) => o.id);

        const { error, response } = await apiUsersIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(user.id) },
            body: { roles },
        });

        savingRoles = false;

        if (error) {
            errorMessage = $t(getErrorTranslationKey(createAuthError(response).type));
            showError = true;
            return;
        }

        rolesModal = false;
        onRolesUpdated?.(user.id, roles);
    }

    function chargeDateFilterUrl(charge: GatewayCharge): string | undefined {
        if (!user.accounting || !charge.dateCreated) return;

        const created = new Date(charge.dateCreated);
        if (isNaN(created.getTime())) return;

        // gateway_charges has no id filter; the creation second within the user's
        // charges isolates the one clicked.
        const params = new URLSearchParams({
            "checkout.origin": user.accounting,
            "dateCreated[after]": charge.dateCreated,
            "dateCreated[strictly_before]": new Date(created.getTime() + 1000).toISOString(),
        });

        return `/${$locale}/admin/charges?${params}`;
    }

    function formatOptionalDate(date?: string): string {
        return date ? formatDate(new Date(date), $locale) : "—";
    }

    const latestCharge = $derived(recentCharges[0]);

    const fields: DetailsField[] = $derived([
        {
            label: $t("pages.admin.users.table.rows.details.totalCollected"),
            value: totalCollected,
        },
        {
            label: $t("pages.admin.users.table.rows.details.id"),
            value: user.id,
        },
        {
            label: $t("pages.admin.users.table.rows.details.handle"),
            value: user.handle,
        },
        {
            label: $t("pages.admin.users.table.rows.details.email"),
            value: user.email,
        },
        {
            label: $t("pages.admin.users.table.rows.details.type"),
            value: $t(`pages.admin.users.table.rows.type.${user.type}`),
        },
        {
            label: $t("pages.admin.users.table.rows.details.territory"),
            value: user.territory,
        },
        {
            label: $t("pages.admin.users.table.rows.details.dateCreated"),
            value: formatOptionalDate(user.dateCreated),
            title: user.dateCreated,
        },
        {
            label: $t("pages.admin.users.table.rows.details.dateUpdated"),
            value: formatOptionalDate(user.dateUpdated),
            title: user.dateUpdated,
        },
        {
            label: $t("pages.admin.users.table.rows.details.recentCharges"),
            value: latestCharge
                ? `${formatCurrency(latestCharge.money)} · ${formatOptionalDate(latestCharge.dateCreated)} (${recentCharges.length})`
                : "—",
            onclick: latestCharge ? () => (chargesModal = true) : undefined,
        },
    ]);
</script>

<DetailsRow {fields} columns={4}>
    {#snippet actions()}
        <div class="flex flex-row flex-wrap gap-3">
            {#if user.accounting}
                <a
                    href={`/${$locale}/admin/charges?checkout.origin=${encodeURIComponent(user.accounting)}`}
                    class="border-secondary text-secondary rounded-full border bg-white px-5 py-2 text-sm"
                >
                    {$t("pages.admin.users.table.rows.details.btns.charges")}
                </a>
            {/if}
            <button
                type="button"
                class="border-secondary text-secondary cursor-pointer rounded-full border bg-white px-5 py-2 text-sm"
                onclick={openRolesModal}
            >
                {$t("pages.admin.users.table.rows.details.btns.roles")}
            </button>
        </div>
    {/snippet}
</DetailsRow>

<Modal
    bind:open={rolesModal}
    title={$t("pages.admin.users.table.rows.details.roles.title")}
    dismissable={false}
    class="relative max-w-lg overflow-visible"
    bodyClass="overflow-visible"
>
    <button
        type="button"
        class="text-secondary absolute inset-e-4 top-4 cursor-pointer bg-transparent p-1 shadow-none hover:opacity-80 focus:ring-0"
        onclick={() => (rolesModal = false)}
        aria-label={$t("common.close")}
    >
        <Close width="24" height="24" />
    </button>

    <div class="flex flex-col gap-6">
        <DropdownMenu
            variant="multiselect"
            chips
            hasSearch
            searchPlaceholder={$t("pages.admin.users.table.rows.details.roles.placeholder")}
            options={roleOptions}
            bind:selected={selectedRoles}
            bind:searchValue={roleSearch}
        />
        <div class="flex justify-end">
            <Button kind="primary" disabled={savingRoles} onclick={saveRoles}>
                {$t("pages.admin.users.table.rows.details.roles.save")}
            </Button>
        </div>
    </div>
</Modal>

<Modal
    bind:open={chargesModal}
    title={$t("pages.admin.users.table.rows.details.recentCharges")}
    dismissable={false}
    class="relative max-w-200"
>
    <button
        type="button"
        class="text-secondary absolute inset-e-4 top-4 cursor-pointer bg-transparent p-1 shadow-none hover:opacity-80 focus:ring-0"
        onclick={() => (chargesModal = false)}
        aria-label={$t("common.close")}
    >
        <Close width="24" height="24" />
    </button>

    <div class="text-content flex flex-col gap-2 text-base leading-5">
        {#each recentCharges as charge}
            {@const href = chargeDateFilterUrl(charge)}
            <a
                {href}
                class="border-variant1 hover:bg-variant1 flex flex-row items-center justify-between gap-4 rounded-md border bg-white p-3 text-sm"
            >
                <span class="min-w-0 flex-1 truncate" title={charge.title}>
                    {charge.title ?? "—"}
                </span>
                <span class="shrink-0" title={charge.dateCreated}>
                    {formatOptionalDate(charge.dateCreated)}
                </span>
                <span
                    class="shrink-0 rounded-full px-3 py-1 text-xs font-medium {chargeStatusStyles[
                        charge.status ?? ''
                    ] ?? chargeStatusStyles.default}"
                >
                    {$t(`domain.charges.status.${charge.status}`)}
                </span>
                <span class="shrink-0 font-semibold">{formatCurrency(charge.money)}</span>
            </a>
        {/each}
    </div>
</Modal>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
