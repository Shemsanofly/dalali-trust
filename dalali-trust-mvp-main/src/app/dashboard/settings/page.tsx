import { deleteAccountAction, updateProfileAction } from "@/app/actions/account";
import { changePasswordAction } from "@/app/actions/auth";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { requirePageActor } from "@/server/session";
import { getMyAccount } from "@/server/services/users";

export default async function SettingsPage() {
  const actor = await requirePageActor();
  const { t } = await getDictionary();
  const me = await getMyAccount(actor);
  return (
    <>
      <PageHeader title={t.dashboard.settings} subtitle={`${me.email} · ${t.property.roles[me.role]}`} />
      <section className="card p-5">
        <h2 className="mb-3 font-bold">Profile</h2>
        <ActionForm action={updateProfileAction} submitLabel={t.common.save}>
          <div>
            <label className="label" htmlFor="name">
              {t.auth.name}
            </label>
            <input
              className="input"
              id="name"
              name="name"
              defaultValue={me.name}
              required
              maxLength={80}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label" htmlFor="phoneNumber">
              {t.auth.phone}
            </label>
            <input
              className="input"
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={me.phoneNumber ?? ""}
              placeholder="07XX XXX XXX"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="label" htmlFor="locale">
              Language / Lugha
            </label>
            <select className="input" id="locale" name="locale" defaultValue={me.locale}>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
        </ActionForm>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-bold">{t.auth.password}</h2>
        <ActionForm action={changePasswordAction} submitLabel={t.auth.resetSubmit} resetOnSuccess>
          <div>
            <label className="label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              className="input"
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              {t.auth.newPassword}
            </label>
            <input
              className="input"
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <p className="mt-1 text-xs text-navy-500">{t.auth.passwordHelp}</p>
          </div>
        </ActionForm>
      </section>

      <section className="card mt-6 border-red-200 p-5">
        <h2 className="font-bold text-red-800">Delete account</h2>
        <p className="mt-1 text-sm text-navy-600">
          This removes your personal details, saved homes and uploaded files, archives your listings and signs
          you out. Records of moderation decisions are kept without your personal details. This cannot be
          undone.
        </p>
        <ActionForm
          action={deleteAccountAction}
          submitLabel="Delete my account permanently"
          submitClassName="btn-danger"
          className="mt-3 space-y-3"
        >
          <label className="label" htmlFor="confirmEmail">
            Type your email address to confirm
          </label>
          <input
            className="input"
            id="confirmEmail"
            name="confirmEmail"
            type="email"
            required
            autoComplete="off"
          />
        </ActionForm>
      </section>
    </>
  );
}
