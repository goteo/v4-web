<script module lang="ts">
    import type { OwnerInfoForm } from "../../../validation/ownerInfoValidation";

    /** Owner info forms by project id, kept in memory only for as long as the page lives. */
    const forms = new Map<number | undefined, OwnerInfoForm>();
</script>

<script lang="ts">
    import { locale, t } from "../../../i18n/store";
    import { getDefaultCountry } from "../../../utils/consts";
    import { getCountries } from "../../../utils/countries";
    import { useFormDraft, restoreFields } from "../../../utils/forms/useFormDraft.svelte";
    import { zOwnerInfoForm } from "../../../validation/ownerInfoValidation";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import FileUpload from "../../library/inputs/FileUpload.svelte";
    import RadioButton from "../../library/inputs/RadioButton.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import TerritoryInput from "../../library/inputs/TerritoryInput.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import ToggleSwitch from "../../library/inputs/ToggleSwitch.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";
    import type { z } from "zod";

    let { draft, onPublish }: { draft: ProjectDraftStore; onPublish?: () => void } = $props();

    type FieldName = keyof typeof zOwnerInfoForm.shape;

    const projectId = $draft.actual.id;

    /**
     * None of these fields are part of the project draft, so the step is the only place that
     * holds them. The cached form outlives the remount caused by switching steps or the
     * project's language; a UI language switch is a full navigation and goes through
     * `useFormDraft` instead.
     */
    const cached = forms.get(projectId);

    let form = $state<OwnerInfoForm>(
        cached ?? {
            legalEntityType: "individual",
            name: "",
            taxId: "",
            taxIdCountry: getDefaultCountry(),
            contacts: [
                { id: crypto.randomUUID(), type: "email", value: "", preferred: true },
                { id: crypto.randomUUID(), type: "phone", value: "", preferred: false },
            ],
            iban: "",
            bankCertificate: [],
            termsAccepted: false,
        },
    );

    forms.set(projectId, form);

    /**
     * The tax id, the IBAN and the bank certificate are left out on purpose: they are
     * sensitive, and the visitor can type them again.
     */
    const { restored } = useFormDraft(`project-owner-info-${projectId}`, () => ({
        legalEntityType: form.legalEntityType,
        name: form.name,
        taxIdCountry: form.taxIdCountry,
        contacts: form.contacts,
        termsAccepted: form.termsAccepted,
    }));

    if (!cached) {
        restoreFields(form, restored, [
            "legalEntityType",
            "name",
            "taxIdCountry",
            "contacts",
            "termsAccepted",
        ]);
    }

    let validation = $state<Partial<Record<FieldName, z.core.$ZodIssue[]>>>({});

    let preferredIndex = $derived(form.contacts.findIndex((c) => c.preferred));

    let countries = $derived(getCountries($locale));

    function validate(field: FieldName) {
        // taxId validity depends on country and legal entity type, so it is checked by the schema refinement
        if (field === "taxId") {
            const result = zOwnerInfoForm.safeParse(form);

            validation.taxId = result.error?.issues.filter((issue) => issue.path[0] === "taxId");
            return;
        }

        const result = zOwnerInfoForm.shape[field].safeParse(form[field]);

        validation[field] = result.error?.issues;
    }

    /** A country or legal entity change only rechecks a tax id that was already checked. */
    function revalidateTaxId() {
        if (validation.taxId) {
            validate("taxId");
        }
    }

    function getValidationMessage(field: FieldName): string | undefined {
        const issue = validation[field]?.[0];

        return issue && $t(issue.message);
    }

    function getContactError(index: number): string | undefined {
        const issue = validation.contacts?.find((issue) => issue.path[0] === index);

        return issue && $t(issue.message);
    }

    function setPreferred(index: number) {
        form.contacts = form.contacts.map((c, i) => ({ ...c, preferred: i === index }));
        validate("contacts");
    }

    function addContact() {
        form.contacts.push({ id: crypto.randomUUID(), type: "text", value: "", preferred: false });
    }

    function deleteContact(index: number) {
        const [removed] = form.contacts.splice(index, 1);

        if (removed?.preferred && form.contacts[0]) {
            form.contacts[0].preferred = true;
        }

        validate("contacts");
    }

    function handleContinue() {
        const result = zOwnerInfoForm.safeParse(form);

        validation = {};

        if (result.success) {
            onPublish?.();
            return;
        }

        for (const issue of result.error.issues) {
            const field = issue.path[0] as FieldName;
            const rest = { ...issue, path: issue.path.slice(1) };

            validation[field] = [...(validation[field] ?? []), rest];
        }
    }
