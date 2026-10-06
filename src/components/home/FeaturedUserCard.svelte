<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t, locale } from "../../i18n/store";
    import { formatAmountWithSymbol } from "../../utils/currencies";

    interface FeaturedUser {
        name: string;
        image: string | null;
        ownProjects: number;
        capitalRaised: number;
        currency: string;
    }

    interface Props {
        class?: ClassNameValue;
        user: FeaturedUser;
    }

    let { class: classes = "", user }: Props = $props();
</script>

<div class={twMerge("relative overflow-hidden rounded-3xl bg-white shadow-lg", classes)}>
    <div class="bg-secondary relative h-97.25 overflow-hidden rounded-t-3xl">
        <div class="from-primary/30 to-tertiary absolute inset-0 bg-linear-to-br"></div>

        <div class="absolute top-34 -left-18.75 h-87.75 w-87.75 opacity-20">
            <img
                src="/images/home/featured-user-decoration-2.svg"
                alt=""
                class="h-full w-full object-contain"
                aria-hidden="true"
            />
        </div>
        <div class="absolute -top-41.75 left-43.25 h-94.25 w-94.25 opacity-15">
            <img
                src="/images/home/featured-user-decoration-3.svg"
                alt=""
                class="h-full w-full object-contain"
                aria-hidden="true"
            />
        </div>
        <div class="absolute top-46.75 left-36 h-69.5 w-69.5 opacity-10">
            <img
                src="/images/home/featured-user-decoration-4.svg"
                alt=""
                class="h-full w-full object-contain"
                aria-hidden="true"
            />
        </div>
        <div class="absolute -top-15.75 -left-26.25 h-69.5 w-69.5 opacity-10">
            <img
                src="/images/home/featured-user-decoration-4.svg"
                alt=""
                class="h-full w-full object-contain"
                aria-hidden="true"
            />
        </div>

        <div
            class="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={user.image ? `background-image: url('${user.image}')` : ""}
            role="img"
            aria-label={`${user.name} - ${$t("pages.home.featuredPromoters.promoterImage")}`}
        ></div>

        <div class="absolute -top-28 -right-32.75 h-139.75 w-98.75 opacity-30">
            <img
                src="/images/home/featured-user-decoration-1.svg"
                alt=""
                class="h-full w-full object-contain"
                aria-hidden="true"
            />
        </div>
    </div>

    <div class="flex flex-col gap-6 p-6">
        <h3 class="text-secondary text-2xl leading-8 font-bold">
            {user.name}
        </h3>

        <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1 text-left">
                <span class="text-content text-base leading-6">
                    {$t("pages.home.featuredPromoters.projectsPromoted")}
                </span>
                <span class="text-content text-2xl leading-8 font-bold">
                    {user.ownProjects}
                </span>
            </div>

            <div class="flex flex-col gap-1 text-right">
                <span class="text-content text-base leading-6">
                    {$t("pages.home.featuredPromoters.capitalRaised")}
                </span>
                <span class="text-content text-2xl leading-8 font-bold">
                    {formatAmountWithSymbol(user.capitalRaised, user.currency, $locale)}
                </span>
            </div>
        </div>
    </div>
</div>
