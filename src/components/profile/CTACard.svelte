<script lang="ts">
    /**
     * CTACard Component
     *
     * Displays a call-to-action card with title, description, and 1-2 action buttons.
     * Supports dark (purple) and light (soft purple) variants.
     *
     * @example
     * ```svelte
     * <CTACard
     *     variant="dark"
     *     title="Descubre, conecta y dona"
     *     description="Imagina un lugar donde cientos de proyectos sociales esperan tu apoyo..."
     *     buttons={[
     *         {
     *             label: "Dona a un proyecto",
     *             href: "/projects",
     *             kind: "primary",
     *         },
     *     ]}
     * />
     * ```
     */

    import Button from "../library/buttons/Button.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { HTMLAnchorAttributes } from "svelte/elements";

    interface ButtonConfig {
        label: string;
        href: HTMLAnchorAttributes["href"];
        kind: "primary" | "secondary" | "ghost" | "invert";
    }

    interface Props {
        /**
         * Visual variant (dark = secondary bg, light = soft purple bg)
         */
        variant: "dark" | "light";

        /**
         * Card title (max 2 lines with ellipsis)
         */
        title: string;

        /**
         * Card description text
         */
        description: string;

        /**
         * Action buttons (1-2 buttons supported)
         */
        buttons: ButtonConfig[];
    }

    let { variant, title, description, buttons }: Props = $props();

    // Derived state
    const isDark = $derived(variant === "dark");
</script>

<div
    class="flex flex-col justify-between gap-10 rounded-4xl border p-6 transition-shadow duration-200 {isDark
        ? 'border-grey bg-secondary text-white'
        : 'border-variant1 bg-purple-soft text-content'}"
>
    <!-- Content -->
    <div class="flex flex-col gap-4">
        <Title level={2} variant="section" class="leading-tight text-inherit">
            {title}
        </Title>
        <p class="text-sm leading-tight md:text-base md:leading-normal">
            {description}
        </p>
    </div>

    <!-- Actions -->
    <div class="flex flex-col flex-wrap gap-4 md:flex-row">
        {#each buttons as button}
            <Button kind={button.kind} href={button.href}>
                {button.label}
            </Button>
        {/each}
    </div>
</div>
