"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  File,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Trash2,
  Upload,
  X,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface UploadedFile {
  id: string;
  /** Present when the file was newly added this session */
  file?: File;
  /** Optional preview for images */
  previewUrl?: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  /** Remote URL after successful upload (or from initialFiles) */
  url?: string;
  /** Name for displaying initial files without a File object */
  name: string;
  /** MIME type if known */
  type?: string;
  /** Size if known */
  size?: number;
}

export interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;

  /**
   * Upload handler. Must resolve to the URL for the uploaded file.
   * Provide `onProgress` callback to support progress updates.
   */
  onUpload: (file: File, onProgress?: (progress: number) => void) => Promise<string>;

  onChange?: (files: UploadedFile[]) => void;
  onComplete?: (urls: string[]) => void;

  uploadText?: string;
  description?: string;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  variant?: "default" | "compact" | "avatar";

  /** Initial files (e.g. edit form) */
  initialFiles?: { id: string; url: string; name: string; type?: string; size?: number }[];
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  // Use crypto.randomUUID when available (modern browsers). Fall back to a stable random string.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(type?: string): React.ReactNode {
  if (!type) return <File className="h-5 w-5" />;

  if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
  if (type.startsWith("video/")) return <Film className="h-5 w-5" />;
  if (type.startsWith("audio/")) return <Music className="h-5 w-5" />;
  if (type.includes("pdf") || type.includes("document")) return <FileText className="h-5 w-5" />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet className="h-5 w-5" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive className="h-5 w-5" />;

  return <File className="h-5 w-5" />;
}

function isAcceptedFile(file: File, accept: string): boolean {
  if (accept === "*/*") return true;

  const acceptedTypes = accept.split(",").map((t) => t.trim()).filter(Boolean);
  const fileType = file.type;
  const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) return fileExtension === type.toLowerCase();
    if (type.endsWith("/*")) return fileType.startsWith(type.replace("/*", "/"));
    return fileType === type;
  });
}

// ============================================================================
// UI
// ============================================================================

