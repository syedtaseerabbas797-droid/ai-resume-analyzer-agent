import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agent")({
  component: AgentLayout,
});

function AgentLayout() {
  return <Outlet />;
}
