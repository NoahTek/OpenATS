import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CareersHeader,
  CareersJobsList,
  pageWidth,
} from "../../_components/careers-jobs-list";
import { getPublishedJobs } from "../../_lib/careers-api";
import { getClientInfo } from "../../_lib/client-api";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = await getClientInfo(slug);
  if (!client) {
    return { title: "Careers" };
  }
  return {
    title: `${client.name} Careers`,
    description: client.description ?? `Explore open job opportunities at ${client.name}.`,
  };
}

export default async function ClientCareersPage({ params }: PageProps) {
  const { slug } = await params;
  const [client, jobs] = await Promise.all([
    getClientInfo(slug),
    getPublishedJobs(slug),
  ]);

  if (!client) {
    notFound();
  }

  const brand = {
    name: client.name,
    logoUrl: client.logoUrl,
    description: client.description,
    website: client.website,
  };

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-neutral-950">
      {jobs.length === 0 ? (
        <>
          <CareersHeader brand={brand} />
          <div className={`${pageWidth} py-16 text-center`}>
            <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              No open roles at {client.name} right now
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              New roles are posted here as they open. Please check back soon.
            </p>
          </div>
        </>
      ) : (
        <CareersJobsList jobs={jobs} brand={brand} />
      )}
    </div>
  );
}
