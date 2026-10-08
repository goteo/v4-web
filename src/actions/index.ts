import { createBanner, deleteBanner } from "./banners";
import { createHomeHero, deleteHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
import { updatePersonalProfile } from "./personalProfile";
import {
    sendReviewAreaComment,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
} from "./projectReview";
import { updatePublicProfile } from "./publicProfile";
import { register } from "./register";

export const server = {
    register,
    payment,
    createBanner,
    deleteBanner,
    createHomeHero,
    deleteHomeHero,
    saveHighlights,
    deleteHighlights,
    updatePublicProfile,
    updatePersonalProfile,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
    sendReviewAreaComment,
};
