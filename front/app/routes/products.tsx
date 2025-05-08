import { UserButton } from "@clerk/remix";
import { createClerkClient } from "@clerk/remix/api.server";
import { getAuth } from "@clerk/remix/ssr.server";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
} from "@heroui/react";
import { Role } from "@prisma/client";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, redirect, useLoaderData, useLocation } from "@remix-run/react";
import { getOrCreateDbUser } from "~/server/auth.server";
import { getCart } from "~/server/session.server";

export async function loader(args: LoaderFunctionArgs) {
  const { userId, sessionId } = await getAuth(args);

  if (!userId || !sessionId) {
    // Not logged in, redirect to sign-in, potentially with a redirectUrl
    return redirect(`/sign-in?redirect_url=products`);
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
  const cart = await getCart(args.request);
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  return {
    adminUser: { email: dbUser.email, role: dbUser.role },
    totalCartItems,
  };
}

export default function ProductsLayout() {
  const { adminUser, totalCartItems } = useLoaderData<typeof loader>();
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
          {adminUser.role == Role.ADMIN && (
            <NavbarItem isActive={pathname === "/admin"}>
              <Link
                color={pathname == "/admin" ? "primary" : "foreground"}
                href="/admin"
              >
                Admin Panel
              </Link>
            </NavbarItem>
          )}
          <NavbarItem isActive={pathname === "/products/cart"}>
            <Link
              color={pathname == "/products/cart" ? "primary" : "foreground"}
              href="/products/cart"
            >
              Cart {totalCartItems}
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
