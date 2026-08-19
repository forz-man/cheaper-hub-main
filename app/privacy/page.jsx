import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Privacy Policy | Cheaper",
  description: "Learn how Cheaper collects, uses, and protects personal information.",
};

const sections = [
  {
    heading: "Information we collect",
    content: [
      "We collect information you provide when you create an account, contact us, place an order, list products, or otherwise use Cheaper. This may include your name, email address, phone number, delivery details, account preferences, product listings, and messages.",
      "We also receive information generated through use of the service, such as device information, browser type, approximate location, pages visited, security events, and interactions with the marketplace.",
    ],
  },
  {
    heading: "How we use information",
    content: [
      "We use personal information to provide, maintain, and secure Cheaper; process orders and payments; communicate about accounts and transactions; support buyers and sellers; prevent fraud and abuse; improve the marketplace; and comply with legal obligations.",
      "We may send service and security messages that are necessary to operate your account. Where required, we will ask for consent before sending promotional communications, and you can unsubscribe from those messages at any time.",
    ],
  },
  {
    heading: "When information is shared",
    content: [
      "We share information as needed to operate the marketplace. For example, relevant order and delivery information may be shared with the seller, payment providers, delivery providers, hosting providers, customer-support tools, and other service providers that process information on our behalf.",
      "We may also disclose information when required by law, to protect users and the service, to investigate fraud or security incidents, or as part of a business transfer. We do not sell personal information for money.",
    ],
  },
  {
    heading: "Payments and third parties",
    content: [
      "Payments are processed by third-party payment providers. Cheaper does not store complete payment card numbers. Those providers process information under their own privacy terms and security controls.",
      "Cheaper may link to third-party websites or services. Their practices are governed by their own policies, not this one.",
    ],
  },
  {
    heading: "Your choices and rights",
    content: [
      "Depending on where you live, you may have rights to access, correct, delete, restrict, or receive a copy of your personal information, and to object to or withdraw consent for certain processing. You may also request to unsubscribe from marketing communications.",
      "To make a privacy request, email support@cheaper.com. We may need to verify your identity before completing the request, and some information may be retained when required for legal, security, or transaction-record purposes.",
    ],
  },
  {
    heading: "Security and retention",
    content: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect personal information. No online service can guarantee absolute security.",
      "We retain information for as long as needed to provide the service, complete transactions, resolve disputes, maintain business and security records, and meet legal obligations. Retention periods vary based on the type and purpose of the information.",
    ],
  },
  {
    heading: "Children’s privacy",
    content: [
      "Cheaper is not intended for children who are not legally able to use online marketplaces. We do not knowingly collect personal information from children. If you believe a child has provided information, contact us so we can review and remove it where appropriate.",
    ],
  },
  {
    heading: "Changes to this policy",
    content: [
      "We may update this Privacy Policy when our service, legal obligations, or data practices change. We will update the date above and provide additional notice when required.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Your information"
      title="Privacy Policy"
      intro="This policy explains what information Cheaper collects, why we use it, and the choices available to buyers and sellers using our marketplace."
      sections={sections}
    />
  );
}