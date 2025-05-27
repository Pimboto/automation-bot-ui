"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DynamicAutomationForm from "@/components/automation/DynamicAutomationForm";
import React from "react";

export default function BumbleAutomation() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bumble Automation" />
      <DynamicAutomationForm 
        flowName="bumble"
        onAutomationStarted={(session) => {
          console.log('Bumble automation started:', session);
          // You can add notification logic here
        }}
      />
    </div>
  );
}
