<script lang="ts">
    import { navigate } from "astro:transitions/client";

    import { t } from "../../i18n/store";
    import Toast from "../library/feedback/Toast.svelte";
    import Checkbox from "../library/inputs/Checkbox.svelte";
    import PasswordInput from "../library/inputs/PasswordInput.svelte";
    import TextInput from "../library/inputs/TextInput.svelte";
    import Thtml from "../library/typography/Thtml.svelte";
    import Title from "../library/typography/Title.svelte";

    let identifier = $state("");
    let password = $state("");
    let acceptTerms = $state(false);
    let isSubmitting = $state(false);
    let errorMessage = $state("");
    let showErrorToast = $state(false);

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        const form = e.currentTarget as HTMLFormElement;
        const settle = () => form.dispatchEvent(new Event("checkout:settled"));

        showErrorToast = false;
        errorMessage = "";

        if (!acceptTerms) {
            errorMessage = $t("pages.checkout.login.error.requireTerms");
            showErrorToast = true;
            settle();
            return;
        }

        isSubmitting = true;

        try {
            const response = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            if (!response.ok) {
                const { error } = (await response.json()) as { error?: string };

                errorMessage = $t(error ?? "pages.checkout.login.error.unexpectedLogin");
                showErrorToast = true;
                settle();
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            const callbackUrl = urlParams.get("callback");

            const targetUrl = callbackUrl || "/";
            navigate(targetUrl);
        } catch (err) {
            console.error(err);
            errorMessage = $t("pages.checkout.login.error.unexpectedLogin");
            showErrorToast = true;
            settle();
        } finally {
            isSubmitting = false;
        }
    };
</script>

<div class="flex w-full flex-col items-start gap-10 self-stretch">
    <div class="flex flex-col items-start gap-10 self-stretch">
        <Title level={1} variant="headline" class="self-stretch">
            {$t("pages.checkout.login.title")}
        </Title>
        <p class="text-content self-stretch text-base leading-6 font-normal">
            {$t("pages.checkout.login.description")}
        </p>
    </div>

    <div class="text-content flex flex-col gap-4">
        <div class="flex items-center gap-4">
            <h2 class="text-secondary text-2xl leading-8 font-bold">
                {$t("pages.checkout.login.loginOr")}
            </h2>
            <a
                href="/checkout/register?callback=/checkout/shipping"
                class="bg-variant1 text-secondary line-clamp-1 flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-2 text-base leading-6 font-bold text-ellipsis"
            >
                {$t("pages.checkout.login.registerBtnLabel")}
            </a>
        </div>

        <p class="h-1">
            {$t("pages.checkout.login.formDescription")}
        </p>
    </div>

    <form id="login" onsubmit={handleSubmit} class="flex w-full flex-col gap-8">
        <div class="flex max-w-121 flex-initial flex-col items-start gap-5 self-stretch">
            <div class="grid w-full grid-cols-1 gap-4">
                <TextInput
                    type="text"
                    placeholder={$t("pages.checkout.login.form.idPlaceholder")}
                    helperText={$t("pages.checkout.login.form.idHelper")}
                    bind:value={identifier}
                    disabled={isSubmitting}
                    required
                />

                <PasswordInput
                    placeholder={$t("pages.checkout.login.form.passwordPlaceholder")}
                    helperText={$t("pages.checkout.login.form.passwordHelper")}
                    bind:value={password}
                    disabled={isSubmitting}
                    required
                />

                <p>
                    <a
                        href="/password_recovery"
                        class="text-secondary text-sm font-bold underline hover:opacity-80"
                    >
                        {$t("pages.checkout.login.forgotPassword")}
                    </a>
                </p>

                <div class="flex max-w-121 flex-initial flex-col items-start gap-5 self-stretch">
                    <Checkbox
                        id="policies"
                        bind:checked={acceptTerms}
                        disabled={isSubmitting}
                        required
                    >
                        <span>
                            <Thtml
                                key="pages.checkout.login.form.termsCheckbox"
                                vars={{
                                    link: '<a href="/terms" class="text-secondary underline font-bold hover:opacity-80">',
                                    _link: "</a>",
                                }}
                            />
                        </span>
                    </Checkbox>
                </div>
            </div>
        </div>

        <button type="submit" class="hidden" aria-hidden="true"></button>
    </form>

    {#if showErrorToast}
        <Toast floating variant="error" bind:showToast={showErrorToast}>
            {errorMessage}
        </Toast>
    {/if}
</div>
