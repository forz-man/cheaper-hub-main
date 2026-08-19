import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function PolicyPage({ eyebrow, title, intro, sections }) {
  return (
    <main className="min-h-screen bg-[#faf9f7] px-4 py-16 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-black"
        >
          <ArrowLeft size={15} />
          Back to Cheaper
        </Link>

        <header className="mt-10 border-b border-gray-200 pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
            {eyebrow}
          </p>
          <h1
            className="mt-3 text-4xl font-bold tracking-tight text-black sm:text-5xl"
            style={{ fontFamily: "var(--font-hanken), sans-serif" }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-500">
            {intro}
          </p>
          <p className="mt-5 text-xs font-medium text-gray-400">
            Last updated: August 19, 2026
          </p>
        </header>

        <div className="divide-y divide-gray-200">
          {sections.map((section) => (
            <section key={section.heading} className="py-9 first:pt-10">
              <h2
                className="text-xl font-bold text-black sm:text-2xl"
                style={{ fontFamily: "var(--font-hanken), sans-serif" }}
              >
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
                {section.content.map((paragraph, index) => (
                  <p key={`${section.heading}-${index}`}>{paragraph}</p>
                ))}
              </div>
              {section.list && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-600 sm:text-base">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-1 shrink-0 text-black" />
            <div>
              <h2 className="font-bold text-black">Questions about this policy?</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Contact us at{" "}
                <a
                  href="mailto:support@cheaper.com"
                  className="font-semibold text-black underline underline-offset-2"
                >
                  support@cheaper.com
                </a>{" "}
                or call{" "}
                <a
                  href="tel:+12012943738"
                  className="font-semibold text-black underline underline-offset-2"
                >
                  +1 201 294 3738
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}