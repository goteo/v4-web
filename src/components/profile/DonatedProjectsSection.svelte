<script lang="ts">
    import { onMount } from "svelte";

    import { session } from "../../auth/store.ts";
    import { t } from "../../i18n/store";
    import {
        apiGatewayChargesGetCollection,
        apiAccountingsIdGet,
        apiProjectsIdOrSlugGet,
    } from "../../openapi/client/sdk.gen.ts";
    import { getDefaultCurrency } from "../../utils/consts";
    import { extractId } from "../../utils/extractId";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import { addMoney } from "../../utils/money";
    import CampaignCard from "../home/CampaignCard.svelte";
    import Carousel from "../library/layout/Carousel.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Money, GatewayCharge } from "../../openapi/client/types.gen.ts";
    import type { Campaign } from "../../types/campaign";

    interface Props {
        lang: string;
    }

    let { lang }: Props = $props();

    /**
     * Charge statuses where the money actually left the payer. Excludes
     * `to_charge` (not collected yet) and the refund states.
     */
    const CHARGED_STATUSES: GatewayCharge["status"][] = ["in_charge", "to_wallet", "walleted"];

    let donatedCampaigns = $state<Campaign[]>([]);
    let loading = $state(true);

    async function fetchDonatedProjects() {
        loading = true;

        try {
            const headers = {
                "Accept-Language": lang,
                ...$session?.token.asHttpHeaders,
            };

            // Get user's gateway charges to find donated projects
            const { data: charges, error: chargesError } = await apiGatewayChargesGetCollection({
                query: {
                    itemsPerPage: 100,
                },
                headers,
            });

            if (chargesError) {
                console.error("Failed to fetch gateway charges:", chargesError);
                donatedCampaigns = [];
                loading = false;
                return;
            }

            const chargeItems = toCollectionItems<GatewayCharge>(charges);

            if (chargeItems.length > 0) {
                // Get unique project accounting IRIs from charges
                const projectAccountingIRIs = [
                    ...new Set(
                        chargeItems
                            .filter(
                                (charge) =>
                                    charge.target && CHARGED_STATUSES.includes(charge.status),
                            )
                            .map((charge) => charge.target)
                            .filter(Boolean),
                    ),
                ] as string[];

                // Calculate total donations per project
                const projectDonations = new Map<string, Money>();
                chargeItems.forEach((charge) => {
                    if (
                        charge.target &&
                        CHARGED_STATUSES.includes(charge.status) &&
                        charge.money?.amount
                    ) {
                        const current = projectDonations.get(charge.target) ?? {
                            amount: 0,
                            currency: charge.money.currency ?? getDefaultCurrency(),
                        };
                        projectDonations.set(charge.target, addMoney(current, charge.money));
                    }
                });

                // Fetch project details for each unique project
                const campaigns = (
                    await Promise.all(
                        projectAccountingIRIs.slice(0, 10).map(async (accountingIRI) => {
                            try {
                                // Fetch accounting to get project reference
                                const accountingId = extractId(accountingIRI);
                                if (!accountingId) return null;

                                const { data: accounting, error: accountingError } =
                                    await apiAccountingsIdGet({
                                        path: { id: accountingId },
                                        headers,
                                    });

                                if (accountingError || !accounting?.owner) {
                                    console.error(
                                        `Failed to fetch accounting ${accountingIRI}:`,
                                        accountingError,
                                    );
                                    return null;
                                }

                                // Fetch project data
                                const projectId = extractId(accounting.owner);
                                if (!projectId) return null;

                                const { data: project, error: projectError } =
                                    await apiProjectsIdOrSlugGet({
                                        path: { idOrSlug: projectId },
                                        headers,
                                    });

                                if (projectError || !project) {
                                    console.error(
                                        `Failed to fetch project for accounting ${accountingIRI}:`,
                                        projectError,
                                    );
                                    return null;
                                }

                                // Only show projects that are in campaign
                                if (project.status !== "in_campaign") return null;

                                return {
                                    ...project,
                                    slug: project.slug!,
                                    title: project.title!,
                                    image: project.video?.thumbnail!,
                                    minimum: project.budget?.minimum?.money!,
                                    optimum: project.budget?.optimum?.money,
                                    obtained: accounting.balance as Money,
                                    category: project.categories?.[0], // Get first category
                                    userDonations: projectDonations.get(accountingIRI) ?? {
                                        amount: 0,
                                        currency: getDefaultCurrency(),
                                    },
                                } satisfies Campaign;
                            } catch (error) {
                                console.error(
                                    `Error fetching project for accounting ${accountingIRI}:`,
                                    error,
                                );
                                return null;
                            }
                        }),
                    )
                ).filter(Boolean) as Campaign[];

                donatedCampaigns = campaigns;
            } else {
                donatedCampaigns = [];
            }
        } catch (error) {
            console.error("Error fetching donated projects:", error);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        fetchDonatedProjects();
    });
</script>

{#if !loading && donatedCampaigns.length > 0}
    <div class="flex flex-col gap-6">
        <Title level={2} variant="section">
            {$t("pages.me.donatedProjects.title")}
        </Title>
        <Carousel itemsPerGroup={3} gap={24} showDots={false}>
            {#each donatedCampaigns as campaign, index (campaign.id)}
                <CampaignCard
                    size={index === 0 ? "large" : "small"}
                    {campaign}
                    showUserDonations={true}
                />
            {/each}
        </Carousel>
    </div>
{/if}
