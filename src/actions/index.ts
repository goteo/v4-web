import { createBanner, deleteBanner } from "./banners";
import { createHomeHero } from "./hero";
import { deleteHighlights, saveHighlights } from "./highlights";
import { payment } from "./payment";
import { register } from "./register";

export const server = {
    register,
    payment,
    createBanner,
    deleteBanner,
    createHomeHero,
    saveHighlights,
    deleteHighlights,
};
