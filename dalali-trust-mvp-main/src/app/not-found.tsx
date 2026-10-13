import Link from "next/link";
import { getDictionary } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-20 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-navy-900">{t.common.notFoundTitle}</h1>
      <p className="mt-2 text-navy-600">{t.common.notFoundBody}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-secondary">
          {t.common.goHome}
        </Link>
        <Link href="/properties" className="btn-primary">
          {t.nav.search}
        </Link>
      </div>
    </div>
  );
}
