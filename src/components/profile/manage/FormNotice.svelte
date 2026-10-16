<!--
    FormNotice Component

    Small helper note rendered at the bottom of a form section, pairing the info icon with a short
    piece of text. Used for the legal/privacy copy that accompanies a group of fields.
-->
<script lang="ts">
    import Warning from "../../icons/status/Warning.svelte";

    interface Props {
        text: string;
    }

    let { text }: Props = $props();
</script>

<div class="flex items-start gap-2">
    <Warning width="16" height="16" class="text-content mt-1 shrink-0" />
    <p class="text-content flex-1 text-sm leading-4 font-medium">{text}</p>
</div>
