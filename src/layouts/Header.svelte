<script lang="ts">
    import { clickOutside } from "flowbite-svelte";

    import { session } from "../auth/store";
    import CartButton from "../components/checkout/CartButton.svelte";
    import HeaderButtons from "../components/header/HeaderButtons.svelte";
    import UiLanguages from "../components/header/UiLanguages.svelte";
    import Logo from "../components/icons/Logo.svelte";
    import Hamburger from "../components/icons/navigation/Hamburger.svelte";
    import UserIcon from "../components/icons/user/User.svelte";
    import { t } from "../i18n/store";
    import { cartCount } from "../stores/checkoutsStore";

    import type { Snippet } from "svelte";

    let { children, nav }: { children?: Snippet; nav?: Snippet } = $props();

    let menuOpen = $state(false);

    function menuToggle() {
        menuOpen = !menuOpen;
    }

    let userDropdownOpen = $state(false);

    function userDropdownToggle() {
        userDropdownOpen = !userDropdownOpen;
    }

    function userDropdownClose() {
        userDropdownOpen = false;
    }
</script>

<header class="fixed top-0 z-100 w-full px-2 pt-6 md:px-6 md:pt-8">
    <div class="mx-auto max-w-360 px-2">
        <div
            class="border-grey flex flex-col rounded-xl border bg-white/50 backdrop-blur-xl"
            id="header-container"
        >
            <div
                class="flex flex-col"
                id="header-measure"
                {@attach (el) => {
                    const observer = new ResizeObserver(() => {
                        document.documentElement.style.setProperty(
                            "--header-height",
                            `${el.getBoundingClientRect().bottom}px`,
                        );
                    });
                    observer.observe(el);
                    return () => observer.disconnect();
                }}
            >
                <div
                    class="flex w-full items-center justify-between px-2 py-3 md:px-4 md:py-6"
                    id="header-main"
                >
                    <div class="flex items-center gap-2 md:gap-4">
                        <a href="/" class="shrink-0"><Logo /></a>
                        <div class="hidden sm:block">
                            <HeaderButtons />
                        </div>
                    </div>
                    <nav>
                        <ul class="flex items-center gap-1 md:gap-4">
                            {#if $session || $cartCount > 0}
                                <li class="flex items-center pr-2">
                                    <CartButton />
                                </li>
                            {/if}
                            <li class="flex items-center gap-1 pr-2 text-sm md:text-base">
                                {#if $session}
                                    <div class="relative inline-block w-full">
                                        <button
                                            onclick={userDropdownToggle}
                                            use:clickOutside={userDropdownClose}
                                            class="flex w-full cursor-pointer items-center gap-1"
                                        >
                                            <UserIcon />
                                            <span class="hidden sm:inline">
                                                {$t("common.greeting")}, {$session.user.displayName}
                                            </span>
                                        </button>

                                        <div
                                            class="absolute top-full left-0 mt-2 w-full min-w-30 flex-col rounded-lg bg-white p-2 shadow-lg"
                                            class:hidden={!userDropdownOpen}
                                            class:flex={userDropdownOpen}
                                        >
                                            <a
                                                href="/me"
                                                class="border-grey text-secondary hover:bg-grey block w-full overflow-hidden border-b px-4 py-2 font-bold text-ellipsis"
                                            >
                                                {$t("common.header.goToProfile")}
                                            </a>
                                            {#if $session.user.roles?.includes("ROLE_ADMIN")}
                                                <a
                                                    href="/admin"
                                                    class="border-grey text-secondary hover:bg-grey block w-full overflow-hidden border-b px-4 py-2 font-bold text-ellipsis"
                                                >
                                                    {$t("common.header.admin")}
                                                </a>
                                            {/if}
                                            <a
                                                href="/logout"
                                                class="text-secondary hover:bg-grey block w-full cursor-pointer overflow-hidden rounded-b-lg px-4 py-2 font-bold text-ellipsis"
                                            >
                                                {$t("pages.logout.label")}
                                            </a>
                                        </div>
                                    </div>
                                {:else}
                                    <a href="/login" class="flex w-full items-center gap-1">
                                        <UserIcon />
                                        <span class="hidden sm:inline">{$t("common.login")}</span>
                                    </a>
                                {/if}
                            </li>
                            <li class="hidden items-center pr-2 md:flex">
                                <UiLanguages />
                            </li>
                            <li class="flex items-center {children ? '' : 'sm:hidden'}">
                                <button class="p-1" onclick={menuToggle}>
                                    <Hamburger
                                        close={menuOpen}
                                        class="text-primary"
                                        barClass="fill-secondary"
                                    />
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>

                {@render nav?.()}
            </div>

            <div
                class="grid transition-[grid-template-rows] duration-300 {menuOpen
                    ? 'grid-rows-[1fr]'
                    : 'grid-rows-[0fr]'}"
            >
                <div class="overflow-hidden">
                    <div class="flex flex-col gap-4 p-4 sm:hidden">
                        <HeaderButtons />
                        <UiLanguages />
                    </div>
                    {@render children?.()}
                </div>
            </div>
        </div>
    </div>
</header>
