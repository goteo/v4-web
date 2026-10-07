<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import FeaturedUserCard from "./FeaturedUserCard.svelte";
    import { t } from "../../i18n/store";
    import Grid from "../library/layout/Grid.svelte";

    interface FeaturedUser {
        id: number;
        name: string;
        image: string | null;
        ownProjects: number;
        capitalRaised: number;
        currency: string;
    }

    interface Props {
        class?: ClassNameValue;
        users: FeaturedUser[];
    }

    let { class: classes = "", users }: Props = $props();

    /**
     * A third column only helps once there is a third card: with fewer, cards would keep
     * their width and leave a gap at the end of the row.
     *
     * Written out in full because Tailwind only picks up classes it can read as literal
     * strings, so composing them from the count would silently drop them from the build.
     */
    const gridClasses = $derived(
        users.length >= 3
            ? "grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 gap-6 md:grid-cols-2",
    );
</script>

<section class={twMerge("wrapper py-16", classes)}>
    <div class="flex flex-col gap-6">
        <h2 class="text-2xl leading-8 font-bold text-black">
            {$t("pages.home.featuredPromoters.title")}
        </h2>

        <Grid class={gridClasses}>
            {#each users as user (user.id)}
                <FeaturedUserCard {user} />
            {/each}
        </Grid>
    </div>
</section>
