import { smsEnabled } from "@/server/sms";
import { whatsappEnabled } from "@/server/whatsapp";
import { formatTzPhone } from "@/lib/phone";
import { deleteAccountAction, updateProfileAction } from "@/app/actions/account";
import { changePasswordAction } from "@/app/actions/auth";
import { ActionForm } from "@/components/ui/action-form";
import { PasswordInput } from "@/components/ui/password-input";
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
        <h2 className="mb-3 font-bold">{t.account.profile}</h2>
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
              defaultValue={me.phoneNumber ? formatTzPhone(me.phoneNumber) : ""}
              placeholder="07XX XXX XXX"
              autoComplete="tel"
            />
          </div>
          {whatsappEnabled() ? (
            <label className="flex items-start gap-2 text-sm text-navy-700">
              <input type="hidden" name="whatsappField" value="1" />
              <input
                type="checkbox"
                name="whatsappUpdates"
                defaultChecked={me.whatsappUpdates}
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
              />
              <span>
                {t.account.whatsappUpdates}
                <span className="block text-xs text-navy-500">{t.account.whatsappHint}</span>
              </span>
            </label>
          ) : null}
          {smsEnabled() ? (
            <label className="flex items-start gap-2 text-sm text-navy-700">
              <input type="hidden" name="smsField" value="1" />
              <input
                type="checkbox"
                name="smsUpdates"
                defaultChecked={me.smsUpdates}
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
              />
              <span>
                {t.account.smsUpdates}
                <span className="block text-xs text-navy-500">{t.account.smsHint}</span>
              </span>
            </label>
          ) : null}
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
              {t.account.currentPassword}
            </label>
            <PasswordInput
              showLabel={t.auth.showPassword}
              hideLabel={t.auth.hidePassword}
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              {t.auth.newPassword}
            </label>
            <PasswordInput
              showLabel={t.auth.showPassword}
              hideLabel={t.auth.hidePassword}
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <p className="mt-1 text-xs text-navy-500">{t.auth.passwordHelp}</p>
          </div>
        </ActionForm>
      </section>

      <section className="card mt-6 border-red-200 p-5">
        <h2 className="font-bold text-red-800">{t.account.deleteTitle}</h2>
        <p className="mt-1 text-sm text-navy-600">{t.account.deleteBody}</p>
        <ActionForm
          action={deleteAccountAction}
          submitLabel={t.account.deleteButton}
          submitClassName="btn-danger"
          className="mt-3 space-y-3"
        >
          <label className="label" htmlFor="confirmEmail">
            {t.account.deleteConfirm}
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
