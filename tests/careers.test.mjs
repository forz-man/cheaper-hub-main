import test from "node:test";
import assert from "node:assert/strict";
import { JOBS_DATA, CATEGORIES, getAllJobs, getJobBySlug, getAllJobSlugs } from "../lib/careers-data.js";

test("Careers Data Integrity", () => {
  const jobs = getAllJobs();
  assert.ok(jobs.length >= 8, `Expected at least 8 jobs, found ${jobs.length}`);

  const slugs = getAllJobSlugs();
  assert.ok(slugs.includes("devops-intern"), "Should include devops-intern");
  assert.ok(slugs.includes("full-stack-intern"), "Should include full-stack-intern");

  // Check required fields for all jobs
  for (const job of jobs) {
    assert.ok(job.id, `Job ${job.title} is missing id`);
    assert.ok(job.slug, `Job ${job.title} is missing slug`);
    assert.ok(job.title, `Job ${job.slug} is missing title`);
    assert.ok(job.category, `Job ${job.slug} is missing category`);
    assert.ok(job.location, `Job ${job.slug} is missing location`);
    assert.ok(job.type, `Job ${job.slug} is missing type`);
    assert.ok(job.role, `Job ${job.slug} is missing role`);
    assert.ok(job.requirements, `Job ${job.slug} is missing requirements`);
    assert.ok(job.email, `Job ${job.slug} is missing email`);
  }
});

test("Careers Slug Lookup", () => {
  const devops = getJobBySlug("devops-intern");
  assert.ok(devops, "Should find devops-intern");
  assert.match(devops.title, /DevOps/i);

  const fullstack = getJobBySlug("full-stack-intern");
  assert.ok(fullstack, "Should find full-stack-intern");
  assert.match(fullstack.title, /Full Stack/i);

  const nonexistent = getJobBySlug("non-existent-role");
  assert.equal(nonexistent, null);
});

test("Categories list", () => {
  assert.ok(CATEGORIES.includes("All"));
  assert.ok(CATEGORIES.includes("Engineering"));
  assert.ok(CATEGORIES.includes("Design"));
});
