"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DynamicAutomationForm from "@/components/automation/DynamicAutomationForm";
import React from "react";

export default function TinderAutomationPage() {
  const handleAutomationStarted = (session: any) => {
    console.log('Tinder automation started:', session);
    // You can add notification logic here
    // For example: toast notification, redirect, etc.
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Tinder Automation" />
      <DynamicAutomationForm 
        flowName="tinder"
        onAutomationStarted={handleAutomationStarted}
      />
    </div>
  );
}
