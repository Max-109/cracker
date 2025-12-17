import AppLayout from "../components/AppLayout";
import { cookies } from "next/headers";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebarOpen")?.value === "true";

  return <AppLayout initialSidebarOpen={sidebarOpen}>{children}</AppLayout>;
}
