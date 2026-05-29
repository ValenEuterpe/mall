"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "date-fns";
import { formatShopLocation } from "@/lib/utils/format-shop-location";

import { apiClient } from "@/lib/api-client";
import { unwrapApiResponse } from "@/components/mall-owner/api";
import { useToast } from "@/hooks/useToast";
import { useMultiMapData } from "@/hooks/use-multi-map-data";
import type { BuildingOverlay } from "@/components/home/LeafletMapView";
import { useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PasswordConfirmDialog } from "@/components/mall-owner/dialogs/PasswordConfirmDialog";
import {
  Users,
  Plus,
  Mail,
  Store,
  RefreshCw,
  MoreVertical,
  Eye,
  PlusCircle,
  UserMinus,
  Trash2,
  MapIcon,
  Loader2,
} from "lucide-react";

const LeafletMapView = dynamic(
  () => import("@/components/home/LeafletMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

// ============================================================================
// Types
// ============================================================================

type SellerListItem = {
  id: string;
  email: string;
  businessName: string | null;
  status: {
    isActive: boolean;
    hasRegistered: boolean;
  };
  shops: Array<{
    id: string;
    code: string;
    name: string | null;
  }>;
  timestamps: {
    invitedAt: string | null;
  };
};

type ShopListItem = {
  id: string;
  code: string;
  isVacant: boolean;
};

// ============================================================================
// Component
// ============================================================================

export function MallOwnerSellersPanel(): React.ReactElement {
  const t = useTranslations("mallOwner");
  const commonT = useTranslations("common");

  const toast = useToast();
  const router = useRouter();

  // Data state
  const [sellers, setSellers] = useState<SellerListItem[]>([]);
  const [shops, setShops] = useState<ShopListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite dialog state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteShopId, setInviteShopId] = useState<string | undefined>(
    undefined
  );
  const [inviteShopCode, setInviteShopCode] = useState<string>("");
  const [inviting, setInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteMapVisible, setInviteMapVisible] = useState(false);
  const [inviteMapKey, setInviteMapKey] = useState(0);

  // Resend invite state
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendingSeller, setResendingSeller] = useState<SellerListItem | null>(
    null
  );
  const [resending, setResending] = useState(false);

  // Assign shop dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningSeller, setAssigningSeller] = useState<SellerListItem | null>(
    null
  );
  const [assigningShopId, setAssigningShopId] = useState<string | undefined>(
    undefined
  );
  const [assigningShopCode, setAssigningShopCode] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignMapVisible, setAssignMapVisible] = useState(false);
  const [assignMapKey, setAssignMapKey] = useState(0);

  // Remove from shop state
  const [removeShopDialogOpen, setRemoveShopDialogOpen] = useState(false);
  const [removeShopTarget, setRemoveShopTarget] = useState<{
    seller: SellerListItem;
    shop: { id: string; code: string };
  } | null>(null);

  // Remove seller state
  const [removeSellerDialogOpen, setRemoveSellerDialogOpen] = useState(false);
  const [removeSellerTarget, setRemoveSellerTarget] =
    useState<SellerListItem | null>(null);

  // Map data — multi-building (for shop picker in invite/assign dialogs)
  const {
    buildings: mapBuildings,
    globalCenter,
    globalLoading,
    globalError,
    setFloorForBuilding,
    allShopsBySvgId: _allShopsBySvgId,
    allShopSvgIds,
  } = useMultiMapData({ includeVacant: true });

  // All shops flat (across all buildings) for lookups
  const allShops = useMemo(
    () => mapBuildings.flatMap((b) => b.shops),
    [mapBuildings]
  );

  // Building overlays for LeafletMapView
  const buildingOverlays: BuildingOverlay[] = useMemo(
    () =>
      mapBuildings.map((b) => ({
        buildingCode: b.buildingCode,
        svgContent: b.svgMarkup,
        center: b.center,
        rotation: b.rotation,
        scale: b.scale,
        floors: b.floors,
        currentFloor: b.currentFloor,
        onFloorChange: (floor: string) =>
          setFloorForBuilding(b.buildingCode, floor),
      })),
    [mapBuildings, setFloorForBuilding]
  );

  // Compute vacant SVG IDs from all buildings
  const vacantSvgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const shop of allShops) {
      if (shop.svgId && shop.isVacant) {
        ids.add(shop.svgId);
      }
    }
    return ids;
  }, [allShops]);

  // Map shopsBySvgId lookup
  const shopsBySvgId = useMemo(() => {
    const m = new Map<string, { id: string; fullCode: string }>();
    for (const shop of allShops) {
      if (shop.svgId) {
        m.set(shop.svgId, { id: shop.id, fullCode: shop.fullCode });
      }
    }
    return m;
  }, [allShops]);

  // Active shop SVG ID for map highlight
  const inviteActiveSvgId = useMemo(() => {
    if (!inviteShopId) return null;
    for (const shop of allShops) {
      if (shop.id === inviteShopId && shop.svgId) return shop.svgId;
    }
    return null;
  }, [inviteShopId, allShops]);

  const assignActiveSvgId = useMemo(() => {
    if (!assigningShopId) return null;
    for (const shop of allShops) {
      if (shop.id === assigningShopId && shop.svgId) return shop.svgId;
    }
    return null;
  }, [assigningShopId, allShops]);

  // ============================================================================
  // Data fetching
  // ============================================================================

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sellersRes, shopsRes] = await Promise.all([
        apiClient.get<any>("/mall/sellers"),
        apiClient.get<any>("/mall/shops"),
      ]);

      const sellersData = unwrapApiResponse<any>(sellersRes);
      const shopsData = unwrapApiResponse<any>(shopsRes);

      setSellers(
        Array.isArray(sellersData) ? sellersData : (sellersData.sellers ?? [])
      );
      setShops(Array.isArray(shopsData) ? shopsData : (shopsData.shops ?? []));
    } catch (err) {
      toast.apiError(err, t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const vacantShops = useMemo(() => shops.filter((s) => s.isVacant), [shops]);

  // ============================================================================
  // Map shop click handler
  // ============================================================================

  const handleInviteMapShopClick = useCallback(
    (svgId: string) => {
      const shop = shopsBySvgId.get(svgId);
      if (!shop) return;
      // Only allow selecting vacant shops
      if (!vacantSvgIds.has(svgId)) return;
      setInviteShopId(shop.id);
      setInviteShopCode(shop.fullCode);
    },
    [shopsBySvgId, vacantSvgIds]
  );

  const handleAssignMapShopClick = useCallback(
    (svgId: string) => {
      const shop = shopsBySvgId.get(svgId);
      if (!shop) return;
      if (!vacantSvgIds.has(svgId)) return;
      setAssigningShopId(shop.id);
      setAssigningShopCode(shop.fullCode);
    },
    [shopsBySvgId, vacantSvgIds]
  );

  // ============================================================================
  // Invite handler
  // ============================================================================

  const onInvite = useCallback(async () => {
    if (!inviteShopId) {
      toast.error(t("sellers.inviteMissingShop"));
      return;
    }

    setInviting(true);
    try {
      await apiClient.post("/mall/sellers/invite", {
        email: inviteEmail,
        shopId: inviteShopId,
      });

      toast.success(t("sellers.inviteSuccess"));
      setInviteEmail("");
      setInviteShopId(undefined);
      setInviteShopCode("");
      setInviteMapVisible(false);
      setInviteDialogOpen(false);
      await fetchAll();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setInviting(false);
    }
  }, [fetchAll, inviteEmail, inviteShopId, t, toast]);

  // ============================================================================
  // Resend invite handler
  // ============================================================================

  const onResendInvite = useCallback(async () => {
    if (!resendingSeller) return;

    const shopId = resendingSeller.shops[0]?.id;
    if (!shopId) {
      toast.error(t("sellers.inviteMissingShop"));
      return;
    }

    setResending(true);
    try {
      await apiClient.post("/mall/sellers/invite", {
        email: resendingSeller.email,
        businessName: resendingSeller.businessName || undefined,
        shopId,
      });

      toast.success(t("sellers.resendSuccess"));
      setResendDialogOpen(false);
      setResendingSeller(null);
      await fetchAll();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setResending(false);
    }
  }, [fetchAll, resendingSeller, t, toast]);

  const openResendDialog = useCallback((seller: SellerListItem) => {
    setResendingSeller(seller);
    setResendDialogOpen(true);
  }, []);

  // ============================================================================
  // Assign shop handler
  // ============================================================================

  const handleAssignShop = useCallback(async () => {
    if (!assigningSeller || !assigningShopId) return;

    setAssigning(true);
    try {
      await apiClient.post(`/mall/shops/${assigningShopId}`, {
        action: "assign",
        sellerId: assigningSeller.id,
      });

      toast.success(t("sellers.assignShopSuccess"));
      setAssignDialogOpen(false);
      setAssigningSeller(null);
      setAssigningShopId(undefined);
      setAssigningShopCode("");
      setAssignMapVisible(false);
      await fetchAll();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setAssigning(false);
    }
  }, [assigningSeller, assigningShopId, fetchAll, t, toast]);

  // ============================================================================
  // Remove from shop handler
  // ============================================================================

  const handleRemoveFromShop = useCallback(async () => {
    if (!removeShopTarget) return;

    try {
      await apiClient.post(`/mall/shops/${removeShopTarget.shop.id}`, {
        action: "unassign",
      });

      toast.success(t("sellers.removeFromShopSuccess"));
      setRemoveShopDialogOpen(false);
      setRemoveShopTarget(null);
      await fetchAll();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    }
  }, [removeShopTarget, fetchAll, t, toast]);

  // ============================================================================
  // Remove seller handler
  // ============================================================================

  const handleRemoveSeller = useCallback(
    async (password: string) => {
      if (!removeSellerTarget) return;

      try {
        await apiClient.delete(
          `/mall/sellers/${removeSellerTarget.id}?confirm=${encodeURIComponent(removeSellerTarget.email)}`,
          { body: { password } }
        );

        toast.success(t("sellers.removeSellerSuccess"));
        setRemoveSellerDialogOpen(false);
        setRemoveSellerTarget(null);
        await fetchAll();
      } catch (err) {
        toast.apiError(err, t("errors.saveFailed"));
      }
    },
    [removeSellerTarget, fetchAll, t, toast]
  );

  // ============================================================================
  // Helpers
  // ============================================================================

  const formatInviteDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return null;
    }
  }, []);

  // Sync dropdown selection to shop code for display
  const handleInviteShopSelect = useCallback(
    (shopId: string) => {
      setInviteShopId(shopId);
      const shop = vacantShops.find((s) => s.id === shopId);
      setInviteShopCode(shop?.code ?? "");
    },
    [vacantShops]
  );

  const handleAssignShopSelect = useCallback(
    (shopId: string) => {
      setAssigningShopId(shopId);
      const shop = vacantShops.find((s) => s.id === shopId);
      setAssigningShopCode(shop?.code ?? "");
    },
    [vacantShops]
  );

  // ============================================================================
  // Shared Map Picker
  // ============================================================================

  const renderMapPicker = (
    activeShopSvgId: string | null,
    onShopClick: (svgId: string) => void,
    mapKeyBase: string,
    mapKey: number
  ): React.ReactElement => (
    <div className="relative h-[350px] w-full overflow-hidden rounded-md border">
      <LeafletMapView
        key={`${mapKeyBase}-${mapKey}`}
        center={globalCenter}
        loading={globalLoading}
        error={globalError}
        selectedCount={0}
        shopSvgIds={allShopSvgIds}
        activeShopSvgId={activeShopSvgId}
        onShopClick={onShopClick}
        vacantSvgIds={vacantSvgIds}
        buildings={buildingOverlays}
      />
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("tabs.sellers")}</CardTitle>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("sellers.inviteTitle")}
              </Button>
            </DialogTrigger>
            <DialogContent
              className={inviteMapVisible ? "max-w-3xl" : undefined}
            >
              <DialogHeader>
                <DialogTitle>{t("sellers.inviteTitle")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Email input */}
                <div className="space-y-2">
                  <Label htmlFor="invite-email">
                    {t("sellers.emailLabel")}
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                {/* Shop selection: dropdown + map toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("sellers.shopSelectLabel")}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInviteMapVisible((v) => !v);
                        setInviteMapKey((k) => k + 1);
                      }}
                      type="button"
                    >
                      <MapIcon className="mr-2 h-4 w-4" />
                      {t("sellers.toggleMap")}
                    </Button>
                  </div>

                  {/* Dropdown */}
                  <Select
                    value={inviteShopId}
                    onValueChange={handleInviteShopSelect}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("sellers.shopSelectPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {vacantShops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {formatShopLocation(shop.code, commonT)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Map picker */}
                  {inviteMapVisible &&
                    renderMapPicker(
                      inviteActiveSvgId,
                      handleInviteMapShopClick,
                      `invite-map`,
                      inviteMapKey
                    )}

                  {/* Selected shop indicator */}
                  {inviteShopCode && (
                    <p className="text-muted-foreground text-sm">
                      {t("sellers.selectedShop", {
                        code: formatShopLocation(inviteShopCode, commonT),
                      })}
                    </p>
                  )}
                  {!inviteShopCode && inviteMapVisible && (
                    <p className="text-muted-foreground text-sm">
                      {t("sellers.noShopSelected")}
                    </p>
                  )}
                </div>

                <Button
                  onClick={onInvite}
                  disabled={inviting || !inviteEmail || !inviteShopId}
                >
                  {inviting
                    ? t("sellers.inviteSubmitting")
                    : t("sellers.inviteBtn")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm">
              {commonT("loading")}
            </div>
          ) : sellers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">
                {t("sellers.emptyTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("sellers.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sellers.tableHeaders.business")}</TableHead>
                    <TableHead>{t("sellers.tableHeaders.location")}</TableHead>
                    <TableHead>{t("sellers.tableHeaders.status")}</TableHead>
                    <TableHead>{t("sellers.tableHeaders.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => {
                    const isPending = !seller.status.hasRegistered;
                    const inviteDate = formatInviteDate(
                      seller.timestamps.invitedAt
                    );
                    const shopCode = seller.shops[0]?.code;
                    const shopDisplay = formatShopLocation(shopCode, commonT);

                    return (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                              <Users className="text-primary h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {seller.businessName ?? seller.email}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3" />
                                {seller.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Store className="text-muted-foreground h-4 w-4" />
                            {shopDisplay || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={isPending ? "secondary" : "default"}
                            >
                              {isPending
                                ? t("sellers.statusPending")
                                : t("sellers.statusActive")}
                            </Badge>
                            {isPending && inviteDate && (
                              <span className="text-muted-foreground text-xs">
                                {t("sellers.invitedOn", { date: inviteDate })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* View Shop */}
                              {shopCode && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/shops/${shopCode}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("sellers.actions.viewShop")}
                                </DropdownMenuItem>
                              )}

                              {/* Assign New Shop */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setAssigningSeller(seller);
                                  setAssigningShopId(undefined);
                                  setAssigningShopCode("");
                                  setAssignMapVisible(false);
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t("sellers.actions.assignShop")}
                              </DropdownMenuItem>

                              {/* Remove from Shop */}
                              {seller.shops.length > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRemoveShopTarget({
                                      seller,
                                      shop: {
                                        id: seller.shops[0].id,
                                        code: seller.shops[0].code,
                                      },
                                    });
                                    setRemoveShopDialogOpen(true);
                                  }}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  {t("sellers.actions.removeFromShop")}
                                </DropdownMenuItem>
                              )}

                              {/* Resend Invite (pending only) */}
                              {isPending && (
                                <DropdownMenuItem
                                  onClick={() => openResendDialog(seller)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {t("sellers.resendInvite")}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Remove Seller */}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setRemoveSellerTarget(seller);
                                  setRemoveSellerDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("sellers.actions.removeSeller")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Resend Invite Confirmation Dialog */}
      {/* ================================================================== */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sellers.resendConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("sellers.resendConfirmDescription", {
              email: resendingSeller?.email ?? "",
            })}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResendDialogOpen(false)}
              disabled={resending}
            >
              {t("sellers.resendCancelBtn")}
            </Button>
            <Button onClick={onResendInvite} disabled={resending}>
              {resending
                ? t("sellers.resendingInvite")
                : t("sellers.resendConfirmBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Assign New Shop Dialog */}
      {/* ================================================================== */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className={assignMapVisible ? "max-w-3xl" : undefined}>
          <DialogHeader>
            <DialogTitle>
              {t("sellers.assignShopTitle", {
                name:
                  assigningSeller?.businessName ?? assigningSeller?.email ?? "",
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("sellers.shopSelectLabel")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssignMapVisible((v) => !v);
                    setAssignMapKey((k) => k + 1);
                  }}
                  type="button"
                >
                  <MapIcon className="mr-2 h-4 w-4" />
                  {t("sellers.toggleMap")}
                </Button>
              </div>

              <Select
                value={assigningShopId}
                onValueChange={handleAssignShopSelect}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("sellers.shopSelectPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {vacantShops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {formatShopLocation(shop.code, commonT)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {assignMapVisible &&
                renderMapPicker(
                  assignActiveSvgId,
                  handleAssignMapShopClick,
                  `assign-map`,
                  assignMapKey
                )}

              {assigningShopCode && (
                <p className="text-muted-foreground text-sm">
                  {t("sellers.selectedShop", {
                    code: formatShopLocation(assigningShopCode, commonT),
                  })}
                </p>
              )}
              {!assigningShopCode && assignMapVisible && (
                <p className="text-muted-foreground text-sm">
                  {t("sellers.noShopSelected")}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assigning}
            >
              {t("sellers.cancel")}
            </Button>
            <Button
              onClick={handleAssignShop}
              disabled={assigning || !assigningShopId}
            >
              {assigning
                ? t("sellers.assigningShop")
                : t("sellers.assignShopBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Remove from Shop - Password Confirmation */}
      {/* ================================================================== */}
      <PasswordConfirmDialog
        open={removeShopDialogOpen}
        onOpenChange={setRemoveShopDialogOpen}
        title={t("sellers.removeFromShopTitle")}
        description={t("sellers.removeFromShopDescription", {
          name:
            removeShopTarget?.seller.businessName ??
            removeShopTarget?.seller.email ??
            "",
          shop: formatShopLocation(removeShopTarget?.shop.code, commonT) || "",
        })}
        confirmLabel={t("sellers.removeFromShopBtn")}
        onConfirm={handleRemoveFromShop}
        destructive
      />

      {/* ================================================================== */}
      {/* Remove Seller - Password Confirmation */}
      {/* ================================================================== */}
      <PasswordConfirmDialog
        open={removeSellerDialogOpen}
        onOpenChange={setRemoveSellerDialogOpen}
        title={t("sellers.removeSellerTitle")}
        description={t("sellers.removeSellerDescription", {
          name:
            removeSellerTarget?.businessName ?? removeSellerTarget?.email ?? "",
        })}
        confirmLabel={t("sellers.removeSellerBtn")}
        onConfirm={handleRemoveSeller}
        destructive
      />
    </div>
  );
}
