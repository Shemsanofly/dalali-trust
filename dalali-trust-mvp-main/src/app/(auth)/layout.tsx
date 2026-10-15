export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
    </div>
  );
}
