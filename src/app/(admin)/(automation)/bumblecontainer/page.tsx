"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DynamicAutomationForm from "@/components/automation/DynamicAutomationForm";
import React from "react";

export default function BumbleContainersAutomationPage() {
  const handleAutomationStarted = (session: any) => {
    console.log('Bumble Containers automation started:', session);
    // You can add notification logic here
    // For example: toast notification, redirect, etc.
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Bumble Containers Automation" />
      <DynamicAutomationForm 
        flowName="bumbleContainers"
        onAutomationStarted={handleAutomationStarted}
      />
    </div>
  );
}
