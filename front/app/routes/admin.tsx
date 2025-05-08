import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";
import { Outlet, useLocation } from "@remix-run/react";

export default function AdminDashBoardLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  return (
    <>
      <Navbar>
        <NavbarBrand>
          <Link href="/admin">
            <p className="font-bold text-black">Zuvees Admin Panel</p>
          </Link>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem isActive={pathname === "/admin"}>
            <Link
              color={pathname == "/admin" ? "primary" : "foreground"}
              href="/admin"
            >
              Orders
            </Link>
          </NavbarItem>
          <NavbarItem isActive={pathname === "/admin/riders"}>
            <Link
              color={pathname == "/admin/riders" ? "primary" : "foreground"}
              href="/admin/riders"
            >
              Riders
            </Link>
          </NavbarItem>
          <NavbarItem isActive={pathname === "/admin/products"}>
            <Link
              color={pathname == "/products" ? "primary" : "foreground"}
              href="/products"
            >
              Products
            </Link>
          </NavbarItem>
          <NavbarItem isActive={pathname === "/admin/approvals"}>
            <Link
              color={pathname == "/admin/approvals" ? "primary" : "foreground"}
              href="/admin/approvals"
            >
              Approvals
            </Link>
          </NavbarItem>
        </NavbarContent>
      </Navbar>
      <Outlet />
    </>
  );
}
