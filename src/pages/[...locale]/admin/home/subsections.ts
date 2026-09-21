import { ADMIN_SECTIONS } from "../../../../components/admin/adminSections";

export const SUBSECTIONS = ADMIN_SECTIONS.find(
    (section) => section.href === "/admin/home",
)!.subSections!.map((subSection) => ({
    label: subSection.labelKey,
    href: subSection.href,
}));
