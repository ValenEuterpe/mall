"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname, useRouter, routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth, type UserRole } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  ArrowLeft,
  Bell,
  Building2,
  ChevronDown,
  Globe,
  Heart,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { useSidebarToggle } from "@/contexts/sidebar-toggle-context";
import { useCart } from "@/hooks/use-cart";
import { SearchSuggestionsDropdown, type SearchSuggestionsDropdownHandle } from "@/components/shared/SearchSuggestionsDropdown";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface HeaderProps {
  showSearch?: boolean;
  navItems?: NavItem[];
  showCart?: boolean;
  logo?: React.ReactNode;
  sticky?: boolean;
  transparent?: boolean;
}

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M16 8V24M8 12L24 20M24 12L8 20"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * Header search bar.
 *
 * Desktop (md+): always-expanded inline input.
 *
 * Mobile (<md): collapsed-by-default search icon. Tapping it opens a
 * full-width overlay that covers the header row (YouTube / Twitter pattern)
 * — back-arrow on the left collapses, search icon stays inside the input.
 * The overlay sits on top of the existing header buttons rather than
 * pushing them around. Tapping outside (or pressing Escape) collapses
 * when the field is empty; if the user has typed something, we keep it
 * open so they don't lose their query.
 */
function SearchBar() {
  const t = useTranslations("header");
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);
  const desktopInputRef = React.useRef<HTMLInputElement>(null);
  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopDropdownRef = React.useRef<SearchSuggestionsDropdownHandle>(null);
  const mobileDropdownRef = React.useRef<SearchSuggestionsDropdownHandle>(null);

  const handleSuggestionSelect = (
    kind: "product",
    id: string,
    label: string
  ) => {
    setDropdownOpen(false);
    setQuery("");
    router.push(`/products/${id}`);
  };

  const handleDropdownClose = () => {
    setDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push("/?q=" + encodeURIComponent(q));
    }
    setIsExpanded(false);
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dropdownRef: React.RefObject<SearchSuggestionsDropdownHandle | null>
  ) => {
    if (!dropdownOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      dropdownRef.current?.moveDown();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      dropdownRef.current?.moveUp();
    } else if (e.key === "Enter") {
      const handled = dropdownRef.current?.selectActive() ?? false;
      if (handled) {
        e.preventDefault();
        setDropdownOpen(false);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  // Mobile overlay stays mounted (display: hidden) so query state survives
  // open/close cycles. Outside-click always collapses; the typed text is
  // preserved in component state, so reopening shows it again.
  React.useEffect(() => {
    if (!isExpanded) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const node = overlayRef.current;
      if (!node) return;
      const target = e.target as Node | null;
      if (target && !node.contains(target)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isExpanded]);

  React.useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dropdownOpen) {
          setDropdownOpen(false);
        } else {
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded, dropdownOpen]);

  // Focus the mobile input when the overlay un-hides. Tailwind toggles
  // `display: none`, so the element is mounted but autoFocus would not re-fire.
  React.useEffect(() => {
    if (isExpanded) {
      mobileInputRef.current?.focus();
    }
  }, [isExpanded]);

  const renderInput = (
    ref: React.RefObject<HTMLInputElement | null>,
    dropdownRef: React.RefObject<SearchSuggestionsDropdownHandle | null>
  ) => (
    <div className="relative flex-1">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        ref={ref}
        type="text"
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length >= 2) setDropdownOpen(true);
          else setDropdownOpen(false);
        }}
        onFocus={() => {
          if (blurTimerRef.current) {
            clearTimeout(blurTimerRef.current);
            blurTimerRef.current = null;
          }
          if (query.trim().length >= 2) setDropdownOpen(true);
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => setDropdownOpen(false), 150);
        }}
        onKeyDown={(e) => handleInputKeyDown(e, dropdownRef)}
        className="w-full pr-10 pl-10"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: always-expanded inline form */}
      <form
        onSubmit={handleSubmit}
        className="relative hidden md:block md:w-80"
      >
        {renderInput(desktopInputRef, desktopDropdownRef)}
        <SearchSuggestionsDropdown
          ref={desktopDropdownRef}
          query={query}
          open={dropdownOpen && query.trim().length >= 2}
          onSelect={handleSuggestionSelect}
          onClose={handleDropdownClose}
        />
      </form>

      {/* Mobile: collapsed search trigger */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 md:hidden"
        onClick={() => setIsExpanded(true)}
        aria-label={t("searchPlaceholder")}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Mobile: full-width overlay; kept mounted so query state survives. */}
      <div
        ref={overlayRef}
        className={cn(
          "bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-2 border-b px-2 backdrop-blur md:hidden",
          !isExpanded && "hidden"
        )}
        role="search"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleCollapse}
          aria-label="Close search"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <form onSubmit={handleSubmit} className="relative flex-1">
          {renderInput(mobileInputRef, mobileDropdownRef)}
          <SearchSuggestionsDropdown
            ref={mobileDropdownRef}
            query={query}
            open={dropdownOpen && query.trim().length >= 2}
            onSelect={handleSuggestionSelect}
            onClose={handleDropdownClose}
          />
        </form>
      </div>
    </>
  );
}

function stripLocalePrefix(pathname: string): string {
  // Some navigation helpers may return a pathname that already includes the locale prefix.
  // Normalize to a locale-less pathname before calling router.replace(..., { locale }).
  //
  // Examples:
  // - "/en" -> "/"
  // - "/en/products" -> "/products"
  // - "/products" -> "/products"
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/i);
  if (!match) return pathname;

  const maybeLocale = match[1]?.toLowerCase();
  if (
    !maybeLocale ||
    !(routing.locales as readonly string[]).includes(maybeLocale)
  ) {
    return pathname;
  }

  const rest = match[2] ?? "";
  return rest.length > 0 ? rest : "/";
}

