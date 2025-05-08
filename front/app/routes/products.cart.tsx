import {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  redirect,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
  data,
} from "@remix-run/react";
import { createClerkClient } from "@clerk/remix/api.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "~/server/db.server";
import { getSession, commitSession, getCart } from "~/server/session.server";
import {
  Button,
  Image as HeroImage,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import { OrderStatus, Prisma } from "@prisma/client";

export const meta: MetaFunction = () => {
  return [{ title: "Your Shopping Cart | Zuvees" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionCart = await getCart(request);
  if (sessionCart.length === 0) {
    return { cartItems: [], grandTotal: 0, error: "Your cart is empty." };
  }

  const detailedCartItems = [];
  let grandTotal = 0;

  for (const item of sessionCart) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.productVariantId },
      include: {
        product: {
          select: { name: true, id: true, basePrice: true },
        },
      },
    });

    if (variant) {
      const pricePerUnit =
        variant.specificPrice ?? variant.product.basePrice ?? 0; // Fallback logic for price
      const subtotal = pricePerUnit * item.quantity;
      detailedCartItems.push({
        variantId: variant.id,
        productId: variant.product.id,
        productName: variant.product.name,
        variantColor: variant.color,
        variantSize: variant.size,
        quantity: item.quantity,
        pricePerUnit: pricePerUnit,
        subtotal: subtotal,
        imageUrl: variant.images?.[0] || null,
        stock: variant.stock,
      });
      grandTotal += subtotal;
    }
  }
  // Check if any item quantity exceeds current stock after fetching details
  for (const detailedItem of detailedCartItems) {
    if (detailedItem.quantity > detailedItem.stock) {
      return data(
        {
          cartItems: detailedCartItems,
          grandTotal,
          error: `Item "${detailedItem.productName} - ${detailedItem.variantColor}/${detailedItem.variantSize}" quantity (${detailedItem.quantity}) exceeds available stock (${detailedItem.stock}). Please update your cart.`,
        },
        { status: 400 }
      ); // Bad request due to cart state
    }
  }

  return data({ cartItems: detailedCartItems, grandTotal, error: null });
}

export async function action(args: ActionFunctionArgs) {
  const { userId: clerkUserId } = await getAuth(args);
  if (!clerkUserId) {
    return data(
      { success: false, error: "You must be logged in to place an order." },
      { status: 401 }
    );
  }

  const sessionCart = await getCart(args.request);
  if (sessionCart.length === 0) {
    return data(
      { success: false, error: "Your cart is empty. Cannot place order." },
      { status: 400 }
    );
  }

  // Fetch full user details from Clerk for customerInfo (if needed, or use your DB user)
  const clerkUser = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(clerkUserId);
  const customerEmail =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress || "N/A";
  const customerName =
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "N/A";

  // 1. Re-validate cart items and calculate total (important to prevent price changes exploitation)
  let grandTotal = 0;
  const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

  for (const cartItem of sessionCart) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: cartItem.productVariantId },
      include: { product: true }, // Include product for basePrice fallback
    });

    if (!variant) {
      return data(
        {
          success: false,
          error: `Product variant with ID ${cartItem.productVariantId} not found. Please refresh your cart.`,
        },
        { status: 400 }
      );
    }
    if (variant.stock < cartItem.quantity) {
      return data(
        {
          success: false,
          error: `Not enough stock for ${variant.product.name} (${variant.color}/${variant.size}). Only ${variant.stock} available. Please update your cart.`,
        },
        { status: 400 }
      );
    }
    const priceAtPurchase =
      variant.specificPrice ?? variant.product.basePrice ?? 0;
    grandTotal += priceAtPurchase * cartItem.quantity;
    orderItemsData.push({
      productVariantId: cartItem.productVariantId,
      quantity: cartItem.quantity,
      priceAtPurchase: priceAtPurchase,
    });
  }

  try {
    // 2. Create the Order and OrderItems within a transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: clerkUserId, // Using Clerk's user ID directly
          totalAmount: grandTotal,
          status: OrderStatus.PAID, // Assuming mock payment, directly to PAID
          // Mock shipping and customer info for now
          shippingAddress: {
            street: "123 Mock St",
            city: "Mockville",
            zip: "00000",
            country: "Mockland",
          },
          customerInfo: { name: customerName, email: customerEmail },
          items: {
            createMany: {
              data: orderItemsData,
            },
          },
        },
        include: { items: true }, // Include items to confirm creation
      });

      // 3. Decrement stock for each variant
      for (const item of orderItemsData) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      return createdOrder;
    });

    // 4. Clear the cart from the session
    const session = await getSession(args.request.headers.get("Cookie"));
    session.unset("cart"); // Or session.set("cart", []);

    // Redirect to an order confirmation page (you'll need to create this route)
    return redirect(`/orders/${order.id}`, {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    let errorMessage =
      "There was an issue placing your order. Please try again.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors, e.g., stock constraint violation if not caught above
      if (
        error.code === "P2002" ||
        error.code === "P2025" ||
        error.code === "P2034"
      ) {
        // Example codes
        errorMessage =
          "A product in your cart became unavailable or stock changed. Please review your cart.";
      }
    }
    return data({ success: false, error: errorMessage }, { status: 500 });
  }
}

export default function CartPage() {
  const { cartItems, grandTotal, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isPlacingOrder =
    navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "placeOrder";

  if (error && cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Your Cart</h1>
        <p className="text-xl text-gray-600 mb-6">{error}</p>
        <Button as={Link} href="/products" color="primary">
          Continue Shopping
        </Button>
      </div>
    );
  }
  if (error && cartItems.length > 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-center">
          Review Your Cart
        </h1>
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <div className="text-center mt-6">
          <Button as={Link} href="/products" color="primary">
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Your Shopping Cart
      </h1>

      {actionData?.error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Order Error: </strong>
          <span className="block sm:inline">{actionData.error}</span>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-6">
            Your cart is currently empty.
          </p>
          <Button as={Link} href="/products" color="primary">
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card
                key={item.variantId}
                className="flex flex-row items-center p-4 shadow"
              >
                <HeroImage
                  src={"/controller.jpg"} // TODO make dynamic image : item.imageUrl
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded mr-4"
                />
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold">{item.productName}</h2>
                  <p className="text-sm text-gray-600">
                    {item.variantColor} / {item.variantSize}
                  </p>
                  <p className="text-sm">Quantity: {item.quantity}</p>
                  {item.quantity > item.stock && (
                    <p className="text-xs text-red-500">
                      Quantity exceeds stock ({item.stock})!
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    ${item.subtotal.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${item.pricePerUnit.toFixed(2)} each
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 shadow-lg">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-center mb-4">
                  Order Summary
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600">Subtotal</p>
                  <p className="font-semibold">${grandTotal.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600">Shipping</p>
                  <p className="font-semibold">FREE</p>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between items-center text-xl font-bold mb-6">
                  <p>Grand Total</p>
                  <p>${grandTotal.toFixed(2)}</p>
                </div>
                <Form method="post">
                  <input type="hidden" name="_action" value="placeOrder" />
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full"
                    disabled={isPlacingOrder}
                  >
                    {isPlacingOrder ? "Placing Order..." : "Place Order"}
                  </Button>
                </Form>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
