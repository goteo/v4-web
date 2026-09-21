<script lang="ts">
    import { t } from "../../i18n/store";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";

    let { form: formId }: { form: string } = $props();

    function submit() {
        return new Promise<void>((resolve) => {
            const form = document.getElementById(formId);
            if (!(form instanceof HTMLFormElement) || !(form.noValidate || form.reportValidity()))
                return resolve();

            form.addEventListener("checkout:settled", () => resolve(), { once: true });
            form.requestSubmit();
        });
    }
</script>

<ActionableButton action={submit} autoreset={0} class="w-fit">
    {$t("common.continue")}
</ActionableButton>
