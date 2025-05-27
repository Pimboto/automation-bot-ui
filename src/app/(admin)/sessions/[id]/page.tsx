"use client";
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LogViewer from "@/components/automation/LogViewer";
import Button from "@/components/ui/button/Button";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const handleGoBack = () => {
    router.push('/sessions');
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageBreadcrumb pageTitle="Session Logs" />
        <Button
          size="sm"
          variant="outline"
          onClick={handleGoBack}
          startIcon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        >
          Back to Sessions
        </Button>
      </div>
      
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <LogViewer sessionId={sessionId} />
      </div>
    </div>
  );
}
