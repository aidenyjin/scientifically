export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-bg min-h-dvh">{children}</div>;
}
