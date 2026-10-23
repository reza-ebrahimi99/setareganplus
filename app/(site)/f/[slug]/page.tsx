import { FormPage } from "@/components/site/FormPage";

export default async function PublicForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FormPage slug={decodeURIComponent(slug)} eyebrow="فرم آنلاین" />;
}
