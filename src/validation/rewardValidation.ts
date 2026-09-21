import {
    zApiProjectRewardsIdPatchBody,
    zApiProjectRewardsPostBody,
} from "../openapi/client/zod.gen";

export const zCreateRewardForm = zApiProjectRewardsPostBody.superRefine((data, ctx) => {
    if (data.title.length < 1) {
        ctx.addIssue({
            code: "custom",
            path: ["title"],
            message: "system.validation.requiredField",
        });
    }

    if (!data.description || data.description?.length < 1) {
        ctx.addIssue({
            code: "custom",
            path: ["description"],
            message: "system.validation.requiredField",
        });
    }
});

export const zUpdateRewardForm = zApiProjectRewardsIdPatchBody.omit({
    dateCreated: true,
    dateUpdated: true,
});
