// src/app/(admin)/multi-logs/page.tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MultiLogViewer from "@/components/automation/MultiLogViewer";
import React from "react";

export default function MultiLogsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Multi-Log Viewer" />
      <MultiLogViewer />
    </div>
  );
}
