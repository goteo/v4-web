<script lang="ts">
    import TerritoryInput from "../inputs/TerritoryInput.svelte";

    import type { Territories } from "../../../utils/searchers";

    interface Props {
        value?: string;
        onChange: (value: string) => void;
        labelText?: string;
    }

    let { value = "", onChange, labelText }: Props = $props();

    let selectedTerritory = $derived(value ? (JSON.parse(value) as Territories) : undefined);
</script>

<TerritoryInput
    multiple
    {selectedTerritory}
    placeholder={labelText}
    onTerritoryChange={(territories) => onChange(JSON.stringify(territories))}
/>
