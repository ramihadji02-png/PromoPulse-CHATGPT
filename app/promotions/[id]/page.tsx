import { PromotionDetail } from '@/components/promotion-detail';

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PromotionDetail id={id} />;
}
