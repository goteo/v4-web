<script lang="ts">
    import { session } from "../../auth/store";
    import { t } from "../../i18n/store";
    import { exportCollectionAsCSV } from "../../utils/csvExporter";
    import { toCollectionItems } from "../../utils/hydra";
    import Download from "../icons/actions/Download.svelte";
    import Close from "../icons/navigation/Close.svelte";
    import Spinner from "../icons/status/Spinner.svelte";
    import Button from "../library/buttons/Button.svelte";

    let {
        endpoint = "/v4/gateway_charges",
        queryParams = {},
        filenamePrefix = "export",
        totalItems = undefined,
        size = "sm",
        disabled = false,
    } = $props<{
        endpoint?: string;
        queryParams?: Record<string, unknown>;
        filenamePrefix?: string;
        totalItems?: number;
        size?: "sm" | "md";
        disabled?: boolean;
    }>();

    const iconSize = $derived(size === "md" ? "24" : "16");

    let abortController = $state<AbortController | null>(null);
    let isExporting = $state(false);
    let exportProgress = $state(0);
    let rowsExported = $state(0);

    function handleCancelExport() {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }

        isExporting = false;
        exportProgress = 0;
        rowsExported = 0;
    }

    function buildFilename(): string {
        const timestamp = new Date().toISOString().split("T")[0];
        return `${filenamePrefix}_${timestamp}`;
    }

    function appendQueryParam(params: URLSearchParams, key: string, value: unknown) {
        if (value === undefined || value === null || value === "") return;

        if (Array.isArray(value)) {
            value.forEach((v) => appendQueryParam(params, key, v));
        } else if (typeof value === "object" && !(value instanceof Date)) {
            Object.entries(value as Record<string, unknown>).forEach(([subKey, subVal]) => {
                appendQueryParam(params, `${key}[${subKey}]`, subVal);
            });
        } else {
            params.append(key, String(value));
        }
    }

    async function handleExportCSV() {
        abortController = new AbortController();
        isExporting = true;
        exportProgress = 0;
        rowsExported = 0;

        try {
            const result = await exportCollectionAsCSV({
                filename: buildFilename(),
                abortSignal: abortController?.signal,
                fetcher: async (page: number, itemsPerPage: number) => {
                    if (abortController?.signal.aborted) throw new Error("cancelled");

                    const cleanPath = endpoint.replace(/^\/+/, "");
                    const fullPath = cleanPath.startsWith("api/relay")
                        ? `/${cleanPath}`
                        : `/api/relay/${cleanPath}`;

                    const url = new URL(fullPath, window.location.origin);

                    if (queryParams) {
                        Object.entries(queryParams).forEach(([key, value]) => {
                            appendQueryParam(url.searchParams, key, value);
                        });
                    }

                    url.searchParams.set("page", String(page));
                    url.searchParams.set("itemsPerPage", String(itemsPerPage));

                    const authHeaders = ($session?.token?.asHttpHeaders ?? {}) as Record<
                        string,
                        string
                    >;
                    const headers: Record<string, string> = {
                        Accept: "application/ld+json, application/json",
                        ...authHeaders,
                    };

                    const response = await fetch(url.toString(), {
                        headers,
                        signal: abortController?.signal,
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error ${response.status}`);
                    }

                    const data = await response.json();
                    return toCollectionItems(data);
                },
                pagination: {
                    itemsPerPage: 100,
                    maxTotalRows: totalItems || 10_000,
                },
                onProgress: (current: number, total: number) => {
                    rowsExported = current;
                    exportProgress = total > 0 ? Math.round((current / total) * 100) : 0;
                },
            });

            if (result.status === "partial") {
                alert(`${$t("domain.export.success") || "Export completed"}\n${result.message}`);
            }
        } catch (error) {
            const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

            if (
                message.includes("session") ||
                message.includes("401") ||
                message.includes("authentication")
            ) {
                alert($t("auth.sessionExpired") || "Session expired. Please log in again.");
            } else if (message.includes("no data")) {
                alert($t("domain.export.noData") || "No data found to export");
            } else if (
                message.includes("cancelled") ||
                message.includes("abort") ||
                message.includes("aborted")
            ) {
                console.log("Export cancelled by user");
            } else {
                console.error("Error exporting CSV:", error);
                alert($t("domain.export.error") || "Error exporting data");
            }
        } finally {
            abortController = null;
            isExporting = false;
            exportProgress = 0;
            rowsExported = 0;
        }
    }
</script>

<div class="flex items-center gap-2">
    <Button
        {size}
        kind="secondary"
        onclick={handleExportCSV}
        disabled={disabled || isExporting}
        class={disabled ? "cursor-not-allowed opacity-50 hover:cursor-not-allowed" : ""}
        aria-label={$t("domain.export.csv")}
    >
        {#if isExporting}
            <Spinner width="{iconSize}px" height="{iconSize}px" class="text-secondary" />
            <span class="text-secondary font-bold">
                {exportProgress > 0
                    ? `${rowsExported} / ${totalItems} (${exportProgress}%)`
                    : $t("domain.export.exporting")}
            </span>
        {:else}
            <Download width={iconSize} height={iconSize} class="text-secondary" />
            <span class="text-secondary font-bold">
                {$t("domain.export.csv")}
            </span>
        {/if}
    </Button>

    {#if isExporting}
        <Button
            size="sm"
            kind="ghost"
            onclick={handleCancelExport}
            aria-label={$t("actions.cancel") || "Cancel"}
            title={$t("actions.cancel") || "Cancel"}
        >
            <Close width="16" height="16" class="text-secondary" />
        </Button>
    {/if}
</div>
