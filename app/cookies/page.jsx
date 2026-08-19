import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Cookie Policy | Cheaper",
  description: "Learn how Cheaper uses cookies and similar technologies.",
};

const sections = [
  {
    heading: "What cookies are",
    content: [
      "Cookies are small text files saved on your browser or device. Similar technologies, such as local storage and pixels, can serve comparable purposes. They help websites remember information, keep sessions secure, and understand how services are used.",
    ],
  },
  {
    heading: "How Cheaper uses cookies",
    content: [
      "Cheaper uses essential cookies and similar technologies needed to provide account access, authentication, security, shopping and checkout functionality, preferences, and basic site operation.",
      "We may use optional analytics or performance technologies to understand site usage and improve the marketplace. These technologies will be used only where enabled and subject to the choices and notices required by applicable law.",
    ],
  },
  {
    heading: "Cookie categories",
    list: [
      "Strictly necessary: Support login sessions, security, fraud prevention, checkout, and core site functionality.",
      "Preferences: Remember choices such as settings or display preferences so the site works consistently.",
      "Analytics and performance: Help us understand traffic and feature usage so we can improve Cheaper, where these tools are enabled.",
      "Marketing: Used for relevant communications or advertising only where enabled and permitted by applicable law.",
    ],
    content: [],
  },
  {
    heading: "Your choices",
    content: [
      "You can manage or delete cookies through your browser settings. Blocking essential cookies may prevent sign-in, checkout, or other parts of Cheaper from working correctly.",
      "Where applicable, Cheaper will provide additional controls for optional cookies. Your browser may also send privacy preference signals, which we will handle as required by applicable law.",
    ],
  },
  {
    heading: "Third-party services",
    content: [
      "Some services used to operate Cheaper, such as authentication, payments, hosting, security, and embedded content, may set their own cookies or use similar technologies. Those services are governed by their own privacy policies and settings.",
    ],
  },
  {
    heading: "Updates",
    content: [
      "We may update this Cookie Policy when our technology, service providers, or legal obligations change. The date at the top of this page shows when it was last updated.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <PolicyPage
      eyebrow="How the site works"
      title="Cookie Policy"
      intro="This policy explains how Cheaper uses cookies and similar technologies to keep accounts secure, support checkout, remember preferences, and improve the marketplace."
      sections={sections}
    />
  );
}