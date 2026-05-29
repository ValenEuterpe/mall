"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast";
import { mallApiFetch } from "@/lib/api-client";
import { Store, CheckCircle, Circle, XCircle } from "lucide-react";

// Types
export interface FloorShop {
  id: string;
  fullCode: string;
  shopNumber: string;
  shopName: string | null;
  svgId: string | null;
  isActive: boolean;
  sellerId: string | null;
  seller: {
    id: string;
    email: string;
    businessName: string | null;
  } | null;
}

interface ShopAssignmentPanelProps {
  buildingId: string;
  floorId: string;
  selectedShopId: string | null;
  onSelectShop: (shop: FloorShop | null) => void;
  onShopsLoaded: (shops: FloorShop[]) => void;
  pendingPathAssignment: {
    pathId: string;
    currentShop: FloorShop | null;
  } | null;
  onConfirmReassign: () => void;
  onCancelReassign: () => void;
}

export function ShopAssignmentPanel({
  buildingId,
  floorId,
  selectedShopId,
  onSelectShop,
  onShopsLoaded,
  pendingPathAssignment,
  onConfirmReassign,
  onCancelReassign,
}: ShopAssignmentPanelProps) {
  const t = useTranslations("mapEditor.shopAssignment");
  const [shops, setShops] = useState<FloorShop[]>([]);
  const [loading, setLoading] = useState(false);

  // Load shops for this floor
  const loadShops = useCallback(async () => {
    if (!buildingId || !floorId) return;

    setLoading(true);
    try {
      const res = await mallApiFetch(
        `/api/v1/mall/buildings/${buildingId}/floors/${floorId}/shops`
      );
      const data = await res.json();

      if (data.success) {
        setShops(data.data);
        onShopsLoaded(data.data);
      } else {
        toast.error(t("loadFailed"));
      }
    } catch (_error) {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [buildingId, floorId, onShopsLoaded]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // Refresh shops after assignment
  const refreshShops = useCallback(() => {
    loadShops();
  }, [loadShops]);

  // Clear assignment for a shop
  const handleClearAssignment = async (shop: FloorShop) => {
    try {
      const res = await mallApiFetch(`/api/v1/mall/shops/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ svgId: null }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t("clearSuccess"));
        refreshShops();
      } else {
        toast.error(t("assignFailed"));
      }
    } catch (_error) {
      toast.error(t("assignFailed"));
    }
  };

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">{t("title")}</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (shops.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">{t("title")}</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">{t("noShops")}</p>
            <p className="text-xs mt-1">{t("noShopsHint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{t("title")}</h3>
            <Badge variant="outline" className="text-xs">
              {shops.filter((s) => s.svgId).length}/{shops.length} {t("assigned")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-3">
              {shops.map((shop) => {
                const isSelected = selectedShopId === shop.id;
                const hasAssignment = !!shop.svgId;

                return (
                  <div
                    key={shop.id}
                    className={`
                      flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
                      ${isSelected 
                        ? "bg-primary/10 border border-primary" 
                        : "hover:bg-muted border border-transparent"
                      }
                    `}
                    onClick={() => onSelectShop(isSelected ? null : shop)}
                  >
                    <div className="flex items-center gap-2">
                      {hasAssignment ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{shop.fullCode}</p>
                        {shop.shopName && (
                          <p className="text-xs text-muted-foreground">
                            {shop.shopName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAssignment && (
                        <Badge variant="secondary" className="text-xs">
                          {shop.svgId}
                        </Badge>
                      )}
                      {isSelected && hasAssignment && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAssignment(shop);
                          }}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Instructions */}
          {selectedShop && (
            <div className="border-t p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                {selectedShop.svgId ? (
                  <>
                    {t("currentPath")}: <strong>{selectedShop.svgId}</strong>
                  </>
                ) : (
                  t("clickPath")
                )}
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="border-t p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500"></div>
              <span className="text-muted-foreground">{t("legendFree")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500"></div>
              <span className="text-muted-foreground">{t("legendAssigned")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></div>
              <span className="text-muted-foreground">{t("legendSelected")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reassign confirmation dialog */}
      <Dialog open={!!pendingPathAssignment} onOpenChange={() => onCancelReassign()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reassignTitle")}</DialogTitle>
            <DialogDescription>
              {pendingPathAssignment?.currentShop && selectedShop && (
                t("reassignDescription", {
                  shop: pendingPathAssignment.currentShop.fullCode,
                  newShop: selectedShop.fullCode,
                })
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelReassign}>
              {t("reassignCancel")}
            </Button>
            <Button onClick={onConfirmReassign}>
              {t("reassignConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShopAssignmentPanel;
