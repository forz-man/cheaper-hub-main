import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Returns & Refunds | Cheaper",
  description: "Learn how returns and refunds work on the Cheaper marketplace.",
};

const sections = [
  {
    heading: "How returns work",
    content: [
      "Cheaper is a marketplace that connects buyers with independent sellers. Return eligibility, shipping arrangements, and the final refund are handled according to the seller’s product listing and return terms.",
      "Before sending anything back, contact the seller through your order or contact Cheaper at support@cheaper.com. Do not ship a product to a seller until the return has been approved and you have received the correct return instructions.",
    ],
  },
  {
    heading: "When an item may be eligible",
    content: [
      "A return may be available when an item is damaged in transit, materially different from its listing, defective on arrival, or the wrong item was sent. Requests should normally be made within 14 days of delivery unless the product listing or applicable law provides a longer period.",
      "Keep the item, packaging, accessories, and proof of purchase until the request has been reviewed. Photos or other information may be required to help resolve a claim.",
    ],
  },
  {
    heading: "Items that may not be returnable",
    content: [
      "Some products may not be eligible for return because of their nature or condition. The applicable seller terms will control, subject to your rights under applicable law.",
    ],
    list: [
      "Personalized, made-to-order, or customized products.",
      "Perishable, hygiene-sensitive, or sealed products that have been opened.",
      "Digital products or services that have been accessed or delivered.",
      "Products damaged after delivery through misuse, alteration, or improper care.",
      "Items returned without the required parts, accessories, or packaging.",
    ],
  },
  {
    heading: "Refunds",
    content: [
      "Once the seller receives and reviews an approved return, the seller will authorize the applicable refund. Approved refunds are generally sent to the original payment method. Your bank or card provider may need additional time to make the funds available.",
      "Original shipping charges, return shipping, duties, and other fees may be refundable only where the seller’s terms or applicable law requires it. If an item is faulty, incorrect, or materially not as described, contact us so we can help review the issue.",
    ],
  },
  {
    heading: "Missing, damaged, or incorrect deliveries",
    content: [
      "Report visible delivery damage, a missing package, or an incorrect item as soon as possible. Keep the shipping label and packaging, and provide photos where available. Cheaper may request additional information from the seller or delivery provider before a resolution is issued.",
    ],
  },
  {
    heading: "Marketplace support",
    content: [
      "If you cannot reach a seller or believe a listing or order has not been handled fairly, contact Cheaper at support@cheaper.com. We may review the order, request information from the parties, and take action under our marketplace rules.",
    ],
  },
];

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Cheaper support"
      title="Returns & Refunds"
      intro="A straightforward guide to requesting a return, reporting an order issue, and understanding how refunds work when you buy from independent sellers on Cheaper."
      sections={sections}
    />
  );
}