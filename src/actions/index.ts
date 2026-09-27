import { createBanner, deleteBanner } from "./banners";
import { createHomeHero, deleteHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
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
};
