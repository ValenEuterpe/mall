"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Building2,
  Layers,
  Store,
  Plus,
  Trash2,
  User,
  Package,
  MapPin,
  Pencil,
  UserPlus,
  UserMinus,
  Minus,
  Tag,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { unwrapApiResponse } from "@/components/mall-owner/api";
import { useToast } from "@/hooks/useToast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddShopTypeDialog } from "@/components/mall-owner/dialogs/AddShopTypeDialog";
import type { ShopTypeFormData } from "@/components/mall-owner/dialogs/AddShopTypeDialog";
import { EditShopTypeDialog } from "@/components/mall-owner/dialogs/EditShopTypeDialog";
import type { ShopTypeData } from "@/components/mall-owner/dialogs/EditShopTypeDialog";

// ============================================================================
// TYPES
// ============================================================================

type ShopSeller = {
  id: string;
  email: string;
  businessName: string | null;
  contactPerson: string | null;
};

type ShopTypeInfo = {
  id: string;
  key: string;
  name_en: string;
  icon: string | null;
  color: string | null;
};

type ShopData = {
  id: string;
  code: string;
  name: string | null;
  location: {
    venue: string;
    building: string | null;
    floor: string;
    number: string;
    svgId: string | null;
  };
  isActive: boolean;
  isVacant: boolean;
  type: ShopTypeInfo | null;
  seller: ShopSeller | null;
  stats: {
    productsCount: number;
  };
};

type SellerListItem = {
  id: string;
  email: string;
  businessName: string | null;
  status: string;
};

type FloorMapData = {
  id: string;
  svgUrl: string;
  shopIds: string[];
};

type FloorData = {
  id: string;
  number: number;
  label: string | null;
  code: string;
  floorMap: FloorMapData | null;
  _count: { shops: number };
};

type BuildingData = {
  id: string;
  venueId: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rotation: number;
  scale: number;
  floors: FloorData[];
};

type VenueData = {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  buildings: BuildingData[];
};

// Tree structure for display (built from venues + shops)
type FloorNode = {
  floorId: string;
  floorNumber: number;
  floorCode: string;
  floorLabel: string | null;
  shops: ShopData[];
};

type BuildingNode = {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  floors: FloorNode[];
};

