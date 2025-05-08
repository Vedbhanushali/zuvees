// app/routes/products.$productId.tsx
import { useState, useEffect, useMemo } from "react";
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
import { prisma } from "~/server/db.server";
import { commitSession, getCart, updateCart } from "~/server/session.server";
import { Button, Select, SelectItem, Image, Chip } from "@heroui/react"; // Assuming you use HeroUI components
import { getAuth } from "@clerk/remix/ssr.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.product) {
    return [{ title: "Product Not Found" }];
  }
  return [{ title: data.product.name || "Product Details" }];
};

export async function loader(args: LoaderFunctionArgs) {
  const productId = args.params.id;
  if (!productId) {
    throw new Response("Product ID is missing", { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }], // Consistent ordering
      },
    },
  });

  if (!product) {
    // throw new Response("Product not found", { status: 404 });
    return redirect("/products");
  }

  return { product: product };
}

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    // Return JSON error if not authenticated
    return data(
      {
        success: false,
        message: "You must be logged in to add items to the cart.",
      },
      { status: 400 }
    );
  }
  const formData = await args.request.formData();
  const productVariantId = formData.get("productVariantId") as string;
  const quantityStr = formData.get("quantity") as string;
  const quantity = parseInt(quantityStr || "1", 10);
  if (!productVariantId || isNaN(quantity) || quantity < 1) {
    return data(
      { success: false, message: "Invalid product variant or quantity." },
      { status: 400 }
    );
  }

  // Optional: Validate stock before adding to cart
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    select: { stock: true },
  });

  if (!variant) {
    return data(
      { success: false, message: "Product variant not found." },
      { status: 404 }
    );
  }
  if (variant.stock < quantity) {
    return data(
      {
        success: false,
        message: `Not enough stock. Only ${variant.stock} available.`,
      },
      { status: 400 }
    );
  }

  const cart = await getCart(args.request);
  const existingItemIndex = cart.findIndex(
    (item) => item.productVariantId === productVariantId
  );

  if (existingItemIndex > -1) {
    // if found update quantity. You might want to check against stock here too.
    cart[existingItemIndex].quantity += quantity;
    if (variant.stock < cart[existingItemIndex].quantity) {
      // If adding more exceeds stock, cap at available stock or return error
      return data(
        {
          message: `Cannot add ${quantity} more. Total would exceed stock. Only ${
            variant.stock - (cart[existingItemIndex].quantity - quantity)
          } more can be added.`,
          success: false,
        },
        { status: 400 }
      );
    }
  } else {
    cart.push({ productVariantId, quantity });
  }

  const session = await updateCart(args.request, cart);
  const cookie = await commitSession(session); // Commit session to save cart changes
  return data(
    { success: true, message: "Item added to cart!" },
    { headers: { "Set-Cookie": cookie } }
  );
}

export default function ProductDetailPage() {
  const { product } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // State for selected variant options
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.variants[0]?.color || null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.variants[0]?.size || null
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Memoize unique colors and sizes
  const uniqueColors = useMemo(() => {
    const colors = new Set(product.variants.map((v) => v.color));
    return Array.from(colors);
  }, [product.variants]);

  const availableSizesForSelectedColor = useMemo(() => {
    if (!selectedColor) return [];
    return product.variants
      .filter((v) => v.color === selectedColor)
      .map((v) => v.size)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique sizes
  }, [product.variants, selectedColor]);

  // Effect to update selected size if it becomes invalid for the new color
  useEffect(() => {
    if (
      selectedColor &&
      !availableSizesForSelectedColor.includes(selectedSize || "")
    ) {
      setSelectedSize(availableSizesForSelectedColor[0] || null);
    }
  }, [selectedColor, availableSizesForSelectedColor, selectedSize]);

  const selectedVariant = useMemo(() => {
    return product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
  }, [product.variants, selectedColor, selectedSize]);

  const displayPrice = selectedVariant?.specificPrice ?? product.basePrice;
  const displayImage = "/controller.jpg"; //TODO to make dynamic
  // selectedVariant?.images[0] ||
  // product.variants[0]?.images[0] ||
  // "https://via.placeholder.com/600x400?text=No+Image";
  const stockAvailable = selectedVariant?.stock ?? 0;

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setNotification({
          type: "success",
          message: actionData.message || "Item added successfully!",
        });
      } else {
        setNotification({ type: "error", message: actionData.message });
      }
      const timer = setTimeout(() => setNotification(null), 3000); // Clear notification after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  return (
    <div className="container mx-auto px-4 py-8">
      {notification && (
        <div
          className={`fixed top-20 right-5 p-4 rounded-md shadow-lg text-white ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
          role="alert"
        >
          {notification.message}
        </div>
      )}
      <div className="mb-6">
        <Link to="/products" className="text-indigo-600 hover:text-indigo-800">
          &larr; Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <Image
            alt={product.name || "Product image"}
            className="object-cover w-full h-full rounded-t-xl" // Ensure image covers and maintains aspect ratio
            src={displayImage}
          />
          {/* TODO: Add thumbnail images if multiple images per variant */}
        </div>

        {/* Product Details and Actions Section */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3">
            {product.name}
          </h1>
          <p className="text-2xl font-semibold text-indigo-600 mb-4">
            ${displayPrice.toFixed(2)}
          </p>

          {stockAvailable > 0 && stockAvailable <= 10 && (
            <Chip color="warning" className="mb-4">
              Only {stockAvailable} left in stock!
            </Chip>
          )}
          {stockAvailable === 0 && (
            <Chip color="danger" className="mb-4">
              Out of Stock
            </Chip>
          )}

          <p className="text-gray-600 mb-6 leading-relaxed">
            {product.description || "No description available."}
          </p>

          <Form method="post">
            {/* Color Selector */}
            {uniqueColors.length > 0 && (
              <div className="mb-4">
                <label
                  htmlFor="color"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Color: <span className="font-semibold">{selectedColor}</span>
                </label>
                <div className="flex space-x-2">
                  {uniqueColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor === color
                          ? "ring-2 ring-indigo-500 ring-offset-1 border-indigo-400"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color.toLowerCase() }} // Basic color mapping
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <input
                  type="hidden"
                  name="color"
                  value={selectedColor || undefined}
                />
              </div>
            )}

            {/* Size Selector */}
            {availableSizesForSelectedColor.length > 0 && (
              <div className="mb-6">
                <label
                  htmlFor="size"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Size:
                </label>
                <Select
                  name="size"
                  value={selectedSize || ""}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full md:w-1/2"
                  aria-label="Select size"
                >
                  {availableSizesForSelectedColor.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Quantity:
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                min="1"
                max={stockAvailable > 0 ? stockAvailable : 1} // Max based on stock
                className="w-20 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Quantity"
                disabled={stockAvailable === 0}
              />
            </div>

            {/* Hidden input for selected variant ID */}
            {selectedVariant && (
              <input
                type="hidden"
                name="productVariantId"
                value={selectedVariant.id}
              />
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full md:w-auto"
              disabled={
                !selectedVariant || isSubmitting || stockAvailable === 0
              }
            >
              {isSubmitting ? "Adding..." : "Add to Cart"}
            </Button>
            {!selectedVariant && stockAvailable > 0 && (
              <p className="text-red-500 text-sm mt-2">
                Please select available options.
              </p>
            )}
          </Form>
        </div>
      </div>
    </div>
  );
}
