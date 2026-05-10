import { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { MobileNav, SideNav } from "./SideNav";
import { NoticeTicker } from "./NoticeTicker";
import { UpdateBanner } from "./UpdateBanner";


export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col bg-background overflow-x-hidden"
      style={{
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <UpdateBanner />
      <TopBar />
      <NoticeTicker />
      <div className="container flex-1 py-4 sm:py-6">
        <div className="flex gap-6">
          <SideNav />
          <main className="flex-1 min-w-0 pb-24 lg:pb-0">{children}</main>
        </div>
      </div>
      <MobileNav />
      
    </div>
  );
}
