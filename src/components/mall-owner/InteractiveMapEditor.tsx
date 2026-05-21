"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/utils/toast";
import { mallApiFetch } from "@/lib/api-client";
import { Settings } from "lucide-react";
import { MallSetupDialog } from "./dialogs/MallSetupDialog";
import { UploadSvgDialog } from "./dialogs/UploadSvgDialog";
import { ShopAssignmentPanel, FloorShop } from "./ShopAssignmentPanel";

// Types
interface Mall {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  buildings: Building[];
  venues: Venue[];
}

interface FloorMap {
  id: string;
  svgUrl: string;
  shopIds: string[];
}

interface Floor {
  id: string;
  number: number;
  label?: string | null;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
  rotation?: number | null;
  scale?: number | null;
  floorMap: FloorMap | null;
  _count?: { shops: number };
}

interface Building {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rotation: number;
  scale: number;
  floors: Floor[];
}

interface Venue {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rotation: number;
  scale: number;
  svgUrl?: string | null;
  shopIds: string[];
}

interface ParsedShopId {
  id: string;
  venue?: number;
  building?: number;
  floor?: number;
  shop: number;
}

// Dynamically import Map component (Leaflet requires window)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
// Default mall location (Yerevan, Armenia - target market)
const DEFAULT_CENTER: [number, number] = [40.1872, 44.5152];
const DEFAULT_ZOOM = 17;

