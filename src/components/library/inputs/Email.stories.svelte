<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import Email from "./Email.svelte";

    const { Story } = defineMeta({
        component: Email,
        title: "Library/Email",
        tags: ["autodocs"],
        args: {
            placeholder: "email@example.com",
            error: "Invalid email address",
        },
        argTypes: {
            validate: { control: "boolean" },
        },
    });
</script>

<Story name="Default" />

<Story name="WithLabel" args={{ label: "Email address" }} />

<Story name="WithValue" args={{ value: "user@example.com" }} />

<Story name="Invalid" args={{ value: "notanemail", isValid: false }} />

<Story name="NoValidation" args={{ validate: false, placeholder: "Enter email" }} />
