import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { useRouter } from "next/router";

interface InfoPageLayoutProps {
  title: string;
  intro: string;
  children: ReactNode;
}

export function InfoPageLayout({ title, intro, children }: InfoPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-background pb-14 lg:pb-0">
      <Header user={null} onAuthClick={() => router.push("/auth/login")} />
      <main className="flex-1 container py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
            {siteConfig.demoMode ? "Demo platform" : siteConfig.name}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3">{title}</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">{intro}</p>
          <Card className="surface">
            <CardContent className="p-6 md:p-8 prose-content space-y-6 text-sm leading-relaxed">
              {children}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <div className="text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}
