<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import StepCharge from "./steps/StepCharge.svelte";
    import StepFiscal from "./steps/StepFiscal.svelte";
    import StepUser from "./steps/StepUser.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiGatewayCheckoutsPost,
        apiUsersPost,
        apiUsersIdOrHandleGet,
        apiUsersIdpersonPatch,
        apiUsersIdorganizationPatch,
    } from "../../../openapi/client";
    import {
        initialFormState,
        initialFiscal,
        type CreateChargeForm,
        type DonorType,
    } from "../../../types/admin-charge";
    import Button from "../../library/buttons/Button.svelte";
    import Title from "../../library/typography/Title.svelte";

    type StepKey = "user" | "charge" | "fiscal";

    const STEPS: { key: StepKey; titleKey: string }[] = [
        { key: "user", titleKey: "pages.admin.charges.create.steps.user.title" },
        { key: "charge", titleKey: "pages.admin.charges.create.steps.charge.title" },
        { key: "fiscal", titleKey: "pages.admin.charges.create.steps.fiscal.title" },
    ];

    let {
        open = $bindable(false),
        submitting = $bindable(false),
        onCreated,
    }: {
        open: boolean;
        submitting?: boolean;
        onCreated?: () => Promise<void> | void;
    } = $props();

    let currentStep = $state<StepKey>("user");
    let form = $state<CreateChargeForm>(initialFormState());
    let activeUserId = $state<string | null>(null);

    let stepUser = $state<ReturnType<typeof StepUser> | null>(null);
    let stepCharge = $state<ReturnType<typeof StepCharge> | null>(null);
    let stepFiscal = $state<ReturnType<typeof StepFiscal> | null>(null);

    let submitState = $state<"idle" | "submitting" | "error">("idle");
    let submitError = $state<string | null>(null);

    $effect(() => {
        submitting = submitState === "submitting";
    });

    function resetModal() {
        currentStep = "user";
        form = initialFormState();
        activeUserId = null;
        submitState = "idle";
        submitError = null;
    }

    function closeModal() {
        if (submitState === "submitting") return;
        open = false;
        resetModal();
    }

    $effect(() => {
        const targetType: DonorType = form.existingUser?.type ?? form.user.type;
        if (targetType === "individual" && form.fiscal.kind !== "individual") {
            form.fiscal = initialFiscal("individual");
        } else if (targetType === "organization" && form.fiscal.kind !== "organization") {
            form.fiscal = initialFiscal("organization");
        }
    });

    function stepIndex(key: StepKey): number {
        return STEPS.findIndex((s) => s.key === key);
    }

    function nextStep() {
        if (currentStep === "user") {
            if (!stepUser?.validate()) return;
            activeUserId = form.existingUser?.id ?? null;
            currentStep = "charge";
            return;
        }
        if (currentStep === "charge") {
            if (!stepCharge?.validate()) return;
            currentStep = "fiscal";
            return;
        }
    }

    function prevStep() {
        if (currentStep === "fiscal") currentStep = "charge";
        else if (currentStep === "charge") currentStep = "user";
    }

    function isLastStep(): boolean {
        return currentStep === "fiscal";
    }

    async function patchFiscal(userId: string): Promise<void> {
        if (form.fiscal.kind === "individual") {
            await apiUsersIdpersonPatch({
                baseUrl: "/api/relay",
                path: { id: userId },
                body: {
                    firstName: form.fiscal.firstName,
                    lastName: form.fiscal.lastName,
                    taxId: form.fiscal.taxId ?? "",
                },
            });
        } else {
            await apiUsersIdpersonPatch({
                baseUrl: "/api/relay",
                path: { id: userId },
                body: {
                    firstName: form.fiscal.repFirstName,
                    lastName: form.fiscal.repLastName,
                    taxId: form.fiscal.repTaxId ?? "",
                },
            });
            await apiUsersIdorganizationPatch({
                baseUrl: "/api/relay",
                path: { id: userId },
                body: {
                    taxId: form.fiscal.taxId ?? "",
                    legalName: form.fiscal.legalName,
                },
            });
        }
    }

    async function handleSubmit(): Promise<void> {
        submitState = "submitting";
        submitError = null;

        try {
            let userId: string;
            let userAccountingIri: string;

            if (form.existingUser) {
                userId = form.existingUser.id;
                userAccountingIri = form.existingUser.accounting;
            } else {
                const donorType: DonorType = form.user.type;

                const createUserRes = await apiUsersPost({
                    baseUrl: "/api/relay",
                    body: {
                        email: form.user.email,
                        password: form.user.password,
                        type: donorType,
                    },
                });

                userId = String(createUserRes.data?.id ?? "");
                if (!userId) {
                    throw new Error("User creation returned no id");
                }

                const { data: freshUser } = await apiUsersIdOrHandleGet({
                    baseUrl: "/api/relay",
                    path: { idOrHandle: userId },
                });

                userAccountingIri = freshUser?.accounting ?? "";
                if (!userAccountingIri) {
                    throw new Error("New user has no accounting assigned");
                }
            }

            await patchFiscal(userId);

            await apiGatewayCheckoutsPost({
                baseUrl: "/api/relay",
                body: {
                    gateway: form.charge.gatewayIri,
                    origin: userAccountingIri,
                    returnUrl: `${window.location.origin}/admin/charges`,
                    refund: "to_wallet",
                    charges: [
                        {
                            type: "single",
                            title: form.charge.title,
                            description: form.charge.description || null,
                            target: form.charge.targetIri,
                            money: form.charge.money,
                        },
                    ],
                },
            });

            submitState = "idle";
            await onCreated?.();
            closeModal();
        } catch (err: any) {
            console.error("Create charge failed:", err);
            const status = err?.response?.status ?? err?.status;
            let backendDetail: string | null = null;
            try {
                const raw = await err?.response?.clone?.()?.text?.();
                if (raw) {
                    console.error("Error response body:", raw);
                    try {
                        const parsed = JSON.parse(raw);
                        backendDetail =
                            parsed?.detail ?? parsed?.description ?? parsed?.title ?? null;
                    } catch {
                        // not JSON
                    }
                }
            } catch {
                // ignore
            }
            submitState = "error";

            if (status === 409) {
                submitError = $t("pages.admin.charges.create.errors.userExists");
            } else if (status === 401 || status === 403) {
                submitError = $t("pages.admin.charges.create.errors.unauthorized");
            } else if (backendDetail) {
                submitError = backendDetail;
            } else {
                submitError = $t("pages.admin.charges.create.errors.unexpected");
            }
        }
    }

    function stepLabel(key: StepKey): string {
        const stepDef = STEPS.find((s) => s.key === key);
        return stepDef ? $t(stepDef.titleKey) : "";
    }