function FilePreview({
  file,
  onRemove,
  onRetry,
  showPreview,
}: {
  file: UploadedFile;
  onRemove: () => void;
  onRetry?: () => void;
  showPreview?: boolean;
}) {
  const isImage = (file.type ?? "").startsWith("image/") || Boolean(file.previewUrl);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border p-3 transition-colors",
        file.status === "error" && "border-destructive bg-destructive/5",
        file.status === "success" && "border-green-500/50 bg-green-50 dark:bg-green-950/20"
      )}
    >
      <div className="flex-shrink-0">
        {showPreview && isImage && file.previewUrl ? (
          <div className="h-12 w-12 overflow-hidden rounded bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-muted-foreground">
            {getFileIcon(file.type)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size ?? 0)}</p>

        {file.status === "uploading" && <Progress value={file.progress} className="mt-2 h-1" />}

        {file.status === "error" && file.error && <p className="mt-1 text-xs text-destructive">{file.error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {file.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {file.status === "error" && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function FileUpload({
  accept = "*/*",
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  multiple = false,
  onUpload,
  onChange,
  onComplete,
  uploadText = "Drag and drop files here, or click to select",
  description,
  showPreview = true,
  disabled = false,
  className,
  icon,
  variant = "default",
  initialFiles = [],
}: FileUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<UploadedFile[]>(() =>
    initialFiles.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      status: "success",
      progress: 100,
      url: f.url,
      previewUrl: f.type?.startsWith("image/") ? f.url : undefined,
    }))
  );

  // Cleanup any object URLs created during this component lifecycle.
  React.useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.previewUrl && f.file && f.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(f.previewUrl);
        }
      }
    };
    // We only want a final cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateFile = React.useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) return `File size exceeds ${formatFileSize(maxSize)}`;
      if (!isAcceptedFile(file, accept)) return "File type not accepted";
      return null;
    },
    [accept, maxSize]
  );

  const updateFiles = React.useCallback(
    (updater: (prev: UploadedFile[]) => UploadedFile[]) => {
      setFiles((prev) => {
        const next = updater(prev);
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  const uploadFileAsync = React.useCallback(
    async (uploadFile: UploadedFile) => {
      if (!uploadFile.file) return;

      updateFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading", error: undefined } : f))
      );

      try {
        const url = await onUpload(uploadFile.file, (progress) => {
          updateFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f)));
        });

        updateFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "success",
                  progress: 100,
                  url,
                  previewUrl:
                    (f.type ?? "").startsWith("image/") && f.previewUrl?.startsWith("blob:")
                      ? f.previewUrl
                      : (f.type ?? "").startsWith("image/")
                        ? url
                        : f.previewUrl,
                }
              : f
          )
        );

        toast.success("Upload complete", { description: `${uploadFile.name} uploaded successfully` });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";

        updateFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "error", error: errorMessage } : f))
        );

        toast.error("Upload failed", { description: `${uploadFile.name}: ${errorMessage}` });
      }
    },
    [onUpload, updateFiles]
  );

  const checkComplete = React.useCallback(
    (next: UploadedFile[]) => {
      const successful = next.filter((f) => f.status === "success" && f.url).map((f) => f.url!)
      const allDone = next.every((f) => f.status === "success" || f.status === "error");
      if (allDone && successful.length > 0) {
        onComplete?.(successful);
      }
    },
    [onComplete]
  );

  const addFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      const fileArray = Array.from(incoming);

      const nonErroredCount = files.filter((f) => f.status !== "error").length;
      const remainingSlots = Math.max(0, maxFiles - nonErroredCount);

      if (fileArray.length > remainingSlots) {
        toast.error("Too many files", { description: `You can only upload ${maxFiles} files` });
        return;
      }

      const toAdd: UploadedFile[] = fileArray.map((file) => {
        const error = validateFile(file);
        const previewUrl = (file.type ?? "").startsWith("image/") ? URL.createObjectURL(file) : undefined;

        return {
          id: generateId(),
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl,
          progress: 0,
          status: error ? "error" : "pending",
          error: error ?? undefined,
        };
      });

      updateFiles((prev) => {
        const next = [...prev, ...toAdd];
        // Start uploads after state update.
        queueMicrotask(() => {
          for (const f of toAdd) {
            if (f.status === "pending") void uploadFileAsync(f);
          }
        });
        checkComplete(next);
        return next;
      });
    },
    [checkComplete, files, maxFiles, updateFiles, uploadFileAsync, validateFile]
  );

  const removeFile = React.useCallback(
    (id: string) => {
      updateFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file?.previewUrl && file.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(file.previewUrl);
        }
        const next = prev.filter((f) => f.id !== id);
        checkComplete(next);
        return next;
      });
    },
    [checkComplete, updateFiles]
  );

  const retryFile = React.useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file?.file) {
        void uploadFileAsync({ ...file, status: "pending", progress: 0, error: undefined });
      }
    },
    [files, uploadFileAsync]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      if (!multiple && selected.length > 1) {
        toast.error("Only one file allowed");
        addFiles([selected[0]]);
      } else {
        addFiles(selected);
      }
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length === 0) return;

    if (!multiple && droppedFiles.length > 1) {
      toast.error("Only one file allowed");
      addFiles([droppedFiles[0]]);
      return;
    }

    addFiles(droppedFiles);
  };

  // Avatar variant: single image
  if (variant === "avatar") {
    const currentFile = files[0];
    const hasImage = Boolean(currentFile?.previewUrl || currentFile?.url);

    return (
      <div className={cn("relative inline-block", className)}>
        <div
          className={cn(
            "h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentFile?.previewUrl || currentFile?.url}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {hasImage && currentFile && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              removeFile(currentFile.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={false}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          {files.length > 0 && <Badge variant="secondary">{files.length} file(s)</Badge>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
                onRetry={file.status === "error" ? () => retryFile(file.id) : undefined}
                showPreview={showPreview}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all",
          isDragging
            ? "scale-[1.02] border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">{icon || <Upload className="h-8 w-8 text-muted-foreground" />}</div>

          <div className="space-y-1">
            <p className="text-sm font-medium">{uploadText}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            <p className="text-xs text-muted-foreground">
              Max file size: {formatFileSize(maxSize)}
              {maxFiles > 1 && ` • Max ${maxFiles} files`}
            </p>
          </div>

          <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            Select Files
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
              onRetry={file.status === "error" ? () => retryFile(file.id) : undefined}
              showPreview={showPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
