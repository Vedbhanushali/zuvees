import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";
import { Outlet, redirect, useLocation } from "@remix-run/react";

import { createClerkClient } from "@clerk/remix/api.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { Role } from "@prisma/client";
import { getOrCreateDbUser } from "~/server/auth.server";
import { UserButton } from "@clerk/remix";

export async function loader(args: LoaderFunctionArgs) {
  const { userId, sessionId } = await getAuth(args);

  if (!userId || !sessionId) {
    // Not logged in, redirect to sign-in, potentially with a redirectUrl
    const currentUrl = new URL(args.request.url);
    return redirect(`/sign-in?redirect_url=${currentUrl.pathname}`);
  }
  const clerkUser = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);
  if (!clerkUser) {
    console.error(`ADMIN ROUTE: Clerk user not found for ID: ${userId}`);
    return redirect("/sign-in");
  }

  const dbUser = await getOrCreateDbUser(clerkUser);

  if (!dbUser) {
    console.warn(
      `ADMIN ROUTE: DB User could not be fetched/created for Clerk ID: ${userId}.`
    );
    return redirect("/unauthorized-access");
  }

  if (dbUser.role !== Role.ADMIN) {
    // Not an admin, redirect to an unauthorized page or customer products page
    console.warn(
      `User ${dbUser.email} with role ${dbUser.role} attempted to access admin area.`
    );
    return redirect("/unauthorized-access");
  }

  // User is an admin, allow access
  return { adminUser: { email: dbUser.email, role: dbUser.role } };
}

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
          <NavbarItem>
            <UserButton />
          </NavbarItem>
        </NavbarContent>
      </Navbar>
      <Outlet />
    </>
  );
}
