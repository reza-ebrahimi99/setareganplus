import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { CenterPage } from "@/components/site/CenterPage";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("ghalamchi");
}

export default function Page() {
  return <CenterPage slug="ghalamchi" />;
}
