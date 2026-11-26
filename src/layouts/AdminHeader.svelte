<script lang="ts">
    import Header from "./Header.svelte";
    import HeaderSubmenu from "./HeaderSubmenu.svelte";
    import AdminNav from "../components/admin/AdminNav.svelte";

    import type { HeaderLogo } from "../repositories/headerLogo";

    let { logo = null }: { logo?: HeaderLogo | null } = $props();
</script>

<Header {logo}>
    {#snippet nav()}
        <AdminNav />
    {/snippet}
    <HeaderSubmenu />
</Header>
