import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutomationStart from "@/components/automation/AutomationStart";
import React from "react";

export default function BumbleContainerAutomation() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bumble Container Automation" />
      <AutomationStart 
        flow="bumblecontainer"
        onAutomationStarted={(session) => {
          console.log('Bumble Container automation started:', session);
          // You can add notification logic here
        }}
      />
    </div>
  );
}
