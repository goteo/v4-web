<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { ME_SECTIONS } from "./meSections";
    import { locale, t } from "../../i18n/store";

    interface Props {
        class?: ClassNameValue;
    }

    let { class: classes = "" }: Props = $props();

    let pathname = $state("");

    $effect(() => {
        pathname = window.location.pathname.replace(/\/+$/, "");
    });

    function isActive(href: string, exact?: boolean): boolean {
        return [href, `/${$locale}${href}`].some((target) =>
            exact ? pathname === target : pathname === target || pathname.startsWith(target + "/"),
        );
    }
</script>

<nav class={twMerge("touch-pan-x overflow-x-auto px-2 pb-3 md:px-4 md:pb-4", classes)}>
    <ul class="flex min-w-max items-center gap-2">
        {#each ME_SECTIONS as section (section.href)}
            {@const active = isActive(section.href, section.exact)}
            <li>
                <a
                    href="/{$locale}{section.href}"
                    aria-current={active ? "page" : undefined}
                    class="block rounded-lg px-4 py-2 whitespace-nowrap transition-colors duration-200 {active
                        ? 'bg-secondary text-white'
                        : 'bg-grey text-secondary'}"
                >
                    {$t(section.labelKey)}
                </a>
            </li>
        {/each}
    </ul>
</nav>
