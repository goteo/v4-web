<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";

    export type TitleLevel = 1 | 2 | 3 | 4 | 5 | 6;
    export type TitleVariant = "display" | "headline" | "section" | "subsection" | "field";
    export type TitleWeight = "medium" | "bold" | "semibold" | "normal";
    export type TitleColor = "default" | "secondary" | "white" | "purple-soft";
    export type TitleAlign = "left" | "center" | "right";

    export const SIZES: Record<TitleVariant, string> = {
        display: "text-4xl leading-10 sm:text-5xl sm:leading-[3rem] md:text-[56px] md:leading-16",
        headline: "text-3xl leading-9 sm:text-4xl sm:leading-11 md:text-[40px] md:leading-12",
        section: "text-2xl leading-8 sm:text-3xl sm:leading-10 md:text-double md:leading-10",
        subsection: "text-xl leading-7 sm:text-2xl sm:leading-8",
        field: "text-sm leading-6 sm:text-base sm:leading-7",
    };

    const DEFAULT_WEIGHTS: Record<TitleVariant, TitleWeight> = {
        display: "medium",
        headline: "medium",
        section: "medium",
        subsection: "bold",
        field: "bold",
    };

    const COLORS: Record<TitleColor, string> = {
        default: "text-black",
        secondary: "text-secondary",
        white: "text-white",
        "purple-soft": "text-purple-soft",
    };

    interface Props {
        children: Snippet;
        level: TitleLevel;
        variant: TitleVariant;
        weight?: TitleWeight;
        color?: TitleColor;
        truncate?: 0 | 1 | 2 | 3;
        uppercase?: boolean;
        align?: TitleAlign;
        id?: string;
        class?: ClassNameValue;
    }

    let {
        children,
        level,
        variant,
        weight,
        color = "default",
        truncate = 0,
        uppercase = false,
        align = "left",
        id,
        class: classes = "",
    }: Props = $props();

    const effectiveWeight = $derived(weight ?? DEFAULT_WEIGHTS[variant]);
    const weightClass = $derived(`font-${effectiveWeight}`);

    const classFinal = $derived(
        twMerge(
            SIZES[variant],
            weightClass,
            COLORS[color],
            truncate > 0 && `line-clamp-${truncate}`,
            uppercase && "uppercase",
            align === "center" && "text-center",
            align === "right" && "text-right",
            classes,
        ),
    );

    const tag = $derived(`h${level}` as const);
</script>

<svelte:element this={tag} {id} class={classFinal}>
    {@render children()}
</svelte:element>
