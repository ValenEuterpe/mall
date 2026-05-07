import { MAIN_OPEN_AREA } from "../constants";

export function normalizeBuilding(building: string | null | undefined): string | null {
    if (!building || building === MAIN_OPEN_AREA || building.trim() === "") {
        return null;
    }
    return building.trim();
}