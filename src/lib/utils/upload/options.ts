import { DEFAULT_OPTIONS } from "./constants";
import { UploadOptions } from "./types";

export function parseUploadOptions(formData: FormData): UploadOptions {
  const options = { ...DEFAULT_OPTIONS };

  if (formData.get("generateThumbnail") === "true") {
    options.generateThumbnail = true;
  }

  const maxWidthValue = formData.get("maxWidth");
  if (maxWidthValue !== null && maxWidthValue !== "") {
    const maxWidth = Number(maxWidthValue);
    if (!isNaN(maxWidth)) {
      options.maxWidth = Math.min(Math.max(maxWidth, 100), 4096);
    }
  }

  const maxHeightValue = formData.get("maxHeight");
  if (maxHeightValue !== null && maxHeightValue !== "") {
    const maxHeight = Number(maxHeightValue);
    if (!isNaN(maxHeight)) {
      options.maxHeight = Math.min(Math.max(maxHeight, 100), 4096);
    }
  }

  const qualityValue = formData.get("quality");
  if (qualityValue !== null && qualityValue !== "") {
    const quality = Number(qualityValue);
    if (!isNaN(quality)) {
      options.quality = Math.min(Math.max(quality, 1), 100);
    }
  }

  return options;
}