</script>

<Modal
    bind:open
    title={$t("pages.admin.charges.create.title")}
    closeBtnClass="top-4 end-4 bg-transparent text-secondary hover:bg-transparent hover:text-secondary focus:ring-0 shadow-none cursor-pointer"
    class="backdrop:bg-overlay max-w-3xl backdrop:backdrop-blur-[5px]"
    onclose={resetModal}
>
    <div class="flex flex-col gap-6">
        <ol class="flex items-center justify-between gap-2 text-sm">
            {#each STEPS as step, i (step.key)}
                {@const idx = stepIndex(currentStep)}
                {@const done = i < idx}
                {@const active = i === idx}
                <li class="flex flex-1 items-center gap-2">
                    <span
                        class={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            done
                                ? "bg-primary text-secondary"
                                : active
                                  ? "bg-secondary text-white"
                                  : "bg-grey text-secondary"
                        }`}
                    >
                        {done ? "✓" : i + 1}
                    </span>
                    <span
                        class={`truncate font-medium ${active ? "text-secondary" : "text-gray-500"}`}
                    >
                        {stepLabel(step.key)}
                    </span>
                    {#if i < STEPS.length - 1}
                        <span class="hidden flex-1 border-t border-gray-300 sm:block"></span>
                    {/if}
                </li>
            {/each}
        </ol>

        <div>
            <Title level={3} variant="subsection" weight="bold" color="secondary">
                {stepLabel(currentStep)}
            </Title>
            <p class="text-content mt-1 text-sm">
                {$t(`pages.admin.charges.create.steps.${currentStep}.description`)}
            </p>
        </div>

        <div class="min-h-65">
            {#if currentStep === "user"}
                <StepUser bind:this={stepUser} bind:form />
            {:else if currentStep === "charge"}
                <StepCharge bind:this={stepCharge} bind:form />
            {:else if currentStep === "fiscal"}
                {#key `${activeUserId}-${form.existingUser?.type ?? form.user.type}`}
                    <StepFiscal bind:this={stepFiscal} bind:form userId={activeUserId} />
                {/key}
            {/if}
        </div>

        {#if submitError}
            <p class="text-tertiary text-sm" role="alert">
                {submitError}
            </p>
        {/if}

        <div class="flex items-center justify-between gap-3 pt-2">
            <Button
                kind="ghost"
                size="sm"
                onclick={closeModal}
                disabled={submitState === "submitting"}
            >
                {$t("common.cancel")}
            </Button>

            <div class="flex items-center gap-2">
                {#if currentStep !== "user"}
                    <Button
                        kind="ghost"
                        size="sm"
                        onclick={prevStep}
                        disabled={submitState === "submitting"}
                    >
                        {$t("common.back")}
                    </Button>
                {/if}

                {#if !isLastStep()}
                    <Button
                        kind="primary"
                        size="sm"
                        onclick={nextStep}
                        disabled={submitState === "submitting"}
                    >
                        {$t("pages.admin.charges.create.actions.next")}
                    </Button>
                {:else}
                    <Button
                        kind="primary"
                        size="sm"
                        onclick={handleSubmit}
                        disabled={submitState === "submitting"}
                    >
                        {submitState === "submitting"
                            ? $t("pages.admin.charges.create.actions.submitting")
                            : $t("pages.admin.charges.create.actions.submit")}
                    </Button>
                {/if}
            </div>
        </div>
    </div>
</Modal>
