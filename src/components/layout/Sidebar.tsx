"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-media-query";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ChevronDown, PanelLeft, PanelLeftClose } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface SidebarItem {
  id: string;
  title: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  disabled?: boolean;
  children?: SidebarItem[];
  onClick?: () => void;
  show?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface SidebarProps {
  sections: SidebarSection[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Context
// ============================================================================

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  storageKey?: string;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
  storageKey = "sidebar-collapsed",
}: SidebarProviderProps) {
  const { value: isCollapsed, setValue: setIsCollapsed } = useLocalStorage(
    storageKey,
    defaultCollapsed
  );
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface SidebarItemComponentProps {
  item: SidebarItem;
  isCollapsed: boolean;
  depth?: number;
}

function SidebarItemComponent({
  item,
  isCollapsed,
  depth = 0,
}: SidebarItemComponentProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  const isActive = item.href === pathname;
  const hasActiveChild =
    item.children?.some(
      (child) =>
        child.href === pathname ||
        child.children?.some((c) => c.href === pathname)
    ) ?? false;

  React.useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  if (item.show === false) return null;

  const hasChildren = Boolean(item.children?.length);

  const content = (
    <>
      {item.icon && (
        <span className={cn("flex-shrink-0", isCollapsed && depth === 0 ? "" : "mr-3")}>
          {item.icon}
        </span>
      )}
      {(!isCollapsed || depth > 0) && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge !== undefined && (
            <Badge variant={item.badgeVariant || "secondary"} className="ml-auto">
              {item.badge}
            </Badge>
          )}
          {hasChildren && (
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          )}
        </>
      )}
    </>
  );

  const baseStyles = cn(
    "flex w-full items-center rounded-lg text-sm transition-colors",
    isCollapsed && depth === 0 ? "justify-center px-2 py-2" : "px-3 py-2",
    depth > 0 && "ml-4",
    item.disabled && "cursor-not-allowed opacity-50",
    isActive || hasActiveChild
      ? "bg-accent text-accent-foreground font-medium"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );

  if (!hasChildren) {
    const inner = item.href ? (
      <Link href={item.href} className="flex w-full items-center">
        {content}
      </Link>
    ) : (
      content
    );

    const button = (
      <Button
        variant="ghost"
        className={baseStyles}
        disabled={item.disabled}
        onClick={item.onClick}
        asChild={Boolean(item.href)}
      >
        {inner}
      </Button>
    );

    if (isCollapsed && depth === 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge !== undefined && (
              <Badge variant={item.badgeVariant || "secondary"}>{item.badge}</Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }

  // Collapsible with children
  if (isCollapsed && depth === 0) {
    // In collapsed mode, we just show the icon button.
    // Our TooltipContent is a stub (not rendered) unless Radix is added later.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className={baseStyles}>
            {item.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-2">
          <div className="space-y-1">
            <p className="mb-2 text-sm font-medium">{item.title}</p>
            {item.children?.map((child) => (
              <SidebarItemComponent
                key={child.id}
                item={child}
                isCollapsed={false}
                depth={0}
              />
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className={baseStyles}>
          {content}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">
        {item.children?.map((child) => (
          <SidebarItemComponent
            key={child.id}
            item={child}
            isCollapsed={false}
            depth={depth + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarSectionComponent({
  section,
  isCollapsed,
}: {
  section: SidebarSection;
  isCollapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {section.title && !isCollapsed && (
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
      )}
      {section.title && isCollapsed && <Separator className="my-2" />}
      {section.items.map((item) => (
        <SidebarItemComponent key={item.id} item={item} isCollapsed={isCollapsed} />
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Sidebar({
  sections,
  collapsible = true,
  defaultCollapsed = false,
  storageKey = "sidebar-collapsed",
  header,
  footer,
  className,
}: SidebarProps) {
  const { value: isCollapsed, setValue: setIsCollapsed } = useLocalStorage(
    storageKey,
    defaultCollapsed
  );
  const isMobile = useIsMobile();

  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300",
          effectivelyCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {header && (
          <div
            className={cn(
              "flex items-center border-b",
              effectivelyCollapsed ? "justify-center p-2" : "p-4"
            )}
          >
            {header}
          </div>
        )}

        <ScrollArea className="flex-1 py-4">
          <nav className={cn("space-y-4", effectivelyCollapsed ? "px-2" : "px-3")}>
            {sections.map((section, index) => (
              <SidebarSectionComponent
                key={section.title ?? index}
                section={section}
                isCollapsed={effectivelyCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        {footer && (
          <div className={cn("border-t", effectivelyCollapsed ? "p-2" : "p-4")}>
            {footer}
          </div>
        )}

        {collapsible && !isMobile && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

// ============================================================================
// Layout helper
// ============================================================================

export function SidebarLayout({
  children,
  sidebar,
  header,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {sidebar}
      <div className="flex flex-1 flex-col">
        {header}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default Sidebar;
