// app/routes/orders.confirmation.$orderId.tsx

import { LoaderFunctionArgs, redirect, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "~/server/db.server";
import {
  Button,
  Image as HeroImage,
  Card,
  CardBody,
  CardHeader,
  Chip,
} from "@heroui/react";
import { OrderStatus } from "@prisma/client";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.order) {
    return [{ title: "Order Not Found" }];
  }
  return [{ title: `Order Confirmation #${data.order.id} | Zuvees` }];
};

export async function loader(args: LoaderFunctionArgs) {
  const { userId: clerkUserId } = await getAuth(args);
  if (!clerkUserId) {
    const currentUrl = new URL(args.request.url);
    return redirect(`/sign-in?redirectUrl=${currentUrl.pathname}`);
  }

  const orderId = args.params.id;
  if (!orderId) {
    throw new Response("Order ID is missing", { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              product: true, // Include the parent product for its name
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }
  return { order };
}

export default function OrderConfirmationPage() {
  const { order } = useLoaderData<typeof loader>();

  // Type guard for customerInfo and shippingAddress
  const customerInfo =
    typeof order.customerInfo === "object" && order.customerInfo !== null
      ? (order.customerInfo as { name?: string; email?: string })
      : {};
  const shippingAddress =
    typeof order.shippingAddress === "object" && order.shippingAddress !== null
      ? (order.shippingAddress as {
          street?: string;
          city?: string;
          zip?: string;
          country?: string;
        })
      : {};

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="bg-green-500 text-white p-6 rounded-t-lg">
          <h1 className="text-3xl font-bold text-center">
            Thank You For Your Order!
          </h1>
        </CardHeader>
        <CardBody className="p-6 md:p-8">
          <p className="text-lg text-gray-700 text-center mb-6">
            Your order has been placed successfully. We've sent a confirmation
            to your email.
          </p>

          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Order Summary
            </h2>
            <div className="space-y-1">
              <p>
                <strong>Order ID:</strong> #{order.id}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <Chip
                  color={
                    order.status === OrderStatus.PAID ? "success" : "default"
                  }
                >
                  {order.status}
                </Chip>
              </p>
              <p>
                <strong>Order Total:</strong>{" "}
                <span className="font-bold text-indigo-600">
                  ${order.totalAmount.toFixed(2)}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Customer Information
              </h3>
              <p>{customerInfo.name || "N/A"}</p>
              <p>{customerInfo.email || "N/A"}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Shipping Address
              </h3>
              <p>{shippingAddress.street || "N/A"}</p>
              <p>
                {shippingAddress.city || "N/A"}, {shippingAddress.zip || "N/A"}
              </p>
              <p>{shippingAddress.country || "N/A"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Items Ordered
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <HeroImage
                    src={
                      item.productVariant.images?.[0] ||
                      "/images/default-product.png"
                    } // Use your actual default image
                    alt={item.productVariant.product.name}
                    className="w-16 h-16 object-cover rounded mr-4"
                  />
                  <div className="flex-grow">
                    <h4 className="font-semibold text-gray-700">
                      {item.productVariant.product.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {item.productVariant.color} / {item.productVariant.size}
                    </p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">
                      ${(item.priceAtPurchase * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${item.priceAtPurchase.toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/products" color="primary" className="mr-4">
              Continue Shopping
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
