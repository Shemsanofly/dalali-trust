export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="orb -top-24 left-[10%] -z-10 h-80 w-80 bg-brand-300/30" aria-hidden />
      <div
        className="orb right-[5%] bottom-0 -z-10 h-96 w-96 bg-gold-300/30"
        style={{ animationDelay: "-6s" }}
        aria-hidden
      />
      <div className="container-page flex justify-center py-10 sm:py-16">
        <div className="glass-light w-full max-w-md animate-fade-up rounded-3xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
