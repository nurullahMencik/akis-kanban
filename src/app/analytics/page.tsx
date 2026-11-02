import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: tr["analytics.title"] };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
