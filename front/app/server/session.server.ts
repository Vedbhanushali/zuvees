import { createCookieSessionStorage } from "@remix-run/node";

// Define your session secret. This should be a long, random string stored in your .env file
const sessionSecret = process.env.SESSION_SECRET || "DEFAULT_SESSION_SECRET_REPLACE_ME";
if (sessionSecret === "DEFAULT_SESSION_SECRET_REPLACE_ME" && process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "development") {
    console.warn(
        "SESSION_SECRET is not set or is the default value. Please set a strong secret in your .env file."
    );
}

export const { getSession, commitSession, destroySession } =
    createCookieSessionStorage({
        cookie: {
            name: "__cart_session_zuvees",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
            sameSite: "lax",
            secrets: [sessionSecret],
            secure: process.env.NODE_ENV === "production",
        },
    });

// Helper function to get cart data from session
export async function getCart(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    return (session.get("cart") as { productVariantId: string; quantity: number }[]) || [];
}

// Helper function to update cart data in session
export async function updateCart(
    request: Request,
    cart: { productVariantId: string; quantity: number }[]
) {
    const session = await getSession(request.headers.get("Cookie"));
    session.set("cart", cart);
    return session;
}
