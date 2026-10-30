import * as React from "react";
import { FileUp, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  progress?: number; // 0-100; if undefined falls back to indeterminate
  accept?: string;
}

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function UploadDropzone({
  file,
  onFileChange,
  onUpload,
  isUploading,
  progress,
  accept = ACCEPT,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileChange(files[0]);
  };

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-4 py-10 text-center transition-all sm:p-10",
          dragOver
            ? "border-primary bg-primary-soft/60 shadow-[0_0_0_6px_var(--primary-soft)]"
            : "border-border hover:border-primary/40 hover:bg-secondary/40",
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Drag and drop your resume here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or tap to browse — PDF or DOCX, up to ~10MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {file ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 xs:flex-row xs:items-center xs:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 xs:shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFileChange(null)}
              disabled={isUploading}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={onUpload} disabled={isUploading} className="js-hover-lift flex-1 xs:flex-none">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload resume"
              )}
            </Button>
          </div>
        </div>
      ) : null}


      {isUploading ? (
        <div className="js-fade-in space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>
              {typeof progress === "number" && progress < 100
                ? "Uploading…"
                : typeof progress === "number" && progress >= 100
                  ? "Finalizing on server…"
                  : "Uploading…"}
            </span>
            <span className="tabular-nums text-foreground">
              {typeof progress === "number" ? `${progress}%` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            {typeof progress === "number" ? (
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-agentic to-ai transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-primary via-agentic to-ai" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
