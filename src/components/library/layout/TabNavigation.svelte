<!--
    Tab Navigation Component

    Reusable tabbed navigation for multi-step wizards.

    Features:
    - Simple tab navigation without validation
    - Keyboard navigation support (Enter, Space)
    - Accessibility (ARIA attributes, roles)
    - Customizable styling

    Usage:
    <TabNavigation
        tabs={myTabs}
        currentTab={currentTabId}
        onTabClick={handleTabClick}
    />
-->
<script lang="ts">
    export interface Tab {
        id: string;
        label: string;
    }

    interface TabNavigationProps {
        tabs: Tab[];
        currentTab: string;
        onTabClick: (tabId: string) => void;
    }

    let { tabs, currentTab, onTabClick }: TabNavigationProps = $props();

    /**
     * Determine tab state classes
     */
    function getTabClasses(tab: Tab): string {
        const isActive = tab.id === currentTab;

        if (isActive) {
            return "border-primary bg-purple-soft text-secondary font-bold cursor-pointer";
        } else {
            return "border-grey text-content cursor-pointer hover:text-primary";
        }
    }

    /**
     * Handle keyboard navigation for tabs
     * Supports Enter and Space keys
     */
    function handleTabKeydown(tab: Tab, event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTabClick(tab.id);
        }
    }
</script>

<div class="tab-navigation overflow-x-auto">
    <div class="flex min-w-max items-center gap-0" role="tablist">
        {#each tabs as tab}
            {@const isActive = tab.id === currentTab}
            <button
                type="button"
                class="box-border flex items-center justify-center gap-2 overflow-visible rounded-tl-lg rounded-tr-lg border-b-2 px-6 py-3 whitespace-nowrap transition-all duration-200 {getTabClasses(
                    tab,
                )}"
                onclick={() => onTabClick(tab.id)}
                onkeydown={(e) => handleTabKeydown(tab, e)}
                tabindex={0}
                aria-label={tab.label}
                aria-selected={isActive}
                role="tab"
            >
                <span>{tab.label}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    /* Ensure proper scrolling on mobile */
    @media (max-width: 768px) {
        .tab-navigation {
            -webkit-overflow-scrolling: touch;
        }
    }
</style>
