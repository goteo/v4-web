<script lang="ts">
    import { t, locale } from "../../../i18n/store";
    import { formatDate } from "../../../utils/dates";
    import Comments from "../../../components/icons/Comments.svelte";
    import DetailsRow, { type DetailsField } from "../DetailsRow.svelte";

    import type { ProjectRow } from "./ProjectsTable.svelte";

    interface Props {
        project: ProjectRow;
        onOpenAnnotationsModal: () => void;
        onChangeStatus?: (projectId: number) => void;
        userEmail?: string;
    }

    let { project, onOpenAnnotationsModal, onChangeStatus, userEmail }: Props = $props();

    const fields: DetailsField[] = $derived([
        {
            label: $t("pages.admin.projects.table.rows.details.datePublished"),
            value:
                project.datePublished !== "—"
                    ? formatDate(new Date(project.datePublished), $locale)
                    : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.dateEnd1"),
            value: project.dateEnd1 !== "—" ? formatDate(new Date(project.dateEnd1), $locale) : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.dateEnd2"),
            value: project.dateEnd2 !== "—" ? formatDate(new Date(project.dateEnd2), $locale) : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.minOptim"),
            value: project.minOptim,
        },
        {
            label: $t("pages.admin.projects.table.rows.details.email"),
            value: userEmail ?? "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.phone"),
            value: "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.remaining"),
            value: project.remaining,
        },
    ]);

    function navigateToCharges() {
        if (!project.accounting) return;
        window.location.href = `/${$locale}/admin/charges?target=${encodeURIComponent(project.accounting)}`;
    }

    const actionKeys = [
        "changeStatus",
        "promoter",
        "contributions",
        "donors",
        "financialReport",
    ] as const;

    function handleActionClick(key: (typeof actionKeys)[number]) {
        if (key === "changeStatus") onChangeStatus?.(project.id);
        if (key === "contributions") navigateToCharges();
    }
</script>

<DetailsRow {fields} columns={4}>
    {#snippet actions()}
        <div class="flex flex-row flex-wrap gap-3">
            {#each actionKeys as key (key)}
                <button
                    type="button"
                    class="border-secondary text-secondary cursor-pointer rounded-full border bg-white px-5 py-2 text-sm"
                    onclick={() => handleActionClick(key)}
                >
                    {$t(`pages.admin.projects.table.rows.details.btns.${key}`)}
                </button>
            {/each}
        </div>
    {/snippet}
    {#snippet footer()}
        <div
            class="flex flex-col gap-6 text-base leading-5 md:flex-row md:items-center md:justify-between"
        >
            <div class="text-content min-h-5 text-sm"></div>
            <div class="flex flex-row flex-wrap items-center justify-start gap-8 md:justify-end">
                <!-- GOTEO-OC-DONATION-CERTIFICATE: "Certificados" button is exclusive to the
                     donation-certificate feature of Goteo under Fundación Platoniq, hidden in
                     the open-core. Re-enable when a feature toggle exists. Do not delete.
                <button
                    class="text-secondary cursor-pointer border-0 bg-transparent font-bold outline-none"
                >
                    {$t("pages.admin.projects.table.rows.details.btns.certificates")}
                </button>
                -->
                <button
                    onclick={onOpenAnnotationsModal}
                    class="text-secondary bg-variant1 flex min-h-10 cursor-pointer flex-row items-center gap-2 rounded-2xl px-4 py-2 font-bold"
                >
                    <Comments size={20} class="shrink-0" />
                    {$t("pages.admin.projects.table.rows.details.btns.annotations")}
                    {#if project.annotationsCount > 0}
                        ({project.annotationsCount})
                    {/if}
                </button>
            </div>
        </div>
    {/snippet}
</DetailsRow>
