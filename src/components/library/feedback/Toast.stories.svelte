<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import Toast from "./Toast.svelte";

    const { Story } = defineMeta({
        component: Toast,
        title: "Library/Toast",
        tags: ["autodocs"],
        args: {
            showToast: true,
            variant: "error",
        },
        argTypes: {
            variant: {
                control: "select",
                options: ["error", "success", "notification", "warning"],
            },
            showToast: { control: "boolean" },
        },
    });
</script>

<Story name="Error" args={{ variant: "error" }}>An error occurred. Please try again.</Story>

<Story name="Success" args={{ variant: "success" }}
    >Your changes have been saved successfully.</Story
>

<Story name="Notification" args={{ variant: "notification" }}
    >You have a new message from the campaign owner.</Story
>

<Story name="Warning" args={{ variant: "warning" }}>Your session will expire in 5 minutes.</Story>

<Story name="Floating" args={{ variant: "success", floating: true }}
    >Floating toast anchored to the bottom-right of the viewport.</Story
>
