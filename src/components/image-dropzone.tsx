import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, AlertCircle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

const EXT_LABEL = "JPG, PNG, WEBP, SVG, GIF";

export type DroppedImage = { id: string; name: string; size: number; dataUrl: string };

type CommonProps = {
  maxSizeMb?: number;
  className?: string;
  label?: string;
  hint?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function validate(file: File, maxSizeMb: number): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return `"${file.name}" is not a supported image (allowed: ${EXT_LABEL}).`;
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(2)}MB — max ${maxSizeMb}MB.`;
  }
  return null;
}

/* ----------------------------- Single (logo) ----------------------------- */

export function LogoDropzone({
  value,
  onChange,
  maxSizeMb = 5,
  className,
  label = "Company logo",
  hint = "Drop an image here or click to browse",
}: CommonProps & {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const err = validate(file, maxSizeMb);
      if (err) {
        setError(err);
        return;
      }
      setUploading(true);
      try {
        const url = await readFileAsDataUrl(file);
        onChange(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMb, onChange],
  );

  return (
    <div className={className}>
      <div className="text-xs font-medium mb-1.5">{label}</div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "relative flex items-center gap-4 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all duration-200",
          "hover:border-primary/60 hover:bg-primary/5",
          dragOver ? "border-primary bg-primary/10 scale-[1.01] shadow-md" : "border-border",
          error && "border-destructive/60 bg-destructive/5",
        )}
      >
        <div
          className={cn(
            "w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200",
            dragOver && "scale-110",
          )}
        >
          {value ? (
            <img src={value} alt="logo" className="max-w-full max-h-full object-contain animate-fade-in" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UploadCloud className={cn("w-4 h-4 text-primary transition-transform", dragOver && "animate-bounce")} />
            {uploading ? "Uploading…" : dragOver ? "Drop to upload" : hint}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {EXT_LABEL} · up to {maxSizeMb}MB
          </div>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onChange(null); setError(null); }}
          >
            <X className="w-4 h-4 mr-1" /> Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Multiple (gallery) --------------------------- */

export function ImagesDropzone({
  images,
  onChange,
  maxSizeMb = 5,
  maxCount = 12,
  className,
  label = "Additional images",
  hint = "Drop images here or click to browse (multiple allowed)",
}: CommonProps & {
  images: DroppedImage[];
  onChange: (next: DroppedImage[]) => void;
  maxCount?: number;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const errs: string[] = [];
      const remaining = maxCount - images.length;
      if (remaining <= 0) {
        setErrors([`Maximum ${maxCount} images reached. Remove some to add more.`]);
        return;
      }
      const accepted: File[] = [];
      for (const f of files) {
        if (accepted.length >= remaining) {
          errs.push(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added (max ${maxCount}).`);
          break;
        }
        const err = validate(f, maxSizeMb);
        if (err) { errs.push(err); continue; }
        accepted.push(f);
      }
      setErrors(errs);
      if (accepted.length === 0) return;
      setUploading(true);
      try {
        const results = await Promise.all(
          accepted.map(async (f) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: f.name,
            size: f.size,
            dataUrl: await readFileAsDataUrl(f),
          })),
        );
        onChange([...images, ...results]);
      } catch (e) {
        setErrors((prev) => [...prev, e instanceof Error ? e.message : "Upload failed"]);
      } finally {
        setUploading(false);
      }
    },
    [images, maxCount, maxSizeMb, onChange],
  );

  const remove = (id: string) => onChange(images.filter((i) => i.id !== id));

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{images.length} / {maxCount}</div>
      </div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length) void handleFiles(files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200 text-center",
          "hover:border-primary/60 hover:bg-primary/5",
          dragOver ? "border-primary bg-primary/10 scale-[1.01] shadow-md" : "border-border",
          errors.length > 0 && "border-destructive/60",
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200",
            dragOver && "scale-125",
          )}
        >
          <UploadCloud className={cn("w-6 h-6 text-primary", dragOver && "animate-bounce")} />
        </div>
        <div className="text-sm font-medium">
          {uploading ? "Uploading…" : dragOver ? "Drop to upload" : hint}
        </div>
        <div className="text-xs text-muted-foreground">
          {EXT_LABEL} · up to {maxSizeMb}MB each · max {maxCount}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void handleFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="mt-2 space-y-1 animate-fade-in">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted animate-scale-in"
            >
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(img.id); }}
                className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                aria-label={`Remove ${img.name}`}
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {img.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
