"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutomationStart from "@/components/automation/AutomationStart";
import React from "react";

export default function BumbleAutomation() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bumble Automation" />
      <AutomationStart 
        flow="bumble"
        onAutomationStarted={(session) => {
          console.log('Bumble automation started:', session);
          // You can add notification logic here
        }}
      />
    </div>
  );
}
