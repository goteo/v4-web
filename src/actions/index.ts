import { createBanner, deleteBanner } from "./banners";
import { saveBlogPost, setBlogPostPublished } from "./blog";
import { createHomeHero, deleteHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
import { updateProfile } from "./profile";
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
    saveHighlights,
    deleteHighlights,
    updateProfile,
};