type VenueNode = {
  venueId: string;
  venueName: string;
  venueCode: string;
  buildings: BuildingNode[];
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a display tree from venues data and shops.
 * Venues contain buildings, buildings contain floors, floors contain shops.
 */
function buildStructureTree(
  venues: VenueData[],
  shops: ShopData[]
): VenueNode[] {
  // Create a map for quick shop lookup by floor code + building code
  const shopsByLocation = new Map<string, ShopData[]>();
  for (const shop of shops) {
    const key = `${shop.location.building || ""}:${shop.location.floor}`;
    if (!shopsByLocation.has(key)) {
      shopsByLocation.set(key, []);
    }
    shopsByLocation.get(key)!.push(shop);
  }

  // Build tree from venues data
  const tree: VenueNode[] = venues.map((venue) => ({
    venueId: venue.id,
    venueName: venue.name,
    venueCode: venue.code,
    buildings: venue.buildings.map((building) => ({
      buildingId: building.id,
      buildingName: building.name,
      buildingCode: building.code,
      floors: building.floors
        .sort((a, b) => a.number - b.number)
        .map((floor) => {
          const key = `${building.code}:${floor.code}`;
          const floorShops = shopsByLocation.get(key) || [];
          // Sort shops by number
          floorShops.sort((a, b) =>
            a.location.number.localeCompare(b.location.number, undefined, {
              numeric: true,
            })
          );
          return {
            floorId: floor.id,
            floorNumber: floor.number,
            floorCode: floor.code,
            floorLabel: floor.label,
            shops: floorShops,
          };
        }),
    })),
  }));

  return tree;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ShopItem({
  shop,
  onDelete,
  onAssignSeller,
  onUnassignSeller,
  onChangeShopType,
  sellers,
  shopTypes,
  t,
}: {
  shop: ShopData;
  onDelete: (shopId: string) => void;
  onAssignSeller: (shopId: string, sellerId: string) => void;
  onUnassignSeller: (shopId: string) => void;
  onChangeShopType: (shopId: string, shopTypeId: string | null) => void;
  sellers: SellerListItem[];
  shopTypes: ShopTypeData[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    shop.type?.id || ""
  );
  const [assigning, setAssigning] = useState(false);
  const [changingType, setChangingType] = useState(false);

  // Filter to only show active sellers without a shop assigned
  const availableSellers = sellers.filter((s) => s.status === "ACTIVE");

  const handleAssign = async () => {
    if (!selectedSellerId) return;
    setAssigning(true);
    await onAssignSeller(shop.id, selectedSellerId);
    setAssigning(false);
    setSelectedSellerId("");
    setEditDialogOpen(false);
  };

  const handleUnassign = async () => {
    setAssigning(true);
    await onUnassignSeller(shop.id);
    setAssigning(false);
    setEditDialogOpen(false);
  };

  const handleChangeType = async () => {
    setChangingType(true);
    await onChangeShopType(shop.id, selectedTypeId || null);
    setChangingType(false);
  };

  return (
    <div className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Store className="text-muted-foreground h-4 w-4" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{shop.code}</span>
            {shop.name && (
              <span className="text-muted-foreground">({shop.name})</span>
            )}
            {shop.isVacant ? (
              <Badge variant="outline" className="text-xs">
                {t("structure.vacant")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t("structure.occupied")}
              </Badge>
            )}
          </div>
          {shop.seller && (
            <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {shop.seller.businessName || shop.seller.email}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {t("structure.productsCount", {
                  count: shop.stats.productsCount,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Edit/Assign Seller Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("structure.editShopTitle")}</DialogTitle>
              <DialogDescription>
                {t("structure.editShopDescription", { code: shop.code })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Shop Type Selector */}
              <div className="space-y-2">
                <Label>{t("structure.shopTypes.typeLabel")}</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedTypeId}
                    onValueChange={setSelectedTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("structure.shopTypes.typePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {shopTypes.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      changingType || selectedTypeId === (shop.type?.id || "")
                    }
                    onClick={handleChangeType}
                  >
                    {changingType ? "..." : "Save"}
                  </Button>
                </div>
              </div>

              {shop.seller ? (
                <div className="space-y-4">
                  <div className="rounded-md border p-4">
                    <div className="text-muted-foreground text-sm">
                      {t("structure.currentSeller")}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {shop.seller.businessName || shop.seller.email}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {shop.seller.email}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUnassign}
                    disabled={assigning}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    {assigning
                      ? t("structure.unassigning")
                      : t("structure.unassignSeller")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("structure.selectSeller")}</Label>
                    <Select
                      value={selectedSellerId}
                      onValueChange={setSelectedSellerId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("structure.selectSellerPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSellers.length === 0 ? (
                          <div className="text-muted-foreground p-2 text-center text-sm">
                            {t("structure.noSellersAvailable")}
                          </div>
                        ) : (
                          availableSellers.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.businessName || seller.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAssign}
                    disabled={!selectedSellerId || assigning}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {assigning
                      ? t("structure.assigning")
                      : t("structure.assignSeller")}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("structure.deleteShopTitle")}</DialogTitle>
              <DialogDescription>
                {t("structure.deleteShopDescription", { code: shop.code })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {t("structure.cancelBtn")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(shop.id);
                  setDeleteDialogOpen(false);
                }}
              >
                {t("structure.deleteBtn")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function FloorSection({
  floorNode,
  venueCode,
  buildingCode,
  onDeleteShop,
  onAssignSeller,
  onUnassignSeller,
  onChangeShopType,
  onGenerateShops,
  sellers,
  shopTypes,
  t,
}: {
  floorNode: FloorNode;
  venueCode: string;
  buildingCode: string;
  onDeleteShop: (shopId: string) => void;
  onAssignSeller: (shopId: string, sellerId: string) => void;
  onUnassignSeller: (shopId: string) => void;
  onChangeShopType: (shopId: string, shopTypeId: string | null) => void;
  onGenerateShops: (
    venueCode: string,
    buildingCode: string,
    floorCode: string,
    floorId: string
  ) => void;
  sellers: SellerListItem[];
  shopTypes: ShopTypeData[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Display label: use label if available, otherwise show floor number
  const floorDisplayName =
    floorNode.floorLabel ||
    (floorNode.floorNumber < 0
      ? `Basement ${Math.abs(floorNode.floorNumber)}`
      : floorNode.floorNumber === 0
        ? "Ground Floor"
        : `Floor ${floorNode.floorNumber}`);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-6 flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-2 py-1.5"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Layers className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{floorDisplayName}</span>
            <span className="text-muted-foreground text-xs">
              ({floorNode.floorCode})
            </span>
            <Badge variant="outline" className="ml-2 text-xs">
              {t("structure.shopsCount", { count: floorNode.shops.length })}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() =>
            onGenerateShops(
              venueCode,
              buildingCode,
              floorNode.floorCode,
              floorNode.floorId
            )
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("structure.generateBtn")}
        </Button>
      </div>
      <CollapsibleContent className="mt-2 ml-12 space-y-2">
        {floorNode.shops.length === 0 ? (
          <div className="bg-muted/30 flex items-center justify-between rounded-md border border-dashed p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Store className="h-4 w-4" />
              <span>{t("structure.noShopsOnFloor")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onGenerateShops(
                  venueCode,
                  buildingCode,
                  floorNode.floorCode,
                  floorNode.floorId
                )
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              {t("structure.generateBtn")}
            </Button>
          </div>
        ) : (
          floorNode.shops.map((shop) => (
            <ShopItem
              key={shop.id}
              shop={shop}
              onDelete={onDeleteShop}
              onAssignSeller={onAssignSeller}
              onUnassignSeller={onUnassignSeller}
              onChangeShopType={onChangeShopType}
              sellers={sellers}
              shopTypes={shopTypes}
              t={t}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function BuildingSection({
  buildingNode,
  venueCode,
  onDeleteShop,
  onAssignSeller,
  onUnassignSeller,
  onChangeShopType,
  onAddFloor,
  onGenerateShops,
  sellers,
  shopTypes,
  t,
}: {
  buildingNode: BuildingNode;
  venueCode: string;
  onDeleteShop: (shopId: string) => void;
  onAssignSeller: (shopId: string, sellerId: string) => void;
  onUnassignSeller: (shopId: string) => void;
  onChangeShopType: (shopId: string, shopTypeId: string | null) => void;
  onAddFloor: (buildingId: string, buildingCode: string) => void;
  onGenerateShops: (
    venueCode: string,
    buildingCode: string,
    floorCode: string,
    floorId: string
  ) => void;
  sellers: SellerListItem[];
  shopTypes: ShopTypeData[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const totalShops = buildingNode.floors.reduce(
    (sum, f) => sum + f.shops.length,
    0
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-4 flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-2 py-1.5"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{buildingNode.buildingName}</span>
            <span className="text-muted-foreground text-xs">
              ({buildingNode.buildingCode})
            </span>
            <Badge variant="outline" className="ml-2 text-xs">
              {t("structure.floorsCount", {
                count: buildingNode.floors.length,
              })}{" "}
              · {t("structure.shopsCount", { count: totalShops })}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() =>
            onAddFloor(buildingNode.buildingId, buildingNode.buildingCode)
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("structure.addFloor")}
        </Button>
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        {buildingNode.floors.length === 0 ? (
          <div className="bg-muted/30 ml-10 flex items-center justify-between rounded-md border border-dashed p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4" />
              <span>{t("structure.noFloorsInBuilding")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onAddFloor(buildingNode.buildingId, buildingNode.buildingCode)
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              {t("structure.addFloor")}
            </Button>
          </div>
        ) : (
          buildingNode.floors.map((floor) => (
            <FloorSection
              key={floor.floorId}
              floorNode={floor}
              venueCode={venueCode}
              buildingCode={buildingNode.buildingCode}
              onDeleteShop={onDeleteShop}
              onAssignSeller={onAssignSeller}
              onUnassignSeller={onUnassignSeller}
              onChangeShopType={onChangeShopType}
              onGenerateShops={onGenerateShops}
              sellers={sellers}
              shopTypes={shopTypes}
              t={t}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function VenueSection({
  venueNode,
  onDeleteShop,
  onAssignSeller,
  onUnassignSeller,
  onChangeShopType,
  onAddBuilding,
  onAddFloor,
  onGenerateShops,
  sellers,
  shopTypes,
  t,
}: {
  venueNode: VenueNode;
  onDeleteShop: (shopId: string) => void;
  onAssignSeller: (shopId: string, sellerId: string) => void;
  onUnassignSeller: (shopId: string) => void;
  onChangeShopType: (shopId: string, shopTypeId: string | null) => void;
  onAddBuilding: (venueId: string) => void;
  onAddFloor: (buildingId: string, buildingCode: string) => void;
  onGenerateShops: (
    venueCode: string,
    buildingCode: string,
    floorCode: string,
    floorId: string
  ) => void;
  sellers: SellerListItem[];
  shopTypes: ShopTypeData[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const totalShops = venueNode.buildings.reduce(
    (sum, b) => sum + b.floors.reduce((fSum, f) => fSum + f.shops.length, 0),
    0
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="bg-muted/50 hover:bg-muted flex flex-1 items-center gap-2 rounded-md px-3 py-2"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="text-lg font-semibold">{venueNode.venueName}</span>
            <span className="text-muted-foreground text-sm">
              ({venueNode.venueCode})
            </span>
            <Badge variant="secondary" className="ml-2">
              {t("structure.buildingsCount", {
                count: venueNode.buildings.length,
              })}{" "}
              · {t("structure.shopsCount", { count: totalShops })}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => onAddBuilding(venueNode.venueId)}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("structure.addBuilding")}
        </Button>
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        {venueNode.buildings.length === 0 ? (
          <div className="bg-muted/30 ml-4 flex items-center justify-between rounded-md border border-dashed p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              <span>{t("structure.noBuildingsInVenue")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddBuilding(venueNode.venueId)}
            >
              <Plus className="mr-1 h-3 w-3" />
              {t("structure.addBuilding")}
            </Button>
          </div>
        ) : (
          venueNode.buildings.map((building) => (
            <BuildingSection
              key={building.buildingId}
              buildingNode={building}
              venueCode={venueNode.venueCode}
              onDeleteShop={onDeleteShop}
              onAssignSeller={onAssignSeller}
              onUnassignSeller={onUnassignSeller}
              onChangeShopType={onChangeShopType}
              onAddFloor={onAddFloor}
              onGenerateShops={onGenerateShops}
              sellers={sellers}
              shopTypes={shopTypes}
              t={t}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// SHOP TYPES SECTION
// ============================================================================

function ShopTypesSection({
  shopTypes,
  onAdd,
  onEdit,
  onDelete,
  loading,
  t,
}: {
  shopTypes: ShopTypeData[];
  onAdd: () => void;
  onEdit: (shopType: ShopTypeData) => void;
  onDelete: (shopType: ShopTypeData) => void;
  loading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const st = useTranslations("mallOwner.structure.shopTypes");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {st("title")}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {st("description")}
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {st("addType")}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : shopTypes.length === 0 ? (
          <div className="py-8 text-center">
            <Tag className="text-muted-foreground mx-auto h-10 w-10" />
            <h3 className="mt-3 text-sm font-semibold">{st("emptyTitle")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {st("emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {shopTypes.map((shopType) => (
              <div
                key={shopType.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {shopType.color ? (
                    <div
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: shopType.color }}
                    />
                  ) : (
                    <div className="bg-muted h-4 w-4 shrink-0 rounded-full" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shopType.name_en}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {shopType.key}
                      </Badge>
                      {!shopType.supportsProducts && (
                        <Badge variant="secondary" className="text-xs">
                          No products
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {shopType.name_ru}
                      {shopType.name_am && ` · ${shopType.name_am}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(shopType)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => onDelete(shopType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GenerateShopsDialog({
  open,
  onOpenChange,
  venueCode,
  buildingCode,
  floorCode,
  floorId,
  existingShopCount,
  shopTypes,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueCode: string;
  buildingCode: string;
  floorCode: string;
  floorId: string;
  existingShopCount: number;
  shopTypes: ShopTypeData[];
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const st = useTranslations("mallOwner.structure.shopTypes");
  const [count, setCount] = useState(10);
  const [shopTypeId, setShopTypeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Start number is based on existing shops + 1
  const startNumber = existingShopCount + 1;

  const onGenerate = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post<any>("/mall/shops/generate", {
        venue: venueCode,
        building: buildingCode,
        floor: floorCode,
        floorId,
        startNumber,
        count,
        ...(shopTypeId ? { shopTypeId } : {}),
      });

      const data = unwrapApiResponse<any>(res);
      const createdCount = data.stats?.created ?? 0;
      toast.success(t("structure.generateSuccess", { count: createdCount }));

      // Reset and close
      setCount(10);
      setShopTypeId("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [
    buildingCode,
    count,
    floorCode,
    floorId,
    onOpenChange,
    onSuccess,
    shopTypeId,
    startNumber,
    t,
    toast,
    venueCode,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("structure.generateTitle")}</DialogTitle>
          <DialogDescription>
            {t("structure.generateShopsForFloor", {
              floor: floorCode,
              building: buildingCode,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("structure.venueLabel")}:
              </span>
              <span className="font-medium">{venueCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("structure.buildingLabel")}:
              </span>
              <span className="font-medium">{buildingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("structure.floorLabel")}:
              </span>
              <span className="font-medium">{floorCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("structure.startNumberLabel")}:
              </span>
              <span className="font-medium">{startNumber}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-count">{t("structure.countLabel")}</Label>
            <Input
              id="gen-count"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={100}
            />
            <p className="text-muted-foreground text-xs">
              {t("structure.willCreateShops", {
                from: startNumber,
                to: startNumber + count - 1,
              })}
            </p>
          </div>

          {shopTypes.length > 0 && (
            <div className="space-y-2">
              <Label>{st("typeLabel")}</Label>
              <Select value={shopTypeId} onValueChange={setShopTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder={st("typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {shopTypes.map((stItem) => (
                    <SelectItem key={stItem.id} value={stItem.id}>
                      <div className="flex items-center gap-2">
                        {stItem.color && (
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: stItem.color }}
                          />
                        )}
                        <span>{stItem.name_en}</span>
                        <span className="text-muted-foreground text-xs">
                          ({stItem.key})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("structure.cancelBtn")}
          </Button>
          <Button onClick={onGenerate} disabled={submitting}>
            {submitting
              ? t("structure.generating")
              : t("structure.generateBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ADD VENUE DIALOG
// ============================================================================

function AddVenueDialog({
  open,
  onOpenChange,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const [venueName, setVenueName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!venueName.trim()) return;
    setSubmitting(true);
    try {
      // Get mall info for latitude/longitude
      const mallRes = await apiClient.get<any>("/mall/info");
      const mallData = unwrapApiResponse<{
        latitude: number;
        longitude: number;
      }>(mallRes);

      if (!mallData) {
        toast.error(t("structure.configureMallFirst"));
        setSubmitting(false);
        return;
      }

      await apiClient.post<any>("/mall/venues", {
        name: venueName.trim(),
        latitude: mallData.latitude,
        longitude: mallData.longitude,
      });

      toast.success(t("structure.addVenueSuccess"));
      setVenueName("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [venueName, onOpenChange, onSuccess, t, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("structure.addVenueTitle")}</DialogTitle>
          <DialogDescription>
            {t("structure.addVenueDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-venue-name">
              {t("structure.venueNameLabel")}
            </Label>
            <Input
              id="add-venue-name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Main Complex, North Wing, etc."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("structure.cancelBtn")}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !venueName.trim()}>
            {submitting ? t("structure.adding") : t("structure.addVenueBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ADD BUILDING DIALOG
// ============================================================================

function AddBuildingDialog({
  open,
  onOpenChange,
  venueId,
  venueName,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  venueName: string;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const [buildingName, setBuildingName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!buildingName.trim()) return;
    setSubmitting(true);
    try {
      // Create building within the venue (code is auto-generated by API)
      await apiClient.post<any>("/mall/buildings", {
        venueId,
        name: buildingName.trim(),
      });

      toast.success(t("structure.addBuildingSuccess"));
      setBuildingName("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [buildingName, venueId, onOpenChange, onSuccess, t, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("structure.addBuildingTitle")}</DialogTitle>
          <DialogDescription>
            {t("structure.addBuildingDescription", { venue: venueName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-building-name">
              {t("structure.buildingNameLabel")}
            </Label>
            <Input
              id="add-building-name"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="Main Building, Tower A, etc."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("structure.cancelBtn")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !buildingName.trim()}
          >
            {submitting ? t("structure.adding") : t("structure.addBuildingBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ADD FLOOR DIALOG
// ============================================================================

function AddFloorDialog({
  open,
  onOpenChange,
  buildingId,
  buildingCode,
  existingFloorNumbers,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingCode: string;
  existingFloorNumbers: number[];
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const toast = useToast();
  const [floorNumber, setFloorNumber] = useState(1);
  const [floorLabel, setFloorLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check if floor number already exists
  const floorExists = existingFloorNumbers.includes(floorNumber);

  // Calculate suggested floor number (next available)
  const getNextFloorNumber = useCallback(() => {
    if (existingFloorNumbers.length === 0) return 1;
    const maxNumber = Math.max(...existingFloorNumbers);
    return maxNumber + 1;
  }, [existingFloorNumbers]);

  // Reset floor number when dialog opens
  useEffect(() => {
    if (open) {
      setFloorNumber(getNextFloorNumber());
      setFloorLabel("");
    }
  }, [open, getNextFloorNumber]);

  const onSubmit = useCallback(async () => {
    if (floorExists) {
      toast.error(t("structure.floorAlreadyExists", { number: floorNumber }));
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post<any>(`/mall/buildings/${buildingId}/floors`, {
        number: floorNumber,
        label: floorLabel.trim() || undefined,
      });
      toast.success(t("structure.addFloorSuccess"));
      setFloorLabel("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.apiError(err, t("errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [
    buildingId,
    floorExists,
    floorLabel,
    floorNumber,
    onOpenChange,
    onSuccess,
    t,
    toast,
  ]);

  const incrementFloor = () => setFloorNumber((n) => Math.min(n + 1, 100));
  const decrementFloor = () => setFloorNumber((n) => Math.max(n - 1, -10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("structure.addFloorTitle")}</DialogTitle>
          <DialogDescription>
            {t("structure.addFloorDescription", { building: buildingCode })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-floor-number">
              {t("structure.floorNumberLabel")}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={decrementFloor}
                disabled={floorNumber <= -10}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="add-floor-number"
                type="number"
                value={floorNumber}
                onChange={(e) => setFloorNumber(Number(e.target.value))}
                min={-10}
                max={100}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={incrementFloor}
                disabled={floorNumber >= 100}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {floorExists && (
              <p className="text-destructive text-sm">
                {t("structure.floorAlreadyExists", { number: floorNumber })}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {floorNumber < 0
                ? t("structure.basementFloorHint")
                : floorNumber === 0
                  ? t("structure.groundFloorHint")
                  : t("structure.upperFloorHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-floor-label">
              {t("structure.floorLabelOptional")}
            </Label>
            <Input
              id="add-floor-label"
              value={floorLabel}
              onChange={(e) => setFloorLabel(e.target.value)}
              placeholder="Ground Floor, Basement, Food Court, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("structure.cancelBtn")}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || floorExists}>
            {submitting ? t("structure.adding") : t("structure.addFloorBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MallOwnerStructurePanel(): React.ReactElement {
  const t = useTranslations("mallOwner");
  const st = useTranslations("mallOwner.structure.shopTypes");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<ShopData[]>([]);
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [sellers, setSellers] = useState<SellerListItem[]>([]);
  const [shopTypes, setShopTypes] = useState<ShopTypeData[]>([]);
  const [shopTypesLoading, setShopTypesLoading] = useState(true);

  // Dialog states
  const [addVenueDialogOpen, setAddVenueDialogOpen] = useState(false);
  const [addBuildingDialog, setAddBuildingDialog] = useState<{
    open: boolean;
    venueId: string;
    venueName: string;
  }>({ open: false, venueId: "", venueName: "" });
  const [addFloorDialog, setAddFloorDialog] = useState<{
    open: boolean;
    buildingId: string;
    buildingCode: string;
    existingFloorNumbers: number[];
  }>({
    open: false,
    buildingId: "",
    buildingCode: "",
    existingFloorNumbers: [],
  });
  const [generateShopsDialog, setGenerateShopsDialog] = useState<{
    open: boolean;
    venueCode: string;
    buildingCode: string;
    floorCode: string;
    floorId: string;
    existingShopCount: number;
  }>({
    open: false,
    venueCode: "",
    buildingCode: "",
    floorCode: "",
    floorId: "",
    existingShopCount: 0,
  });

  // Shop type dialog states
  const [addShopTypeDialogOpen, setAddShopTypeDialogOpen] = useState(false);
  const [editShopTypeDialog, setEditShopTypeDialog] = useState<{
    open: boolean;
    shopType: ShopTypeData | null;
  }>({ open: false, shopType: null });
  const [deleteShopTypeDialog, setDeleteShopTypeDialog] = useState<{
    open: boolean;
    shopType: ShopTypeData | null;
  }>({ open: false, shopType: null });
  const [shopTypeSubmitting, setShopTypeSubmitting] = useState(false);

  const fetchShops = useCallback(async () => {
    try {
      let allShops: ShopData[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await apiClient.get<any>(
          `/mall/shops?limit=100&page=${page}`
        );
        const data = unwrapApiResponse<ShopData[]>(res);
        allShops = allShops.concat(data || []);
        hasMore = res.success && res.meta?.hasMore === true;
        page++;
      }

      setShops(allShops);
    } catch (err) {
      toast.apiError(err, t("errors.loadFailed"));
    }
  }, [t, toast]);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/mall/venues");
      const data = unwrapApiResponse<VenueData[]>(res);
      setVenues(data || []);
    } catch (err) {
      // Silently fail - venues may not exist yet (mall not configured)
      setVenues([]);
    }
  }, []);

  const fetchSellers = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/mall/sellers?limit=1000");
      const data = unwrapApiResponse<SellerListItem[]>(res);
      setSellers(data || []);
    } catch (err) {
      // Silently fail - sellers are optional for structure view
    }
  }, []);

  const fetchShopTypes = useCallback(async () => {
    setShopTypesLoading(true);
    try {
      const res = await apiClient.get<any>("/mall/shop-types");
      const data = unwrapApiResponse<ShopTypeData[]>(res);
      setShopTypes(data || []);
    } catch {
      setShopTypes([]);
    } finally {
      setShopTypesLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchShops(),
      fetchVenues(),
      fetchSellers(),
      fetchShopTypes(),
    ]);
    setLoading(false);
  }, [fetchShops, fetchVenues, fetchSellers, fetchShopTypes]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onDeleteShop = useCallback(
    async (shopId: string) => {
      try {
        await apiClient.delete(`/mall/shops/${shopId}`);
        toast.success(t("structure.deleteSuccess"));
        await fetchAll();
      } catch (err) {
        toast.apiError(err, t("errors.saveFailed"));
      }
    },
    [fetchAll, t, toast]
  );

  const onAssignSeller = useCallback(
    async (shopId: string, sellerId: string) => {
      try {
        await apiClient.post(`/mall/shops/${shopId}`, {
          action: "assign",
          sellerId,
        });
        toast.success(t("structure.assignSuccess"));
        await fetchAll();
      } catch (err) {
        toast.apiError(err, t("errors.saveFailed"));
      }
    },
    [fetchAll, t, toast]
  );

  const onUnassignSeller = useCallback(
    async (shopId: string) => {
      try {
        await apiClient.post(`/mall/shops/${shopId}`, {
          action: "unassign",
        });
        toast.success(t("structure.unassignSuccess"));
        await fetchAll();
      } catch (err) {
        toast.apiError(err, t("errors.saveFailed"));
      }
    },
    [fetchAll, t, toast]
  );

  const onChangeShopType = useCallback(
    async (shopId: string, shopTypeId: string | null) => {
      try {
        await apiClient.put(`/mall/shops/${shopId}`, { shopTypeId });
        await fetchAll();
      } catch (err) {
        toast.apiError(err, t("errors.saveFailed"));
      }
    },
    [fetchAll, t, toast]
  );

  const onAddBuilding = useCallback(
    (venueId: string) => {
      const venue = venues.find((v) => v.id === venueId);
      setAddBuildingDialog({
        open: true,
        venueId,
        venueName: venue?.name || "",
      });
    },
    [venues]
  );

  const onAddFloor = useCallback(
    (buildingId: string, buildingCode: string) => {
      // Find existing floor numbers for this building
      const building = venues
        .flatMap((v) => v.buildings)
        .find((b) => b.id === buildingId);
      const existingFloorNumbers = building?.floors.map((f) => f.number) || [];

      setAddFloorDialog({
        open: true,
        buildingId,
        buildingCode,
        existingFloorNumbers,
      });
    },
    [venues]
  );

  const onGenerateShops = useCallback(
    (
      venueCode: string,
      buildingCode: string,
      floorCode: string,
      floorId: string
    ) => {
      // Count existing shops on this floor
      const existingShopCount = shops.filter(
        (s) =>
          s.location.building === buildingCode && s.location.floor === floorCode
      ).length;

      setGenerateShopsDialog({
        open: true,
        venueCode,
        buildingCode,
        floorCode,
        floorId,
        existingShopCount,
      });
    },
    [shops]
  );

  // Shop type CRUD handlers
  const onCreateShopType = useCallback(
    async (data: ShopTypeFormData) => {
      setShopTypeSubmitting(true);
      try {
        await apiClient.post("/mall/shop-types", data);
        toast.success(st("createSuccess"));
        setAddShopTypeDialogOpen(false);
        await fetchShopTypes();
      } catch (err) {
        toast.apiError(err, st("createSuccess"));
      } finally {
        setShopTypeSubmitting(false);
      }
    },
    [fetchShopTypes, st, toast]
  );

  const onUpdateShopType = useCallback(
    async (data: ShopTypeFormData) => {
      if (!editShopTypeDialog.shopType) return;
      setShopTypeSubmitting(true);
      try {
        await apiClient.put(
          `/mall/shop-types/${editShopTypeDialog.shopType.id}`,
          data
        );
        toast.success(st("updateSuccess"));
        setEditShopTypeDialog({ open: false, shopType: null });
        await fetchShopTypes();
      } catch (err) {
        toast.apiError(err, st("updateSuccess"));
      } finally {
        setShopTypeSubmitting(false);
      }
    },
    [editShopTypeDialog.shopType, fetchShopTypes, st, toast]
  );

  const onDeleteShopType = useCallback(
    async (shopType: ShopTypeData) => {
      setShopTypeSubmitting(true);
      try {
        await apiClient.delete(`/mall/shop-types/${shopType.id}`);
        toast.success(st("deleteSuccess"));
        setDeleteShopTypeDialog({ open: false, shopType: null });
        await fetchShopTypes();
      } catch (err) {
        toast.apiError(err, st("deleteBlocked", { count: 0 }));
        setDeleteShopTypeDialog({ open: false, shopType: null });
      } finally {
        setShopTypeSubmitting(false);
      }
    },
    [fetchShopTypes, st, toast]
  );

  // Build structure tree from venues and shops
  const structureTree = buildStructureTree(venues, shops);

  return (
    <div className="space-y-6">
      <ShopTypesSection
        shopTypes={shopTypes}
        onAdd={() => setAddShopTypeDialogOpen(true)}
        onEdit={(shopType) => setEditShopTypeDialog({ open: true, shopType })}
        onDelete={(shopType) =>
          setDeleteShopTypeDialog({ open: true, shopType })
        }
        loading={shopTypesLoading}
        t={t}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("tabs.structure")}</CardTitle>
          <Button onClick={() => setAddVenueDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("structure.addVenue")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : structureTree.length === 0 ? (
            <div className="py-12 text-center">
              <MapPin className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">
                {t("structure.emptyTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("structure.emptyVenueDescription")}
              </p>
              <Button
                className="mt-4"
                onClick={() => setAddVenueDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("structure.addVenue")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {structureTree.map((venueNode) => (
                <VenueSection
                  key={venueNode.venueId}
                  venueNode={venueNode}
                  onDeleteShop={onDeleteShop}
                  onAssignSeller={onAssignSeller}
                  onUnassignSeller={onUnassignSeller}
                  onChangeShopType={onChangeShopType}
                  onAddBuilding={onAddBuilding}
                  onAddFloor={onAddFloor}
                  onGenerateShops={onGenerateShops}
                  sellers={sellers}
                  shopTypes={shopTypes}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>

        <AddVenueDialog
          open={addVenueDialogOpen}
          onOpenChange={setAddVenueDialogOpen}
          onSuccess={fetchAll}
          t={t}
        />

        <AddBuildingDialog
          open={addBuildingDialog.open}
          onOpenChange={(open) =>
            setAddBuildingDialog((prev) => ({ ...prev, open }))
          }
          venueId={addBuildingDialog.venueId}
          venueName={addBuildingDialog.venueName}
          onSuccess={fetchAll}
          t={t}
        />

        <AddFloorDialog
          open={addFloorDialog.open}
          onOpenChange={(open) =>
            setAddFloorDialog((prev) => ({ ...prev, open }))
          }
          buildingId={addFloorDialog.buildingId}
          buildingCode={addFloorDialog.buildingCode}
          existingFloorNumbers={addFloorDialog.existingFloorNumbers}
          onSuccess={fetchAll}
          t={t}
        />

        <GenerateShopsDialog
          open={generateShopsDialog.open}
          onOpenChange={(open) =>
            setGenerateShopsDialog((prev) => ({ ...prev, open }))
          }
          venueCode={generateShopsDialog.venueCode}
          buildingCode={generateShopsDialog.buildingCode}
          floorCode={generateShopsDialog.floorCode}
          floorId={generateShopsDialog.floorId}
          existingShopCount={generateShopsDialog.existingShopCount}
          shopTypes={shopTypes}
          onSuccess={fetchAll}
          t={t}
        />
      </Card>

      <AddShopTypeDialog
        open={addShopTypeDialogOpen}
        onOpenChange={setAddShopTypeDialogOpen}
        onSubmit={onCreateShopType}
        submitting={shopTypeSubmitting}
      />

      <EditShopTypeDialog
        open={editShopTypeDialog.open}
        onOpenChange={(open) =>
          setEditShopTypeDialog((prev) => ({ ...prev, open }))
        }
        shopType={editShopTypeDialog.shopType}
        onSubmit={onUpdateShopType}
        submitting={shopTypeSubmitting}
      />

      <Dialog
        open={deleteShopTypeDialog.open}
        onOpenChange={(open) =>
          setDeleteShopTypeDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{st("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {st("deleteConfirmDescription", {
                name: deleteShopTypeDialog.shopType?.name_en || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteShopTypeDialog({ open: false, shopType: null })
              }
            >
              {t("structure.cancelBtn")}
            </Button>
            <Button
              variant="destructive"
              disabled={shopTypeSubmitting}
              onClick={() => {
                if (deleteShopTypeDialog.shopType) {
                  onDeleteShopType(deleteShopTypeDialog.shopType);
                }
              }}
            >
              {t("structure.deleteBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
