<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { renderMarkdown } from "../../../../utils/renderMarkdown";
    import Hero from "../../../hero/Hero.svelte";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";

    interface Props {
        open?: boolean;
        hero: HomeHeroRecord | null;
    }

    let { open = $bindable(false), hero }: Props = $props();
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 divide-y-0 rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    {#if hero}
        {#await renderMarkdown(hero.content) then html}
            <Hero {hero} content={html} />
        {/await}
    {/if}
</Modal>
