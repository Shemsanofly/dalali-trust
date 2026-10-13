import Link from "next/link";
import { getDictionary } from "@/i18n/server";

export default async function ListingNotFound() {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-extrabold text-navy-900">{t.property.notFoundTitle}</h1>
      <p className="mt-2 text-navy-600">{t.property.notFoundBody}</p>
      <Link href="/properties" className="btn-primary mt-6">
        {t.home.viewAll}
      </Link>
    </div>
  );
}
