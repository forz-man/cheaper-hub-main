import { notFound } from "next/navigation";
import { getJobBySlug, getAllJobSlugs, getAllJobs } from "@/lib/careers-data";
import JobDetailsClient from "./JobDetailsClient";

export async function generateStaticParams() {
  const slugs = getAllJobSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const job = getJobBySlug(slug);

  if (!job) {
    return {
      title: "Job Not Found | Careers | Cheaper Hub",
      description: "The requested job opening could not be found.",
    };
  }

  const title = `${job.title} | Careers | Cheaper Hub`;
  const description = job.summary || job.role;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/careers/${job.slug}`,
      siteName: "Cheaper Hub",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function JobDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const job = getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const otherJobs = getAllJobs().filter((j) => j.slug !== job.slug);

  return <JobDetailsClient job={job} otherJobs={otherJobs} />;
}
