<script lang="ts">
    import { t } from "../../../../i18n/store";
    import { apiUsersGetCollection, type User } from "../../../../openapi/client";
    import { debounce } from "../../../../utils/debounce";
    import { highlightMatch } from "../../../../utils/highlights";
    import CloseIcon from "../../../icons/navigation/Close.svelte";
    import Spinner from "../../../icons/status/Spinner.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import PasswordInput from "../../../library/inputs/PasswordInput.svelte";
    import RadioButton from "../../../library/inputs/RadioButton.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";

    import type { CreateChargeForm, DonorType } from "../../../../types/admin-charge";

    let { form = $bindable() }: { form: CreateChargeForm } = $props();

    let searchError = $state<string | undefined>(undefined);

    const emailRegex = /^[^@].*@.*\.[a-zA-Z]+$/;

    let results = $state<User[]>([]);
    let searching = $state(false);
    let searched = $state(false);
    let showCreateForm = $state(false);

    async function searchUsers() {
        const trimmed = form.user.email.trim();
        if (!trimmed || !emailRegex.test(trimmed)) {
            results = [];
            searched = false;
            return;
        }
        searching = true;
        try {
            const { data, error } = await apiUsersGetCollection({
                baseUrl: "/api/relay",
                query: { email: trimmed, itemsPerPage: 10 },
            });
            if (error) {
                console.error("User search failed:", error);
                searchError = $t("pages.admin.charges.create.fields.userSearchError");
                results = [];
            } else {
                results = (data ?? []) as User[];
                searched = true;
                searchError = undefined;
                showCreateForm = results.length === 0;
            }
        } finally {
            searching = false;
        }
    }

    const debouncedSearch = debounce(searchUsers, 400);

    function onEmailInput() {
        debouncedSearch.cancel();
        if (form.existingUser) {
            form.existingUser = null;
        }
        results = [];
        searched = false;
        showCreateForm = false;
        searchError = undefined;

        const trimmed = form.user.email.trim();
        if (trimmed.length >= 3 && emailRegex.test(trimmed)) {
            debouncedSearch();
        }
    }

    function selectUser(u: User) {
        if (!u.accounting) {
            searchError = $t("pages.admin.charges.create.fields.userNoAccounting");
            return;
        }
        form.existingUser = {
            id: String(u.id ?? ""),
            handle: u.handle,
            email: u.email,
            displayName: u.displayName,
            type: (u.type ?? "individual") as DonorType,
            accounting: u.accounting,
        };
        form.user.type = (u.type ?? "individual") as DonorType;
        form.user.email = u.email;
        results = [];
        searched = false;
        showCreateForm = false;
    }

    function clearSelection() {
        form.existingUser = null;
    }

    function enableCreateForm() {
        showCreateForm = true;
    }

    function cancelCreateForm() {
        showCreateForm = false;
        form.user.password = "";
    }

    function generatePassword() {
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijklmnopqrstuvwxyz";
        const digits = "0123456789";
        const special = "!@#$%&*";
        const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
        const all = upper + lower + digits + special;
        const length = 14;
        let out = pick(upper) + pick(lower) + pick(digits) + pick(special);
        for (let i = out.length; i < length; i++) out += pick(all);
        form.user.password = out
            .split("")
            .sort(() => Math.random() - 0.5)
            .join("");
    }

    export function validate(): boolean {
        if (form.existingUser) return true;
        return Boolean(
            showCreateForm &&
            form.user.type &&
            form.user.email &&
            emailRegex.test(form.user.email) &&
            form.user.password.length >= 8,
        );
    }
</script>

