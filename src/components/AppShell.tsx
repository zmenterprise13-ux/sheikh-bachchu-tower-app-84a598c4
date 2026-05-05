import { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { MobileNav, SideNav } from "./SideNav";
import { NoticeTicker } from "./NoticeTicker";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <NoticeTicker />
      <div className="container flex-1 py-6">
        <div className="flex gap-6">
          <SideNav />
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
