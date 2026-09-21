<script lang="ts">
    import { locale } from "../../i18n/store";
    import { t } from "../../i18n/store";
    import { formatDate } from "../../utils/dates";
    import { getAllFilterSubjects } from "../../utils/filterComposer";
    import CloseIcon from "../icons/navigation/Close.svelte";
    import AccountingOwnerBadge from "../library/tags/AccountingOwnerBadge.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Locale } from "../../i18n/locales";
    import type { FilterResource, FilterSubject } from "../../utils/filterComposer";

    type FilterTag = { title: string; value?: string; values?: { from?: string; to?: string } };
    const dateRegex =
        /^(dateCreated|dateUpdated)\[(after|before|strictly_after|strictly_before)\]$/;

    let {
        title,
        filters,
        onCloseFilter,
        resource = undefined,
    } = $props<{
        title: string;
        filters?: Record<string, any>;
        onCloseFilter: (filters: Record<string, any>) => void;
        resource?: FilterResource;
    }>();

    let tags: FilterTag[] = $state([]);

    let subjects = $derived(getAllFilterSubjects(resource));
    let subjectByParam = $derived(new Map(subjects.map((s) => [s.param ?? s.key, s] as const)));

    function closeTag(tag: FilterTag) {
        const result = { ...filters };
        if (tag.values?.from && tag.values?.to) {
            const prefix = tag.title;
            result[`${prefix}[after]`] = undefined;
            result[`${prefix}[before]`] = undefined;
            result[`${prefix}[strictly_after]`] = undefined;
            result[`${prefix}[strictly_before]`] = undefined;
        } else if (tag.title === "territory") {
            result["territory.country[]"] = undefined;
            result["territory.subLvl1[]"] = undefined;
            result["territory.subLvl2[]"] = undefined;
        } else if (tag.title.startsWith("date")) {
            result[tag.title] = undefined;
        } else {
            result[tag.title] = undefined;
        }
        onCloseFilter(result);
    }

    function formatSubjectValue(subject: FilterSubject, value: string): string {
        if (subject.options) {
            const parts = value.split(",").map((v) => v.trim());
            const translated = parts
                .map((p) => {
                    const option = subject.options?.find((o) => o.value === p);
                    return option ? $t(option.label) : p;
                })
                .join(", ");
            if (translated !== value) return translated;
        }
        return value;
    }

    function formatTerritoryCodes(raw: string, loc: Locale): string {
        let names: Intl.DisplayNames | null = null;
        try {
            names = new Intl.DisplayNames([loc], { type: "region" });
        } catch {
            return raw;
        }
        return raw
            .split(",")
            .map((code) => {
                const trimmed = code.trim();
                if (!trimmed) return "";
                try {
                    const name = names!.of(trimmed);
                    return name ?? trimmed;
                } catch {
                    return trimmed;
                }
            })
            .filter(Boolean)
            .join(", ");
    }

    function formatTags(tags: FilterTag[], loc: Locale): FilterTag[] {
        return tags.map((tag) => {
            if (tag.values?.from && tag.values?.to) {
                tag.values.from = formatDate(new Date(tag.values.from), loc);
                tag.values.to = formatDate(new Date(tag.values.to), loc);
                if (tag.title.startsWith("date")) {
                    tag.values.from = `${$t(`domain.filterComposer.datePrefix.${tag.title}`)}: ${tag.values.from}`;
                }
            }

            if (tag.title === "status") {
                const chargeLabel = $t(`pages.admin.charges.filters.status.options.${tag.value}`);
                tag.value =
                    chargeLabel !== tag.value
                        ? chargeLabel
                        : $t(
                              `pages.admin.projects.table.rows.status.${tag.value.replace(/\./g, "_")}`,
                          );
            }

            if (tag.title === "status[]" && Array.isArray(tag.value)) {
                tag.value = tag.value
                    .map((s: string) =>
                        $t(`pages.admin.projects.table.rows.status.${s.replace(/\./g, "_")}`),
                    )
                    .join(", ");
            }

            if (tag.title === "territory" && tag.value) {
                tag.value = formatTerritoryCodes(tag.value, loc);
            }

            const dateMatch = tag.title.match(dateRegex);
            if (dateMatch && tag.value) {
                const [, base, op] = dateMatch;
                tag.value = `${$t(`domain.filterComposer.datePrefix.${base}`)} ${$t(`domain.filterComposer.dateSuffix.${op}`)}: ${formatDate(new Date(tag.value), loc)}`;
            }

            const subject =
                subjectByParam.get(tag.title.replace(/\[\]$/, "")) ?? subjectByParam.get(tag.title);
            if (subject && tag.value && tag.title !== "territory") {
                const formatted = formatSubjectValue(subject, tag.value);
                if (formatted !== tag.value) {
                    tag.value = formatted;
                }
            }

            return tag;
        });
    }

    $effect(() => {
        if (!filters) {
            tags = [];
            return;
        }

        const territoryKeys = ["territory.country[]", "territory.subLvl1[]", "territory.subLvl2[]"];

        const allKeys = Object.keys(filters);
        const dateKeys = allKeys.filter((k) => dateRegex.test(k));
        const normalKeys = allKeys.filter(
            (k) => !k.startsWith("territory.") && !dateKeys.includes(k),
        );

        let normalTags: FilterTag[] = normalKeys
            .map((key) => ({ title: key, value: String(filters[key] ?? "") }))
            .filter((tag) => tag.value !== undefined && tag.value !== "" && tag.value !== "all");

        const dateBaseKeys = new Map<string, Array<{ key: string; value: string }>>();
        for (const dk of dateKeys) {
            const val = String(filters[dk] ?? "");
            if (!val) continue;
            const match = dk.match(dateRegex);
            if (!match) continue;
            const base = match[1];
            if (!dateBaseKeys.has(base)) dateBaseKeys.set(base, []);
            dateBaseKeys.get(base)!.push({ key: dk, value: val });
        }

        for (const [base, entries] of dateBaseKeys) {
            if (entries.length >= 2) {
                const from = entries.find(
                    (e) => e.key.endsWith("[after]") || e.key.endsWith("[strictly_after]"),
                );
                const to = entries.find(
                    (e) => e.key.endsWith("[before]") || e.key.endsWith("[strictly_before]"),
                );
                if (from && to) {
                    normalTags.push({
                        title: base,
                        values: { from: from.value, to: to.value },
                    });
                    continue;
                }
            }
            for (const entry of entries) {
                normalTags.push({ title: entry.key, value: entry.value });
            }
        }

        const territoryCodes = territoryKeys
            .map((k) => (filters[k] as string[])?.filter(Boolean) ?? [])
            .flat();
        if (territoryCodes.length > 0) {
            normalTags.push({
                title: "territory",
                value: territoryCodes.join(", "),
            });
        }

        tags = formatTags(normalTags, $locale);
    });
</script>

<div class="flex gap-4">
    <Title level={1} variant="subsection">
        {title}
    </Title>

    {#each tags as tag}
        <Tag variant="bold">
            {#if tag.values}
                {`${tag.values.from} - ${tag.values.to}`}
            {:else if subjectByParam.get(tag.title.replace(/\[\]$/, ""))?.display === "accountingOwner"}
                <AccountingOwnerBadge accountingIri={tag.value ?? ""} class="text-xs" />
            {:else}
                {tag.value}
            {/if}
            <button onclick={() => closeTag(tag)} class="size-auto cursor-pointer">
                <CloseIcon class="size-3.75" />
            </button>
        </Tag>
    {/each}
</div>
