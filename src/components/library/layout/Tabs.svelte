<!--
    Shared Tabs Component - Design System Compliant
    
    This component provides consistent tab navigation across the application.
    It follows the design system with proper colors, spacing, and transitions.
    
    Usage:
    - Profile pages: Center-aligned, uses data-tab-content attributes
    - Campaign pages: Left-aligned, custom callback handling
    
    Props:
    - tabs: Array of {id, label, icon?} objects
    - activeTab: Initially active tab ID
    - onTabChange: Callback when tab changes
    - alignment: "center" | "left" (default: "center")
    - useDataAttributes: Whether to toggle [data-tab-content] elements (default: true)
    
    Design System:
    - Active: border-primary, text-secondary
    - Inactive: border-variant1, text-tertiary
    - Hover: opacity-80
    - Transition: 200ms ease
-->
<script lang="ts">
    import { untrack } from "svelte";

    import type { Snippet, Component } from "svelte";

    interface Tab {
        id: string;
        label: string;
        icon?: Component | Snippet;
    }

    interface Props {
        tabs: Tab[];
        activeTab?: string;
        onTabChange?: (tabId: string) => void;
        alignment?: "left" | "center";
        useDataAttributes?: boolean;
    }

    let {
        tabs,
        activeTab = tabs[0]?.id,
        onTabChange,
        alignment = "center",
        useDataAttributes = true,
    }: Props = $props();

    // `activeTab` names the tab to open with, not the tab currently open — from then on the
    // selection belongs to this component. Reading it untracked says so, and stops a later
    // change to the prop from yanking the tab out from under whoever is clicking around.
    let currentTab = $state(untrack(() => activeTab));

    function handleTabClick(tabId: string) {
        currentTab = tabId;

        if (useDataAttributes) {
            // Hide all tab content using data attributes
            const allTabContent = document.querySelectorAll("[data-tab-content]");
            allTabContent.forEach((content) => {
                (content as HTMLElement).style.display = "none";
            });

            // Show selected tab content
            const selectedContent = document.querySelector(`[data-tab-content="${tabId}"]`);
            if (selectedContent) {
                (selectedContent as HTMLElement).style.display = "block";
            }
        }

        if (onTabChange) {
            onTabChange(tabId);
        }
    }

    function isSnippet(icon: any): icon is Snippet {
        return typeof icon === "function";
    }
</script>

<div
    class="flex w-full {alignment === 'center'
        ? 'items-center justify-center'
        : 'items-center justify-start'}"
>
    <div class="flex cursor-pointer items-center gap-0">
        {#each tabs as tab}
            <button
                class="box-border flex cursor-pointer items-center justify-center gap-2 overflow-visible rounded-tl-lg rounded-tr-lg border-b-2 px-6 py-2 transition-all duration-200 {currentTab ===
                tab.id
                    ? 'border-primary text-secondary'
                    : 'border-variant1 text-content'}"
                onclick={() => handleTabClick(tab.id)}
                data-tab={tab.id}
            >
                {#if tab.icon}
                    <div class="size-4 overflow-hidden">
                        {#if isSnippet(tab.icon)}
                            {@render tab.icon()}
                        {:else}
                            {@const IconComponent = tab.icon}
                            <IconComponent />
                        {/if}
                    </div>
                {/if}
                <span class="text-base leading-6 font-bold">
                    {tab.label}
                </span>
            </button>
        {/each}
    </div>
</div>

<style>
    button:hover {
        opacity: 0.8;
    }
</style>
