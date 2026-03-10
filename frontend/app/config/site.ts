export const siteConfig = {
    name: process.env.NEXT_PUBLIC_APP_NAME || "blockscodeX",
    domain: process.env.NEXT_PUBLIC_APP_DOMAIN || "blockscodex.com",
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Learn to code with blockscodeX",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://blockscodex.com",
    company: process.env.NEXT_PUBLIC_COMPANY_NAME || "blockscodeX",
    contactFormName: process.env.NEXT_PUBLIC_CONTACT_FORM_NAME || "blockscodeX Contact Form",
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@blockscodex.com",
    adminUserOrgFallback: process.env.NEXT_PUBLIC_ADMIN_USER_ORG_FALLBACK || "blockscodeX (Global)",
    adminSettingsOrgName: process.env.NEXT_PUBLIC_ADMIN_SETTINGS_ORG_NAME || "blockscodeX",
    logo: process.env.NEXT_PUBLIC_APP_LOGO || "/logo.png",
    links: {
        github: "https://github.com/blockscodeX",
    },
};

export type SiteConfig = typeof siteConfig;
