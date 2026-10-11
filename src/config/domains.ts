/** Existing self-site links and shared cookie scope; storefront identity comes from the backend Host. */
const mainDomain = window.location.hostname.split('.').slice(-2).join('.');

export const domainConfig = {
    mainDomain,
    cookieDomain: `.${mainDomain}`,
};