<div class="flex flex-col gap-6">
    <div class="relative">
        <TextInput
            type="email"
            bind:value={form.user.email}
            labelText={$t("domain.users.attributes.email")}
            required={true}
            error={searchError}
            onInput={onEmailInput}
            placeholder={$t("pages.admin.charges.create.fields.emailSearchPlaceholder")}
            disabled={form.existingUser !== null}
        />
        {#if form.existingUser}
            <button
                type="button"
                class="text-tertiary hover:text-secondary absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-sm underline"
                onclick={clearSelection}
            >
                {$t("pages.admin.charges.create.actions.changeUser")}
            </button>
        {/if}
    </div>

    {#if searching}
        <div class="flex justify-center py-2">
            <Spinner />
        </div>
    {:else if form.existingUser}
        <div class="border-primary bg-purple-soft/30 flex flex-col gap-3 rounded-lg border p-4">
            <p class="text-content text-xs font-bold tracking-wide uppercase">
                {$t("pages.admin.charges.create.fields.selectedUserLabel")}
            </p>
            <div class="flex flex-col gap-1">
                <p class="text-secondary text-lg font-bold">
                    {form.existingUser.displayName ?? form.existingUser.handle}
                </p>
                <p class="text-content text-sm">@{form.existingUser.handle}</p>
                <p class="text-content text-sm">{form.existingUser.email}</p>
                <p class="text-content text-sm">
                    {$t("pages.admin.charges.create.fields.userTypeLabel")}
                    {$t(
                        form.existingUser.type === "organization"
                            ? "domain.users.type.organization"
                            : "domain.users.type.individual",
                    )}
                </p>
                <p class="text-content text-xs">
                    ID: {form.existingUser.id}
                </p>
            </div>
        </div>
    {:else if searched && results.length > 0}
        <div class="flex flex-col gap-2">
            <p class="text-content text-sm font-bold">
                {$t("pages.admin.charges.create.fields.userSearchResults")}
                <span class="text-gray-500">({results.length})</span>
            </p>
            {#each results as u (u.id)}
                <button
                    type="button"
                    onclick={() => selectUser(u)}
                    class="border-secondary hover:bg-purple-soft/30 cursor-pointer rounded-lg border bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                >
                    <div class="text-secondary text-base font-bold">
                        {@html highlightMatch(
                            u.displayName ?? u.handle ?? u.email,
                            form.user.email,
                        )}
                    </div>
                    <div class="text-content mt-1 text-sm">
                        {u.email}
                    </div>
                    <div class="text-content mt-1 flex flex-wrap gap-2 text-xs">
                        <span class="rounded-full bg-gray-100 px-2 py-0.5">
                            @{u.handle}
                        </span>
                        <span class="rounded-full bg-gray-100 px-2 py-0.5">
                            {$t(
                                u.type === "organization"
                                    ? "domain.users.type.organization"
                                    : "domain.users.type.individual",
                            )}
                        </span>
                        {#if u.roles}
                            {#each u.roles as role}
                                <span class="rounded-full bg-gray-100 px-2 py-0.5">
                                    {role}
                                </span>
                            {/each}
                        {/if}
                    </div>
                </button>
            {/each}
            <div class="mt-2 flex justify-end">
                <Button kind="ghost" size="sm" onclick={enableCreateForm}>
                    {$t("pages.admin.charges.create.fields.createNewUserInstead")}
                </Button>
            </div>
        </div>
    {:else if searched && results.length === 0}
        <div
            class="flex flex-col gap-3 rounded-lg border border-dashed border-gray-400 bg-gray-100 p-4 text-center"
        >
            <p class="text-content text-sm">
                {$t("pages.admin.charges.create.fields.noUserFound")}
            </p>
            {#if !showCreateForm}
                <Button kind="primary" size="sm" onclick={enableCreateForm}>
                    {$t("pages.admin.charges.create.fields.createUserWithEmail")}
                </Button>
            {/if}
        </div>
    {/if}

    {#if showCreateForm && !form.existingUser}
        <div class="border-secondary bg-purple-soft/20 flex flex-col gap-6 rounded-lg border p-4">
            <div class="flex items-center justify-between">
                <p class="text-content text-xs font-bold tracking-wide uppercase">
                    {$t("pages.admin.charges.create.fields.newUserLabel")}
                </p>
                <button
                    type="button"
                    class="text-tertiary hover:text-secondary cursor-pointer text-xs underline"
                    onclick={cancelCreateForm}
                >
                    <span class="flex items-center gap-1">
                        <CloseIcon class="h-3 w-3" />
                        {$t("common.cancel")}
                    </span>
                </button>
            </div>

            <fieldset class="flex gap-6">
                <RadioButton
                    name="donorType"
                    value="individual"
                    bind:group={form.user.type}
                    label={$t("domain.users.type.individual")}
                />
                <RadioButton
                    name="donorType"
                    value="organization"
                    bind:group={form.user.type}
                    label={$t("domain.users.type.organization")}
                />
            </fieldset>

            <div class="flex items-start gap-2">
                <div class="flex-1">
                    <PasswordInput
                        bind:value={form.user.password}
                        labelText={$t("domain.users.attributes.password")}
                        required={true}
                    />
                </div>
                <Button
                    kind="ghost"
                    size="sm"
                    class="mt-1 whitespace-nowrap"
                    onclick={generatePassword}
                >
                    {$t("pages.admin.charges.create.fields.generatePassword")}
                </Button>
            </div>
        </div>
    {/if}
</div>
