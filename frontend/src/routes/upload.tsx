import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";
import { useCandidateGuard } from "@/hooks/useCandidateGuard";
import { ApiError, uploadResumeWithProgress } from "@/lib/api";
import type { ResumeUpload } from "@/types/api";
import { formatDateTime, safe } from "@/lib/format";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Resume — JobScout AI" },
      {
        name: "description",
        content: "Upload your PDF or DOCX resume to start AI analysis.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const candidateId = useCandidateGuard();
  const [file, setFile] = React.useState<File | null>(null);
  const [uploaded, setUploaded] = React.useState<ResumeUpload | null>(null);
  const [progress, setProgress] = React.useState<number>(0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file || !candidateId) throw new Error("Missing file or candidate");
      setProgress(0);
      return uploadResumeWithProgress(file, candidateId, (p) => setProgress(p));
    },
    onSuccess: (data) => {
      setProgress(100);
      setUploaded(data);
      toast.success("Resume uploaded", { description: data?.filename ?? "Resume saved" });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Upload failed. Please try again.";
      toast.error("Upload failed", { description: msg });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Step 2"
        title="Upload your resume"
        description="We accept PDF and DOCX. Your file is sent securely to your FastAPI backend."
      />


      <div className="js-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
        <UploadDropzone
          file={file}
          onFileChange={(f) => {
            setFile(f);
            setUploaded(null);
            setProgress(0);
          }}
          onUpload={() => mutation.mutate()}
          isUploading={mutation.isPending}
          progress={mutation.isPending ? progress : undefined}
        />
      </div>

      {mutation.isError ? (
        <div className="js-fade-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {mutation.error instanceof ApiError
              ? `Upload failed (${mutation.error.status || "network"}): ${mutation.error.message}`
              : "Upload failed. Please try again."}
          </p>
          <Button size="sm" variant="outline" onClick={() => mutation.mutate()}>
            Retry upload
          </Button>
        </div>
      ) : null}

      {uploaded ? (
        <div className="js-scale-in rounded-2xl border border-success/30 bg-success/5 p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Upload complete
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <dt className="font-medium">File</dt>
                  <dd className="truncate text-foreground">{safe(uploaded.filename)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Type</dt>
                  <dd className="text-foreground">{safe(uploaded.file_type)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Status</dt>
                  <dd className="capitalize text-foreground">
                    {safe(uploaded.status).replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Uploaded</dt>
                  <dd className="text-foreground">
                    {formatDateTime(uploaded.upload_timestamp)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button asChild className="js-hover-lift">
              <Link to="/analyze">
                Analyze resume <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
