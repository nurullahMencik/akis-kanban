"use client";

import Link from "next/link";
import { BrandMark } from "@/components/shell/brand";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark className="size-10" />
      <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
      <p className="max-w-sm text-sm text-ink-2">{t("notFound.body")}</p>
      <Link href="/" className="btn btn-primary">
        {t("notFound.back")}
      </Link>
    </div>
  );
}
