import { useRouter } from "next/router";
import Link from "next/link";
import { Home, TrendingUp, Gamepad2, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function MobileBottomNav() {
  const router = useRouter();
  const { t } = useI18n();

  const navItems = [
    { icon: Home, label: t("home"), href: "/" },
    { icon: TrendingUp, label: t("sports"), href: "/sports" },
    { icon: Trophy, label: t("live"), href: "/live" },
    { icon: Gamepad2, label: t("casino"), href: "/casino" },
    { icon: User, label: t("account"), href: "/account" },
  ];

  return (
    <nav className="mobile-nav">
      <div className="h-full flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <button
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
