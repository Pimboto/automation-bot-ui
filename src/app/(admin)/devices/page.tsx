import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DevicesList from "@/components/devices/DevicesList";
import React from "react";

export default function DevicesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Devices" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <DevicesList showActions={false} />
      </div>
    </div>
  );
}
