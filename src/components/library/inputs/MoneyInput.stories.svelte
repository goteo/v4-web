<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import MoneyInput from "./MoneyInput.svelte";

    const { Story } = defineMeta({
        component: MoneyInput,
        title: "Library/MoneyInput",
        tags: ["autodocs"],
        args: {
            amount: 0,
            currency: "EUR",
        },
        argTypes: {
            disabled: { control: "boolean" },
            required: { control: "boolean" },
        },
    });
</script>

<Story name="Default" />

<Story name="WithLabel" args={{ labelText: "Price" }} />

<Story name="WithHelperText" args={{ labelText: "Price", helperText: "Enter a value" }} />

<Story name="WithError" args={{ labelText: "Price", error: "Price is required" }} />

<Story name="Disabled" args={{ labelText: "Price", disabled: true }} />