export function InteractiveMapEditor() {
  const t = useTranslations("mapEditor");

  // State
  const [mall, setMall] = useState<Mall | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"buildings" | "venues">(
    "buildings"
  );

  // Selected items for editing
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null
  );
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);

  // Dialogs
  const [showMallSetup, setShowMallSetup] = useState(false);
  const [showUploadSvg, setShowUploadSvg] = useState(false);

  // SVG upload state
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [parsedShopIds, setParsedShopIds] = useState<ParsedShopId[]>([]);
  const [uploading, setUploading] = useState(false);

  // Geo-positioning state
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(true);
  const [showOtherFloors, setShowOtherFloors] = useState(false);

  // Saved state for cancel functionality
  const [savedPosition, setSavedPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [savedRotation, setSavedRotation] = useState(0);
  const [savedScale, setSavedScale] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Shop assignment state
  const [floorShops, setFloorShops] = useState<FloorShop[]>([]);
  const [selectedShopForAssignment, setSelectedShopForAssignment] =
    useState<FloorShop | null>(null);
  const [pendingPathAssignment, setPendingPathAssignment] = useState<{
    pathId: string;
    currentShop: FloorShop | null;
  } | null>(null);

  // Load mall data
  const loadMall = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mallApiFetch("/api/v1/mall/info");
      const data = await res.json();

      if (data.success && data.data) {
        setMall(data.data);
      }
      // Don't auto-open dialog - show inline prompt instead
    } catch (error) {
      toast.error(t("messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMall();
  }, [loadMall]);

  // Sync selected building/venue with updated mall data
  useEffect(() => {
    if (!mall) return;

    // Update selectedBuilding if it exists in the new mall data
    if (selectedBuilding) {
      const updatedBuilding = mall.buildings.find(
        (b) => b.id === selectedBuilding.id
      );
      if (updatedBuilding) {
        setSelectedBuilding(updatedBuilding);
        // If a floor was selected, keep it selected
        let activeFloor: Floor | null = null;
        if (selectedFloor !== null) {
          const updatedFloor = updatedBuilding.floors.find(
            (f) => f.id === selectedFloor.id
          );
          if (updatedFloor) {
            activeFloor = updatedFloor;
            setSelectedFloor(updatedFloor);
          } else if (updatedBuilding.floors.length > 0) {
            activeFloor = updatedBuilding.floors[0];
            setSelectedFloor(updatedBuilding.floors[0]);
          } else {
            setSelectedFloor(null);
          }
        }
        // Sync position state with the floor's (or building's) geo after data reload
        if (!hasUnsavedChanges) {
          const geo = getFloorGeo(activeFloor, updatedBuilding);
          const pos = { lat: geo.lat, lng: geo.lng };
          setPosition(pos);
          setRotation(geo.rotation);
          setScale(geo.scale);
          setSavedPosition(pos);
          setSavedRotation(geo.rotation);
          setSavedScale(geo.scale);
        }
      }
    }

    // Update selectedVenue if it exists in the new mall data
    if (selectedVenue) {
      const updatedVenue = mall.venues.find((v) => v.id === selectedVenue.id);
      if (updatedVenue) {
        setSelectedVenue(updatedVenue);
      }
    }
  }, [mall]);

  // Handlers will be added in the next part
  const handleMallSetup = async (
    name: string,
    lat: number,
    lng: number,
    address?: string
  ) => {
    try {
      const res = await mallApiFetch("/api/v1/mall/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, latitude: lat, longitude: lng, address }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t("messages.mallConfigured"));
        setShowMallSetup(false);
        loadMall();
      } else {
        toast.error(data.error?.message || t("messages.configFailed"));
      }
    } catch (error) {
      toast.error(t("messages.configFailed"));
    }
  };

  const handleSvgFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSvgFile(file);
    const content = await file.text();
    setSvgContent(content);

    // Parse SVG for shop IDs (optional - SVG can have no shops defined yet)
    try {
      const res = await mallApiFetch("/api/v1/mall/maps/parse-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ svgContent: content }),
      });
      const data = await res.json();

      if (data.success) {
        setParsedShopIds(data.data.shopIds);
        if (data.data.matchedCount > 0) {
          toast.success(
            t("messages.shopElementsFound", { count: data.data.matchedCount })
          );
        } else {
          toast.info(t("messages.svgLoadedNoShops"));
        }
      } else {
        // SVG validation failed (e.g., missing <svg> tag)
        toast.error(data.error?.message || t("messages.parseFailed"));
        setSvgFile(null);
        setSvgContent("");
      }
    } catch (error) {
      toast.error(t("messages.parseFailed"));
      setSvgFile(null);
      setSvgContent("");
    }
  };

  const handleUpdatePosition = async () => {
    if (!position) return;

    if (selectedBuilding && selectedFloor) {
      // Save to floor-level geo endpoint
      try {
        const res = await mallApiFetch(
          `/api/v1/mall/buildings/${selectedBuilding.id}/floors/${selectedFloor.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.lat,
              longitude: position.lng,
              rotation,
              scale,
            }),
          }
        );
        const data = await res.json();

        if (data.success) {
          toast.success(t("messages.positionUpdated"));
          loadMall();
        } else {
          toast.error(
            data.error?.message || t("messages.updatePositionFailed")
          );
        }
      } catch (error) {
        toast.error(t("messages.updatePositionFailed"));
      }
    } else if (selectedBuilding) {
      // Fallback: save to building-level (no floor selected)
      try {
        const res = await mallApiFetch(
          `/api/v1/mall/buildings/${selectedBuilding.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.lat,
              longitude: position.lng,
              rotation,
              scale,
            }),
          }
        );
        const data = await res.json();

        if (data.success) {
          toast.success(t("messages.positionUpdated"));
          loadMall();
        } else {
          toast.error(
            data.error?.message || t("messages.updatePositionFailed")
          );
        }
      } catch (error) {
        toast.error(t("messages.updatePositionFailed"));
      }
    } else if (selectedVenue) {
      try {
        const res = await mallApiFetch(
          `/api/v1/mall/venues/${selectedVenue.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.lat,
              longitude: position.lng,
              rotation,
              scale,
            }),
          }
        );
        const data = await res.json();

        if (data.success) {
          toast.success(t("messages.positionUpdated"));
          loadMall();
        } else {
          toast.error(
            data.error?.message || t("messages.updatePositionFailed")
          );
        }
      } catch (error) {
        toast.error(t("messages.updatePositionFailed"));
      }
    }
  };

  const handleUploadSvg = async () => {
    if (!svgFile || !svgContent) {
      toast.error(t("messages.noSvgSelected"));
      return;
    }

    setUploading(true);
    try {
      // First upload the file to storage
      const formData = new FormData();
      formData.append("file", svgFile);
      formData.append("type", "svg");

      const uploadRes = await mallApiFetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Upload failed:", uploadRes.status, errorText);
        toast.error(t("messages.uploadFailed"));
        return;
      }

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        toast.error(uploadData.error?.message || t("messages.uploadFailed"));
        return;
      }

      const svgUrl = uploadData.data.url;

      // Then save to the appropriate entity
      if (selectedBuilding && selectedFloor !== null) {
        // Create or update the floor map for the selected floor
        // First, check if floor already has a map - if so, we need to update via maps API
        const res = await mallApiFetch("/api/v1/mall/maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildingCode: selectedBuilding.code,
            floor: selectedFloor.number,
            svgUrl,
          }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success(t("messages.floorMapSaved"));
          setShowUploadSvg(false);
          setSvgFile(null);
          setSvgContent("");
          setParsedShopIds([]);
          loadMall();
        } else {
          toast.error(data.error?.message || t("messages.uploadFailed"));
        }
      } else if (selectedVenue) {
        // Save venue map with position (rotation/scale)
        const res = await mallApiFetch(
          `/api/v1/mall/venues/${selectedVenue.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              svgUrl,
              rotation,
              scale,
            }),
          }
        );
        const data = await res.json();

        if (data.success) {
          toast.success(t("messages.venueMapSaved"));
          setShowUploadSvg(false);
          setSvgFile(null);
          setSvgContent("");
          setParsedShopIds([]);
          loadMall();
        } else {
          toast.error(data.error?.message || t("messages.uploadFailed"));
        }
      }
    } catch (error) {
      console.error("SVG upload error:", error);
      toast.error(t("messages.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  // Helper: get geo for a floor (falls back to building-level)
  const getFloorGeo = (floor: Floor | null, building: Building) => ({
    lat: floor?.latitude ?? building.latitude,
    lng: floor?.longitude ?? building.longitude,
    rotation: floor?.rotation ?? building.rotation,
    scale: floor?.scale ?? building.scale,
  });

  // Select a building/venue for editing
  const selectBuilding = (building: Building) => {
    setSelectedBuilding(building);
    setSelectedVenue(null);
    const floor = building.floors.length > 0 ? building.floors[0] : null;
    setSelectedFloor(floor);
    const geo = getFloorGeo(floor, building);
    const pos = { lat: geo.lat, lng: geo.lng };
    setPosition(pos);
    setRotation(geo.rotation);
    setScale(geo.scale);
    // Save initial state for cancel
    setSavedPosition(pos);
    setSavedRotation(geo.rotation);
    setSavedScale(geo.scale);
    setHasUnsavedChanges(false);
    setIsEditMode(true);
  };

  const selectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedBuilding(null);
    setSelectedFloor(null);
    const pos = { lat: venue.latitude, lng: venue.longitude };
    setPosition(pos);
    setRotation(venue.rotation);
    setScale(venue.scale);
    // Save initial state for cancel
    setSavedPosition(pos);
    setSavedRotation(venue.rotation);
    setSavedScale(venue.scale);
    setHasUnsavedChanges(false);
    setIsEditMode(true);
  };

  // Track unsaved changes
  const handlePositionChange = (pos: { lat: number; lng: number }) => {
    setPosition(pos);
    setHasUnsavedChanges(true);
  };

  const handleRotationChange = (r: number) => {
    setRotation(((r % 360) + 360) % 360);
    setHasUnsavedChanges(true);
  };

  const handleScaleChange = (s: number) => {
    setScale(s);
    setHasUnsavedChanges(true);
  };

  // Cancel changes - revert to saved state
  const handleCancel = () => {
    if (savedPosition) {
      setPosition(savedPosition);
      setRotation(savedRotation);
      setScale(savedScale);
      setHasUnsavedChanges(false);
      toast.info(t("messages.changesReverted"));
    }
  };

  // Shop assignment handlers
  const handleShopsLoaded = useCallback((shops: FloorShop[]) => {
    setFloorShops(shops);
  }, []);

  // Load floor shops when floor is selected (for coloring in both Edit and Preview modes)
  useEffect(() => {
    if (!selectedBuilding || !selectedFloor) {
      setFloorShops([]);
      return;
    }

    const loadFloorShops = async () => {
      try {
        const res = await mallApiFetch(
          `/api/v1/mall/buildings/${selectedBuilding.id}/floors/${selectedFloor.id}/shops`
        );
        if (!res.ok) {
          if (res.status !== 404) {
            console.error(
              "Failed to load floor shops:",
              res.status,
              res.statusText
            );
          }
          return;
        }
        const data = await res.json();
        if (data.success) {
          setFloorShops(data.data);
        }
      } catch (error) {
        console.error("Failed to load floor shops:", error);
      }
    };

    loadFloorShops();
  }, [selectedBuilding?.id, selectedFloor?.id]);

  const handleSelectShopForAssignment = (shop: FloorShop | null) => {
    setSelectedShopForAssignment(shop);
  };

  const handlePathClick = (pathId: string) => {
    if (!selectedShopForAssignment) {
      toast.info(t("shopAssignment.selectShop"));
      return;
    }

    // Check if this path is already assigned to another shop
    const existingAssignment = floorShops.find((s) => s.svgId === pathId);

    if (
      existingAssignment &&
      existingAssignment.id !== selectedShopForAssignment.id
    ) {
      // Path is assigned to a different shop - show confirmation
      setPendingPathAssignment({
        pathId,
        currentShop: existingAssignment,
      });
    } else {
      // Path is free or belongs to the selected shop - assign directly
      assignPathToShop(pathId, selectedShopForAssignment.id);
    }
  };

  const assignPathToShop = async (pathId: string, shopId: string) => {
    try {
      const res = await mallApiFetch(`/api/v1/mall/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ svgId: pathId }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t("shopAssignment.assignSuccess"));
        // Refresh floor shops
        if (selectedBuilding && selectedFloor) {
          const shopsRes = await mallApiFetch(
            `/api/v1/mall/buildings/${selectedBuilding.id}/floors/${selectedFloor.id}/shops`
          );
          if (shopsRes.ok) {
            const shopsData = await shopsRes.json();
            if (shopsData.success) {
              setFloorShops(shopsData.data);
            }
          }
        }
      } else {
        toast.error(t("shopAssignment.assignFailed"));
      }
    } catch (error) {
      toast.error(t("shopAssignment.assignFailed"));
    }
  };

  const handleConfirmReassign = async () => {
    if (!pendingPathAssignment || !selectedShopForAssignment) return;

    // First clear the old assignment
    if (pendingPathAssignment.currentShop) {
      await mallApiFetch(
        `/api/v1/mall/shops/${pendingPathAssignment.currentShop.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ svgId: null }),
        }
      );
    }

    // Then assign to new shop
    await assignPathToShop(
      pendingPathAssignment.pathId,
      selectedShopForAssignment.id
    );
    setPendingPathAssignment(null);
  };

  const handleCancelReassign = () => {
    setPendingPathAssignment(null);
  };

  // Confirm changes - save to database
  const handleConfirm = async () => {
    if (!position) return;

    // Switch to preview mode first
    setIsEditMode(false);

    // Then save
    await handleUpdatePosition();

    // Update saved state
    setSavedPosition(position);
    setSavedRotation(rotation);
    setSavedScale(scale);
    setHasUnsavedChanges(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Show setup prompt if no mall configured
  if (!mall) {
    // If dialog is open, only show the dialog (no background card)
    if (showMallSetup) {
      return (
        <MallSetupDialog
          open={true}
          onOpenChange={setShowMallSetup}
          onSubmit={handleMallSetup}
          defaultCenter={DEFAULT_CENTER}
        />
      );
    }

    // Show the setup prompt card
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("configureMall")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("messages.configureMallHint")}
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowMallSetup(true)} className="w-full">
            {t("configureMall")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mall Setup Dialog */}
      <MallSetupDialog
        open={showMallSetup}
        onOpenChange={setShowMallSetup}
        onSubmit={handleMallSetup}
        defaultCenter={DEFAULT_CENTER}
      />

      {/* Upload SVG Dialog */}
      <UploadSvgDialog
        open={showUploadSvg}
        onOpenChange={setShowUploadSvg}
        onFileChange={handleSvgFileChange}
        onUpload={handleUploadSvg}
        svgFile={svgFile}
        parsedShopIds={parsedShopIds}
        uploading={uploading}
        isBuilding={!!selectedBuilding}
        selectedFloor={selectedFloor}
        onFloorChange={setSelectedFloor}
        existingFloors={selectedBuilding?.floors || []}
      />

      {mall && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{mall.name}</h2>
              {mall.address && (
                <p className="text-muted-foreground">{mall.address}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMallSetup(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t("editMallInfo")}
            </Button>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left panel - Building/Floor/Venue selection */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) =>
                    setActiveTab(v as "buildings" | "venues")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buildings">
                      {t("buildings")}
                    </TabsTrigger>
                    <TabsTrigger value="venues">{t("venues")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeTab === "buildings" && (
                  <div className="space-y-4">
                    {mall.buildings.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-sm">
                        {t("messages.noBuildingsYet")}
                      </p>
                    ) : (
                      <>
                        {/* Building Selector */}
                        <div className="space-y-2">
                          <Label htmlFor="building-select">
                            {t("selectBuilding")}
                          </Label>
                          <Select
                            value={selectedBuilding?.id || ""}
                            onValueChange={(buildingId) => {
                              const building = mall.buildings.find(
                                (b) => b.id === buildingId
                              );
                              if (building) selectBuilding(building);
                            }}
                          >
                            <SelectTrigger id="building-select">
                              <SelectValue
                                placeholder={t("selectBuildingPlaceholder")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {mall.buildings.map((building) => (
                                <SelectItem
                                  key={building.id}
                                  value={building.id}
                                >
                                  {building.name} ({building.code}) -{" "}
                                  {building.floors.length} floors
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Floor Selector - only show when building is selected */}
                        {selectedBuilding && (
                          <div className="space-y-2">
                            <Label htmlFor="floor-select">
                              {t("selectFloor")}
                            </Label>
                            {selectedBuilding.floors.length === 0 ? (
                              <p className="text-muted-foreground py-2 text-sm">
                                {t("messages.noFloorsYet")}
                              </p>
                            ) : (
                              <Select
                                value={selectedFloor?.id || ""}
                                onValueChange={(floorId) => {
                                  const floor = selectedBuilding.floors.find(
                                    (f) => f.id === floorId
                                  );
                                  if (floor) {
                                    setSelectedFloor(floor);
                                    const geo = getFloorGeo(
                                      floor,
                                      selectedBuilding
                                    );
                                    const pos = { lat: geo.lat, lng: geo.lng };
                                    setPosition(pos);
                                    setRotation(geo.rotation);
                                    setScale(geo.scale);
                                    setSavedPosition(pos);
                                    setSavedRotation(geo.rotation);
                                    setSavedScale(geo.scale);
                                    setHasUnsavedChanges(false);
                                  }
                                }}
                              >
                                <SelectTrigger id="floor-select">
                                  <SelectValue
                                    placeholder={t("selectFloorPlaceholder")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedBuilding.floors.map((floor) => (
                                    <SelectItem key={floor.id} value={floor.id}>
                                      {floor.code}
                                      {floor.label
                                        ? ` - ${floor.label}`
                                        : ""}{" "}
                                      {floor.floorMap ? "✓" : "(no map)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}

                        {/* Floor Map Status & Upload */}
                        {selectedBuilding && selectedFloor && (
                          <div className="space-y-3 border-t pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {t("floorMap")}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {selectedFloor.floorMap
                                    ? t("svgUploaded", {
                                        count:
                                          selectedFloor.floorMap.shopIds
                                            ?.length || 0,
                                      })
                                    : t("noMapUploaded")}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setShowUploadSvg(true)}
                              >
                                {selectedFloor.floorMap
                                  ? t("replaceSvg")
                                  : t("uploadSvg")}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Shop Assignment Panel - show when floor has a map and not in edit mode */}
                        {selectedBuilding &&
                          selectedFloor &&
                          selectedFloor.floorMap &&
                          !isEditMode && (
                            <ShopAssignmentPanel
                              buildingId={selectedBuilding.id}
                              floorId={selectedFloor.id}
                              selectedShopId={
                                selectedShopForAssignment?.id || null
                              }
                              onSelectShop={handleSelectShopForAssignment}
                              onShopsLoaded={handleShopsLoaded}
                              pendingPathAssignment={pendingPathAssignment}
                              onConfirmReassign={handleConfirmReassign}
                              onCancelReassign={handleCancelReassign}
                            />
                          )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "venues" && (
                  <div className="space-y-4">
                    {mall.venues.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-sm">
                        {t("messages.noVenuesYet")}
                      </p>
                    ) : (
                      <>
                        {/* Venue Selector */}
                        <div className="space-y-2">
                          <Label htmlFor="venue-select">
                            {t("selectVenue")}
                          </Label>
                          <Select
                            value={selectedVenue?.id || ""}
                            onValueChange={(venueId) => {
                              const venue = mall.venues.find(
                                (v) => v.id === venueId
                              );
                              if (venue) selectVenue(venue);
                            }}
                          >
                            <SelectTrigger id="venue-select">
                              <SelectValue
                                placeholder={t("selectVenuePlaceholder")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {mall.venues.map((venue) => (
                                <SelectItem key={venue.id} value={venue.id}>
                                  {venue.name} ({venue.code}){" "}
                                  {venue.svgUrl ? "✓" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Venue Map Status & Upload */}
                        {selectedVenue && (
                          <div className="space-y-3 border-t pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {t("venueMap")}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {selectedVenue.svgUrl
                                    ? t("svgUploaded", {
                                        count:
                                          selectedVenue.shopIds?.length || 0,
                                      })
                                    : t("noMapUploaded")}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setShowUploadSvg(true)}
                              >
                                {selectedVenue.svgUrl
                                  ? t("replaceSvg")
                                  : t("uploadSvg")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right panel - Map and controls */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                {/* Map will be rendered here */}
                <div className="mb-4 h-[500px] overflow-hidden rounded-lg border">
                  <MapView
                    center={
                      mall ? [mall.latitude, mall.longitude] : DEFAULT_CENTER
                    }
                    position={position}
                    rotation={rotation}
                    scale={scale}
                    onPositionChange={handlePositionChange}
                    onRotationChange={handleRotationChange}
                    onScaleChange={handleScaleChange}
                    selectedBuilding={selectedBuilding}
                    selectedVenue={selectedVenue}
                    selectedFloor={selectedFloor}
                    onFloorChange={(floor: Floor | null) => {
                      setSelectedFloor(floor);
                      if (selectedBuilding) {
                        const geo = getFloorGeo(floor, selectedBuilding);
                        const pos = { lat: geo.lat, lng: geo.lng };
                        setPosition(pos);
                        setRotation(geo.rotation);
                        setScale(geo.scale);
                        setSavedPosition(pos);
                        setSavedRotation(geo.rotation);
                        setSavedScale(geo.scale);
                        setHasUnsavedChanges(false);
                      }
                    }}
                    isEditMode={isEditMode}
                    showOtherFloors={showOtherFloors}
                    dialogOpen={showUploadSvg}
                    shopAssignmentMode={!!selectedFloor?.floorMap}
                    shopAssignments={floorShops.map((s) => ({
                      shopId: s.id,
                      shopCode: s.fullCode,
                      svgId: s.svgId,
                      sellerId: s.sellerId,
                    }))}
                    selectedShopForAssignment={
                      selectedShopForAssignment?.id || null
                    }
                    onPathClick={handlePathClick}
                  />
                </div>

                {/* Position controls */}
                {(selectedBuilding || selectedVenue) && (
                  <div className="space-y-4">
                    {/* Header with mode toggle */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {t("positioning", {
                          name:
                            selectedBuilding?.name || selectedVenue?.name || "",
                        })}
                      </h3>
                      <div className="flex items-center gap-4">
                        {/* Edit/Preview toggle */}
                        <div className="flex items-center gap-2">
                          <Label htmlFor="edit-mode" className="text-sm">
                            {isEditMode ? t("editMode") : t("previewMode")}
                          </Label>
                          <Switch
                            id="edit-mode"
                            checked={isEditMode}
                            onCheckedChange={setIsEditMode}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Other floors visibility toggle (only for buildings with multiple floors with maps) */}
                    {selectedBuilding &&
                      selectedBuilding.floors.filter((f) => f.floorMap).length >
                        1 && (
                        <div className="flex items-center gap-2">
                          <Switch
                            id="show-other-floors"
                            checked={showOtherFloors}
                            onCheckedChange={setShowOtherFloors}
                          />
                          <Label
                            htmlFor="show-other-floors"
                            className="text-sm"
                          >
                            {t("showOtherFloors")}
                          </Label>
                        </div>
                      )}

                    {/* Rotation and Scale sliders - only in edit mode */}
                    {isEditMode && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t("rotation", { value: rotation })}</Label>
                          <Slider
                            value={[rotation]}
                            onValueChange={([v]) => handleRotationChange(v)}
                            min={0}
                            max={360}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label>
                            {t("scale", { value: scale.toFixed(2) })}
                          </Label>
                          <Slider
                            value={[scale]}
                            onValueChange={([v]) => handleScaleChange(v)}
                            min={0.1}
                            max={5}
                            step={0.1}
                          />
                        </div>
                      </div>
                    )}

                    {/* Confirm/Cancel buttons */}
                    <div className="flex items-center justify-between border-t pt-2">
                      <div className="text-muted-foreground text-sm">
                        {hasUnsavedChanges ? (
                          <span className="font-medium text-orange-500">
                            ● {t("unsavedChanges")}
                          </span>
                        ) : (
                          <span className="text-green-500">
                            ✓ {t("positionSaved")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          disabled={!hasUnsavedChanges}
                        >
                          {t("cancelBtn")}
                        </Button>
                        <Button
                          onClick={handleConfirm}
                          disabled={!hasUnsavedChanges}
                        >
                          {t("confirmAndSave")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!selectedBuilding && !selectedVenue && (
                  <p className="text-muted-foreground text-center">
                    {t("selectToPosition")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
    </div>
  ),
});

export default InteractiveMapEditor;
