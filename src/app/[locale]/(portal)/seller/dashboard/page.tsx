"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Package,
  Eye,
  TrendingUp,
  FileText,
  Archive,
  Plus,
  Upload,
  Download,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { apiClient, type ApiResponse } from "@/lib/api-client";
import { useRequireRole } from "@/hooks/use-auth";
import { Link } from "@/i18n/routing";
import { toast } from "@/lib/utils/toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Types based on API response
interface DashboardOverview {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalViews: number;
  viewsThisWeek: number;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string | null;
  viewCount: number;
  status: string;
  thumbnail: string | null;
}

interface RecentProduct {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  createdAt: string;
}

interface DashboardData {
  overview: DashboardOverview;
  topProducts: TopProduct[];
  recentProducts: RecentProduct[];
}

function isSuccess<T>(
  res: ApiResponse<T>
): res is { success: true; data: T } {
  return (res as { success?: boolean })?.success === true;
}

// Stat Card Component
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">
              +{trend.value} {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Product Status Badge
function ProductStatusBadge({ status }: { status: string }) {
  const variant =
    status === "PUBLISHED"
      ? "default"
      : status === "DRAFT"
        ? "secondary"
        : "outline";

  return (
    <Badge variant={variant} className="text-xs">
      {status.toLowerCase()}
    </Badge>
  );
}

export default function SellerDashboardPage(): React.ReactElement {
  const t = useTranslations("seller.dashboard");
  const tCommon = useTranslations("common");
  const { isAuthorized, isLoading: isAuthLoading } = useRequireRole(
    "SELLER",
    "/unauthorized"
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<DashboardData>("/sellers/dashboard");

      if (isSuccess(res)) {
        setData(res.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load dashboard";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    void fetchDashboard();
  }, [fetchDashboard, isAuthorized]);

  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{tCommon("loading")}</div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return <></>;

  const overview = data?.overview;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("welcome")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/seller/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.addProduct")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/seller/products/import">
              <Upload className="mr-2 h-4 w-4" />
              {t("actions.importExcel")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/seller/products/export">
              <Download className="mr-2 h-4 w-4" />
              {t("actions.exportExcel")}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDashboard}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              className="mt-2"
            >
              {tCommon("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("stats.totalProducts")}
          value={overview?.totalProducts ?? 0}
          icon={Package}
          isLoading={isLoading}
        />
        <StatCard
          title={t("stats.published")}
          value={overview?.publishedProducts ?? 0}
          description={`${overview?.draftProducts ?? 0} ${t("stats.drafts").toLowerCase()}`}
          icon={FileText}
          isLoading={isLoading}
        />
        <StatCard
          title={t("stats.totalViews")}
          value={overview?.totalViews ?? 0}
          icon={Eye}
          trend={
            overview?.viewsThisWeek
              ? { value: overview.viewsThisWeek, label: t("stats.thisWeek") }
              : undefined
          }
          isLoading={isLoading}
        />
        <StatCard
          title={t("stats.archived")}
          value={overview?.archivedProducts ?? 0}
          icon={Archive}
          isLoading={isLoading}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("topProducts.title")}</CardTitle>
            <CardDescription>{t("topProducts.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : !data?.topProducts?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("topProducts.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-sm font-medium">
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {product.viewCount}
                      </div>
                      <ProductStatusBadge status={product.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data?.topProducts?.length ? (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/seller/products">
                    {t("topProducts.viewAll")}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Recent Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("recentProducts.title")}</CardTitle>
            <CardDescription>{t("recentProducts.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : !data?.recentProducts?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("recentProducts.empty")}
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/seller/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("actions.addProduct")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku || "—"} •{" "}
                        {new Date(product.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ProductStatusBadge status={product.status} />
                  </div>
                ))}
              </div>
            )}
            {data?.recentProducts?.length ? (
              <div className="mt-4 pt-4 border-t">
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/seller/products">
                    {t("recentProducts.viewAll")}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("quickActions.title")}</CardTitle>
          <CardDescription>{t("quickActions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/seller/products/new">
                <Plus className="h-5 w-5" />
                <span>{t("quickActions.addProduct")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/seller/products/import">
                <Upload className="h-5 w-5" />
                <span>{t("quickActions.bulkImport")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/seller/products">
                <Package className="h-5 w-5" />
                <span>{t("quickActions.manageProducts")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/seller/profile">
                <FileText className="h-5 w-5" />
                <span>{t("quickActions.editProfile")}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
