import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Terms of Service | Cheaper",
  description: "Read the terms that apply when you use the Cheaper marketplace.",
};

const sections = [
  {
    heading: "Using Cheaper",
    content: [
      "These Terms of Service govern your access to and use of Cheaper, including our website, accounts, marketplace, messaging, checkout, and related services. By using Cheaper, you agree to these Terms and any policies referenced here.",
      "You must provide accurate information, keep your account secure, and use the service only for lawful purposes. You are responsible for activity that occurs through your account.",
    ],
  },
  {
    heading: "The marketplace relationship",
    content: [
      "Cheaper provides the technology and marketplace that connects buyers and independent sellers. Unless a listing clearly states otherwise, the seller—not Cheaper—is responsible for the product, its description, availability, quality, fulfillment, warranties, and return terms.",
      "A seller’s listing should contain the important product, price, shipping, and return information. Buyers should review those details before placing an order and contact support if information is missing or misleading.",
    ],
  },
  {
    heading: "Accounts and eligibility",
    content: [
      "You may need an account to buy, sell, message, or access certain features. You must be legally able to enter into a contract where you live, and you may not create an account for another person without permission.",
      "We may suspend or close accounts, remove listings, or restrict activity when we reasonably believe there is fraud, abuse, a security risk, a policy violation, or a legal requirement.",
    ],
  },
  {
    heading: "Orders, prices, and payments",
    content: [
      "Product prices and availability are supplied by sellers and may change. Placing an order creates a request to purchase; an order may be declined, cancelled, or corrected where a product is unavailable, incorrectly priced, or affected by a technical or payment issue.",
      "Payments are processed through our third-party payment provider. You authorize the applicable charge when you complete checkout. Taxes, shipping costs, duties, and other charges will be shown where available and may depend on the order destination.",
    ],
  },
  {
    heading: "Returns, refunds, and disputes",
    content: [
      "Returns and refunds are governed by the seller’s listing terms, our Returns & Refunds Policy, and applicable law. If an order is damaged, incorrect, missing, or materially different from its description, report it promptly through support@cheaper.com.",
      "We may help facilitate communication or review a marketplace dispute, but we are not the manufacturer, importer, carrier, or seller of products listed by independent vendors.",
    ],
  },
  {
    heading: "Seller responsibilities",
    content: [
      "Sellers must have the right to list and sell their products, provide accurate descriptions and images, honor accepted orders, comply with applicable laws, and handle customer and return obligations described in their listings.",
      "Sellers may not list counterfeit, stolen, unsafe, illegal, recalled, infringing, or otherwise prohibited products. Cheaper may remove listings or suspend selling privileges when necessary.",
    ],
  },
  {
    heading: "Acceptable use",
    content: [
      "You may not interfere with the service, bypass security or access controls, scrape or harvest data without permission, upload malicious code, impersonate another person, manipulate reviews, use another user’s account, or use Cheaper to commit fraud or violate the law.",
    ],
  },
  {
    heading: "Content and feedback",
    content: [
      "You retain ownership of content you submit, but you give Cheaper permission to host, display, reproduce, and use it as needed to operate, promote, and improve the service. You are responsible for having the rights needed to submit that content.",
      "Reviews, messages, listings, and other content must be accurate, relevant, respectful, and lawful. We may remove content that violates these Terms or creates risk for users or the service.",
    ],
  },
  {
    heading: "Disclaimers and liability",
    content: [
      "Cheaper is provided on an available basis. To the extent permitted by law, we do not guarantee uninterrupted service, the accuracy of every listing, the conduct of every user, or the quality, safety, legality, or availability of seller products.",
      "To the extent permitted by applicable law, Cheaper will not be responsible for indirect, incidental, special, consequential, or punitive losses arising from use of the service or a transaction between a buyer and seller. Nothing in these Terms limits rights that cannot legally be limited.",
    ],
  },
  {
    heading: "Changes and contact",
    content: [
      "We may update these Terms as the service or legal requirements change. Continued use after an update means you accept the revised Terms where permitted by law.",
      "Questions about these Terms can be sent to support@cheaper.com or +1 201 294 3738.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="The rules of Cheaper"
      title="Terms of Service"
      intro="These terms set out the rules for using Cheaper as a buyer, seller, or visitor and explain how our multi-vendor marketplace works."
      sections={sections}
    />
  );
}