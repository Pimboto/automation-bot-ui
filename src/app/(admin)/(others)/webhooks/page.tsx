import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function WebhooksPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Webhooks" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Webhooks Configuration
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Configure webhooks to receive real-time notifications about automation events, 
            device status changes, and system alerts. This feature will be available soon.
          </p>
          
          <div className="mt-8 p-6 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-4xl mb-4">🔗</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Webhook management interface coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