</script>

<div class="w-1/2">
    <div class="flex flex-col gap-10">
        <!-- Header -->
        <div class="space-y-4">
            <Title level={1} variant="headline">
                {$t("pages.project.edit.aboutYou.title")}
            </Title>
            <p class="text-content text-base">{$t("pages.project.edit.aboutYou.subtitle")}</p>
        </div>

        <!-- Pre-fill from profile
        <div class="flex flex-col gap-2">
            <Select bind:value={prefill} name="prefill">
                <option value="">{$t("pages.project.edit.aboutYou.prefill")}</option>
            </Select>
        </div>
        -->

        <!-- Legal Entity -->
        <div class="flex flex-col gap-3">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.aboutYou.legalEntity")}
            </Title>
            <p class="text-content text-base">
                {$t("pages.project.edit.aboutYou.legalEntityHelper")}
            </p>
            <ToggleSwitch
                bind:value={form.legalEntityType}
                onchange={revalidateTaxId}
                options={[
                    { value: "individual", label: $t("pages.project.edit.aboutYou.individual") },
                    {
                        value: "organization",
                        label: $t("pages.project.edit.aboutYou.organization"),
                    },
                ]}
            />
        </div>

        <!-- Name -->
        <div class="flex flex-col gap-2">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.aboutYou.name")}
            </Title>
            <p class="text-content text-base">{$t("pages.project.edit.aboutYou.nameHelper")}</p>
            <TextInput
                bind:value={form.name}
                placeholder={$t("pages.project.edit.aboutYou.namePlaceholder")}
                name="name"
                error={getValidationMessage("name")}
                onInput={() => validate("name")}
            />
        </div>

        <!-- NIF -->
        <div class="flex flex-col gap-2">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.aboutYou.taxId")}
            </Title>
            <p class="text-content text-base">{$t("pages.project.edit.aboutYou.taxIdHelper")}</p>
            <Select
                name="taxIdCountry"
                bind:value={form.taxIdCountry}
                labelText={$t("pages.project.edit.aboutYou.taxIdCountry")}
                helperText={$t("pages.project.edit.aboutYou.taxIdCountryHelper")}
                onChange={revalidateTaxId}
            >
                {#each countries as { code, name } (code)}
                    <option value={code}>{name}</option>
                {/each}
            </Select>
            <TextInput
                bind:value={form.taxId}
                placeholder={$t("pages.project.edit.aboutYou.taxIdPlaceholder")}
                name="taxId"
                error={getValidationMessage("taxId")}
                onInput={() => validate("taxId")}
            />
        </div>

        <!-- Location/Territory -->
        <div class="flex flex-col gap-2">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.aboutYou.location")}
            </Title>
            <p class="text-content text-base">{$t("pages.project.edit.aboutYou.locationHelper")}</p>
            <TerritoryInput
                placeholder={$t("pages.project.edit.aboutYou.locationPlaceholder")}
                value={$draft.latest.territory?.address ?? ""}
                onInput={(territory) => {
                    draft.patch({ territory });
                }}
            />
        </div>

        <!-- Team description
        <div class="flex flex-col gap-2">
            <h2 class="text-2xl font-bold text-black">
                {$t("pages.project.edit.aboutYou.teamDescription")}
            </h2>
            <p class="text-content text-base">
                {$t("pages.project.edit.aboutYou.teamDescriptionHelper")}
            </p>
            <TextArea
                id="team-description"
                bind:value={teamDescription}
                placeholder={$t("pages.project.edit.aboutYou.teamDescriptionPlaceholder")}
                rows={5}
            />
        </div>
        -->

        <!-- Private contacts data -->
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <Title level={2} variant="subsection">
                    {$t("pages.project.edit.aboutYou.privateContacts")}
                </Title>
                <p class="text-content text-base">
                    {$t("pages.project.edit.aboutYou.privateContactsHelper")}
                </p>
            </div>
            <div class="flex flex-col gap-3">
                {#each form.contacts as contact, i (contact.id)}
                    <div class="flex items-center gap-3">
                        <div class="flex-1">
                            <TextInput
                                bind:value={contact.value}
                                type={contact.type === "email"
                                    ? "email"
                                    : contact.type === "phone"
                                      ? "tel"
                                      : "text"}
                                placeholder={contact.type === "email"
                                    ? $t("pages.project.edit.aboutYou.email")
                                    : contact.type === "phone"
                                      ? $t("pages.project.edit.aboutYou.phone")
                                      : $t("common.textPlaceholder")}
                                name={`contact-${i}`}
                                error={getContactError(i)}
                                onInput={() => validate("contacts")}
                            />
                        </div>
                        <RadioButton
                            group={preferredIndex}
                            value={i}
                            label={$t("pages.project.edit.aboutYou.preferred")}
                            onchange={() => setPreferred(i)}
                        />
                        {#if contact.type !== "email"}
                            <button
                                type="button"
                                class="text-tertiary shrink-0 hover:opacity-75"
                                onclick={() => deleteContact(i)}
                                aria-label={$t("common.delete")}
                            >
                                <Close class="size-5" />
                            </button>
                        {/if}
                    </div>
                {/each}
                <button
                    type="button"
                    class="text-secondary w-fit text-sm font-medium underline"
                    onclick={addContact}
                >
                    + {$t("pages.project.edit.aboutYou.addContact")}
                </button>
            </div>
        </div>

        <!-- Public contacts data
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <h2 class="text-2xl font-bold text-black">
                    {$t("pages.project.edit.aboutYou.publicContacts")}
                </h2>
                <p class="text-content text-base">
                    {$t("pages.project.edit.aboutYou.publicContactsHelper")}
                </p>
            </div>
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                    <Web class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.website}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.website")}
                            name="link-website"
                            type="url"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Gmail class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.email}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.email")}
                            name="link-email"
                            type="email"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Instagram class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.instagram}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.instagram")}
                            name="link-instagram"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Facebook class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.facebook}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.facebook")}
                            name="link-facebook"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <X class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.twitter}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.twitter")}
                            name="link-twitter"
                        />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Linkedin class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={publicLinks.linkedin}
                            placeholder={$t("pages.project.edit.aboutYou.placeholders.linkedin")}
                            name="link-linkedin"
                        />
                    </div>
                </div>
            </div>
        </div>
        -->

        <!-- Payment Data -->
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <Title level={2} variant="subsection">
                    {$t("pages.project.edit.aboutYou.paymentData.title")}
                </Title>
                <p class="text-content text-base">
                    {$t("pages.project.edit.aboutYou.paymentData.subtitle")}
                </p>
            </div>
            <div class="flex flex-col gap-3">
                <TextInput
                    bind:value={form.iban}
                    labelText={$t("pages.project.edit.aboutYou.paymentData.iban")}
                    helperText={$t("pages.project.edit.aboutYou.paymentData.ibanHelper")}
                    placeholder={$t("pages.project.edit.aboutYou.paymentData.ibanPlaceholder")}
                    name="iban"
                    error={getValidationMessage("iban")}
                    onInput={() => validate("iban")}
                />
                <div class="flex flex-col gap-2">
                    <p class="text-base font-bold text-black">
                        {$t("pages.project.edit.aboutYou.paymentData.bankCertificate")}
                    </p>
                    <p class="text-content text-base">
                        {$t("pages.project.edit.aboutYou.paymentData.bankCertificateHelper")}
                    </p>
                    <FileUpload
                        bind:files={form.bankCertificate}
                        onUpload={() => validate("bankCertificate")}
                        error={getValidationMessage("bankCertificate")}
                        accept={["application/pdf", "image/jpeg", "image/png"]}
                        maxSizeMB={10}
                        ariaLabel={$t(
                            "pages.project.edit.aboutYou.paymentData.bankCertificateAriaLabel",
                        )}
                    />
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-2">
            <Checkbox bind:checked={form.termsAccepted}>
                <span class="text-secondary">
                    <a href="/src/pages/[...locale]/about/legal/terms" class="underline"
                        >{$t("pages.project.create.terms.label")}</a
                    >
                </span>
            </Checkbox>
            {#if !form.termsAccepted && validation.termsAccepted}
                <p class="text-tertiary text-sm">{getValidationMessage("termsAccepted")}</p>
            {/if}
        </div>

        <div class="mt-10 flex">
            <Button
                kind="primary"
                size="md"
                class="min-w-50 disabled:pointer-events-none disabled:opacity-24"
                onclick={handleContinue}
            >
                {$t("pages.project.edit.aboutYou.continue")}
            </Button>
        </div>
    </div>
</div>
