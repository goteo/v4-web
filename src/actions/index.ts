import { createBanner, deleteBanner } from "./banners";
import { saveFeaturedUsers } from "./featuredUsers";
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
    createHomeHero,
    deleteHomeHero,
    saveHighlights,
    deleteHighlights,
    saveFeaturedUsers,
    updateProfile,
};
