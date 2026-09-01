import ReviewEditor from "./review-editor";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewEditor projectId={id} />;
}
