import { ADMIN_SECTIONS } from "../../../../components/admin/adminSections";

export const SUBSECTIONS = ADMIN_SECTIONS.find(
    (section) => section.href === "/admin/comm",
)!.subSections!.map((subSection) => ({
    label: subSection.labelKey,
    href: subSection.href,
}));
