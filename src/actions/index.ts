import { createBanner, deleteBanner } from "./banners";
import { createHomeHero, deleteHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
import { updateProfile } from "./profile";
import {
    sendReviewAreaComment,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
} from "./projectReview";
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
    updateProfile,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
    sendReviewAreaComment,
};
