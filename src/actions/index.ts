import { deleteBanner, saveBanner } from "./banners";
import { saveBlogPost, setBlogPostPublished } from "./blog";
import { saveFeaturedUsers } from "./featuredUsers";
import { createHeaderLogo, deleteHeaderLogo, getHeaderLogoData } from "./headerLogo";
import { createHomeHero, deleteHomeHero, getHomeHeroData, updateHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
import { updatePersonalProfile } from "./personalProfile";
import {
    sendReviewAreaComment,
    updateReviewAreaRisk,
    updateReviewProjectStatus,
} from "./projectReview";
import { saveProposedCampaigns } from "./proposedCampaigns";
import { updatePublicProfile } from "./publicProfile";
import { register } from "./register";

export const server = {
    register,
    payment,
    saveBanner,
    deleteBanner,
    saveBlogPost,
    setBlogPostPublished,
    createHomeHero,
    createHeaderLogo,
    deleteHeaderLogo,
    deleteHomeHero,
    getHeaderLogoData,
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
    saveProposedCampaigns,
};
