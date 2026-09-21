<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import {
        resolveAccountingOwner,
        type OwnerKind,
        type OwnerRef,
    } from "../../../utils/accountingOwner";
    import Box from "../../icons/Box.svelte";
    import Money from "../../icons/commerce/Money.svelte";
    import User from "../../icons/user/User.svelte";

    interface Props {
        accountingIri: string;
        class?: ClassNameValue;
    }

    let { accountingIri, class: classes = "" }: Props = $props();

    let owner = $state<OwnerRef | undefined>(undefined);

    const iconByKind: Record<OwnerKind, typeof Box> = {
        user: User,
        project: Box,
        tipjar: Money,
    };

    $effect(() => {
        let cancelled = false;

        resolveAccountingOwner(accountingIri).then((ref) => {
            if (!cancelled) {
                owner = ref;
            }
        });

        return () => {
            cancelled = true;
        };
    });
</script>

<span class={twMerge("flex items-center gap-1 self-stretch", classes)}>
    {#if owner}
        {@const Icon = iconByKind[owner.kind]}
        <Icon class="text-content size-4 shrink-0" />
        <span class="text-content truncate text-base font-normal">{owner.name}</span>
    {:else}
        <span class="opacity-50">—</span>
    {/if}
</span>
