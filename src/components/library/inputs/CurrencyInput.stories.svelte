<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import CurrencyInput from "./CurrencyInput.svelte";

    const { Story } = defineMeta({
        component: CurrencyInput,
        title: "Library/CurrencyInput",
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
