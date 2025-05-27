import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SessionsList from "@/components/automation/SessionsList";
import React from "react";

export default function SessionsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Automation Sessions" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <SessionsList />
      </div>
    </div>
  );
}
