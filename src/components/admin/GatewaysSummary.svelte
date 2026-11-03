<script lang="ts">
    import { formatCurrency } from "../../utils/currencies";
    import Category from "../library/tags/Category.svelte";

    import type { Gateway } from "../../openapi/client";

    interface Props {
        gateways: Gateway[];
    }

    const { gateways }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
    {#each gateways as gateway}
        <Category
            class="text-secondary hover:inset-ring-secondary hover:bg-white hover:inset-ring-1"
        >
            {gateway.name}
            {formatCurrency(0)}
        </Category>
    {/each}
</div>
