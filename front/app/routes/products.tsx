import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";
import { Outlet, useLocation } from "@remix-run/react";

export default function ProductsLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  return (
    <>
      <Navbar>
        <NavbarBrand>
          <Link href="/products">
            <p className="font-bold text-black">Zuvees</p>
          </Link>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem isActive={pathname === "/products/cart"}>
            <Link
              color={pathname == "/products/cart" ? "primary" : "foreground"}
              href="/products/cart"
            >
              Cart
            </Link>
          </NavbarItem>
        </NavbarContent>
      </Navbar>
      <Outlet />
    </>
  );
}
