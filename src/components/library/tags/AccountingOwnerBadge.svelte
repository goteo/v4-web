<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import {
        resolveAccountingOwner,
        type OwnerKind,
        type OwnerRef,
    } from "../../../utils/accountingOwner";
    import Box from "../../icons/Box.svelte";
    import Money from "../../icons/commerce/Money.svelte";
    import Spinner from "../../icons/status/Spinner.svelte";
    import User from "../../icons/user/User.svelte";

    interface Props {
        accountingIri: string;
        class?: ClassNameValue;
    }

    let { accountingIri, class: classes = "" }: Props = $props();

    let owner = $state<OwnerRef | undefined>(undefined);
    let loading = $state(true);

    const iconByKind: Record<OwnerKind, typeof Box> = {
        user: User,
        project: Box,
        tipjar: Money,
    };

    $effect(() => {
        const iri = accountingIri;
        const hasIri = iri !== "" && iri !== "—";
        let cancelled = false;

        owner = undefined;
        loading = hasIri;

        if (!hasIri) return;

        resolveAccountingOwner(iri)
            .then((ref) => {
                if (!cancelled) owner = ref;
            })
            .finally(() => {
                if (!cancelled) loading = false;
            });

        return () => {
            cancelled = true;
        };
    });
</script>

<span class={twMerge("flex items-center gap-1 self-stretch", classes)}>
    {#if loading}
        <Spinner width="16px" height="16px" class="text-content shrink-0" />
    {:else if owner}
        {@const Icon = iconByKind[owner.kind]}
        <Icon class="text-content size-4 shrink-0" />
        <span class="text-content truncate text-base font-normal">{owner.name}</span>
    {:else}
        <span class="opacity-50">—</span>
    {/if}
</span>
