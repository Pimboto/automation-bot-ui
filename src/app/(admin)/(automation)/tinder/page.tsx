"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutomationStart from "@/components/automation/AutomationStart";
import React from "react";

export default function TinderAutomation() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tinder Automation" />
      <AutomationStart 
        flow="tinder"
        onAutomationStarted={(session) => {
          console.log('Tinder automation started:', session);
          // You can add notification logic here
        }}
      />
    </div>
  );
}
