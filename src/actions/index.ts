import { createBanner, deleteBanner } from "./banners";
import { saveBlogPost, setBlogPostPublished } from "./blog";
import { saveFeaturedUsers } from "./featuredUsers";
import { createHomeHero, deleteHomeHero, getHomeHeroData, updateHomeHero } from "./hero";
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
    saveBlogPost,
    setBlogPostPublished,
    createHomeHero,
    deleteHomeHero,
    getHomeHeroData,
    updateHomeHero,
    saveHighlights,
    deleteHighlights,
    saveFeaturedUsers,
    updatePublicProfile,
    updatePersonalProfile,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
    sendReviewAreaComment,
};