export function LanguageSwitcher() {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const languages = [
    { code: "en" as const, label: "English" },
    { code: "ru" as const, label: "Русский" },
    { code: "am" as const, label: "Հայերեն" },
  ];

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    const normalizedPathname = stripLocalePrefix(pathname);
    router.replace(normalizedPathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          suppressHydrationWarning
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {String(locale).toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(locale === lang.code && "bg-accent")}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const t = useTranslations("header");
  const { user, isAuthenticated, logout, hasRole } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">{t("login")}</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/signup">{t("signup")}</Link>
        </Button>
      </div>
    );
  }

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.email[0]?.toUpperCase() ?? "U");

  const dashboardHref = (() => {
    if (hasRole("MALL_OWNER" as UserRole)) return "/mall-owner/dashboard";
    if (hasRole("SELLER" as UserRole)) return "/seller";
    return "/account";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.avatarUrl}
              alt={user.firstName || user.email}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {!hasRole("MALL_OWNER" as UserRole) && (
            <DropdownMenuItem asChild>
              <Link href={dashboardHref}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t("dashboard")}
              </Link>
            </DropdownMenuItem>
          )}
          {hasRole("SELLER" as UserRole) && (
            <DropdownMenuItem asChild>
              <Link href="/seller/shop">
                <Store className="mr-2 h-4 w-4" />
                {t("myShop")}
              </Link>
            </DropdownMenuItem>
          )}
          {hasRole("MALL_OWNER" as UserRole) && (
            <DropdownMenuItem asChild>
              <Link href="/mall-owner/dashboard">
                <Building2 className="mr-2 h-4 w-4" />
                {t("mallManagement")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/account/favorites">
              <Heart className="mr-2 h-4 w-4" />
              {t("favorites")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/settings">
              <Settings className="mr-2 h-4 w-4" />
              {t("settings")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void logout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav({
  navItems,
  isOpen,
  onClose,
}: {
  navItems: NavItem[];
  isOpen: boolean;
  onClose: (open: boolean) => void;
}) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-80 max-w-full p-4 pl-14 sm:p-6 sm:pl-16 [&>button]:hidden"
      >
        <div className="absolute top-2 left-2 z-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            aria-label={t("menu")}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span>Wholesale Market</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-8 flex flex-col gap-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {t(item.label)}
                  {item.badge != null && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          <Separator />

          <div className="px-3">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>
                      {user.email[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    void logout();
                    onClose(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button asChild onClick={() => onClose(false)}>
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  onClick={() => onClose(false)}
                >
                  <Link href="/signup">{t("signup")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Header({
  showSearch = true,
  navItems = [],
  showCart = true,
  logo,
  sticky = true,
  transparent = false,
}: HeaderProps) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const { itemCount: cartCount } = useCart();

  // Sidebar toggles (safe defaults when outside SidebarToggleProvider)
  const { filterOpen, mapOpen, toggleFilter, toggleMap } = useSidebarToggle();
  const isHomePage = pathname === "/";
  const isShopPage = pathname.startsWith("/shops");

  const searchParams = useSearchParams();
  const isSearchActive = Boolean(searchParams.get("q"));

  React.useEffect(() => {
    if (!transparent) return;
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  return (
    <>
      <header
        className={cn(
          "z-50 w-full border-b transition-all duration-200",
          sticky && "sticky top-0",
          transparent && !scrolled
            ? "border-transparent bg-transparent"
            : "bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur"
        )}
      >
        <div className="container flex h-12 items-center justify-between gap-2 sm:h-14 md:h-16 lg:gap-4">
          <div className="flex flex-1 items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              {logo || <Logo className="h-7 w-7 sm:h-8 sm:w-8" />}
              <span className="hidden text-sm font-bold sm:text-base md:inline-block">
                Wholesale Market
              </span>
            </Link>

            {!isMobile && (
              <nav className="ml-6 hidden items-center gap-1 md:flex">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      {item.icon}
                      {t(item.label)}
                      {item.badge != null && (
                        <Badge variant="secondary" className="ml-1">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {/* Filter toggle — visible on shop/search pages on all viewports.
                On desktop it flips a persistent sidebar; on mobile it opens the
                shared MobilePanel. */}
            {(isShopPage || isSearchActive) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFilter}
                className={cn(
                  filterOpen && "bg-primary text-primary-foreground"
                )}
                aria-label={t("toggleFilters")}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            )}

            {showSearch && <SearchBar />}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <LanguageSwitcher />

            {/* Map toggle — visible on homepage and shop pages */}
            {(isHomePage || isShopPage) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMap}
                className={cn(mapOpen && "bg-primary text-primary-foreground")}
                aria-label={t("toggleMap")}
              >
                <Map className="h-5 w-5" />
              </Button>
            )}

            {showCart && (
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/cart" aria-label={t("cart")}>
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full p-0 text-xs"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            )}

            {/* Account UI: avatar dropdown on desktop only. On mobile,
                login/signup/logout live in the hamburger drawer. */}
            {!isMobile && <UserMenu />}

            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(true)}
                aria-label={t("menu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <MobileNav
        navItems={navItems}
        isOpen={mobileNavOpen}
        onClose={setMobileNavOpen}
      />
    </>
  );
}

export default Header;
