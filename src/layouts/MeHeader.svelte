<script lang="ts">
    import Header from "./Header.svelte";
    import HeaderSubmenu from "./HeaderSubmenu.svelte";
    import MeNav from "../components/profile/MeNav.svelte";

    import type { HeaderLogo } from "../repositories/headerLogo";

    let { logo = null }: { logo?: HeaderLogo | null } = $props();
</script>

<Header {logo}>
    {#snippet nav()}
        <MeNav />
    {/snippet}
    <HeaderSubmenu />
</Header>
