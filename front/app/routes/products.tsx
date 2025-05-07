import { Outlet } from "@remix-run/react";
export default function ProductsLayout() {
  return (
    <div className="flex flex-col h-screen">
      Layout
      <Outlet />
    </div>
  );
}
