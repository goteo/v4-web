<script lang="ts">
    import Header from "./Header.svelte";
    import HeaderSubmenu from "./HeaderSubmenu.svelte";
    import MeNav from "../components/profile/MeNav.svelte";
</script>

<Header>
    {#snippet nav()}
        <MeNav />
    {/snippet}
    <HeaderSubmenu />
</Header>
