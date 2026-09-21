<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { ADMIN_SECTIONS } from "./adminSections";
    import { locale, t } from "../../i18n/store";

    interface Props {
        class?: ClassNameValue;
    }

    let { class: classes = "" }: Props = $props();

    const sections = ADMIN_SECTIONS.map((section) => ({
        path: section.href,
        key: section.labelKey,
    }));

    let pathname = $state("");

    $effect(() => {
        pathname = window.location.pathname.replace(/\/+$/, "");
    });

    function isActive(path: string): boolean {
        return [path, `/${$locale}${path}`].some(
            (target) => pathname === target || pathname.startsWith(target + "/"),
        );
    }
</script>

<nav class={twMerge("touch-pan-x overflow-x-auto px-2 pb-3 md:px-4 md:pb-4", classes)}>
    <ul class="flex min-w-max items-center gap-2">
        {#each sections as section (section.path)}
            {@const active = isActive(section.path)}
            <li>
                <a
                    href="/{$locale}{section.path}"
                    aria-current={active ? "page" : undefined}
                    class="block rounded-lg px-4 py-2 whitespace-nowrap transition-colors duration-200 {active
                        ? 'bg-secondary text-white'
                        : 'bg-grey text-secondary'}"
                >
                    {$t(section.key)}
                </a>
            </li>
        {/each}
    </ul>
</nav>
