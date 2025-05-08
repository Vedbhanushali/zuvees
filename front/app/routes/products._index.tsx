import { Link, useLoaderData } from "@remix-run/react";
import { Card, CardHeader, CardBody, Image } from "@heroui/react";
import { prisma } from "~/server/db.server";

export async function loader() {
  // Changed args to request
  const productsFromDb = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      basePrice: true,
      variants: {
        orderBy: {
          createdAt: "asc",
        },
        take: 1, // Get the first variant for display purposes on the card
        select: {
          id: true,
          specificPrice: true,
          images: true,
          color: true,
          size: true,
        },
      },
    },
  });

  const products = productsFromDb.map((p) => ({
    ...p,
    description: p.description || null,
    variants: p.variants.map((v) => ({
      ...v,
      specificPrice: v.specificPrice || null,
      color: v.color || null,
      size: v.size || null,
    })),
  }));

  return { products };
}

export default function Products() {
  const { products } = useLoaderData<typeof loader>();

  if (!products || products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Our Products</h1>
        <p className="text-xl text-gray-600">
          No products available at the moment. Please check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Products</h1>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Browse our amazing collection of gaming consoles and accessories!
      </p>
      {/* Grid container for product cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
        {products.map((product) => {
          const displayVariant = product.variants[0]; // We took only one variant
          const imageUrl = "controller.jpg";
          // displayVariant?.images[0] ||
          // "https://via.placeholder.com/270x200?text=No+Image"; // Fallback image
          const price = displayVariant?.specificPrice ?? product.basePrice;

          return (
            <Link
              to={`/products/${product.id}`}
              key={product.id}
              className="group block"
            >
              <Card className="w-full h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:-translate-y-1">
                <CardBody className="overflow-visible p-0 aspect-[4/3] relative">
                  <Image
                    alt={product.name || "Product image"}
                    className="object-cover w-full h-full rounded-t-xl" // Ensure image covers and maintains aspect ratio
                    src={imageUrl}
                  />
                </CardBody>
                <CardHeader className="p-4 flex-col items-start flex-grow">
                  {displayVariant?.color && (
                    <p className="text-xs uppercase font-semibold text-gray-500 tracking-wide">
                      {displayVariant.color}{" "}
                      {displayVariant.size && `- ${displayVariant.size}`}
                    </p>
                  )}
                  <h4 className="font-bold text-lg mt-1 text-gray-800 group-hover:text-indigo-600">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {product.description || "High-quality gaming product."}
                  </p>
                </CardHeader>
                <div className="p-4 pt-0 mt-auto">
                  <p className="text-xl font-semibold text-indigo-600">
                    ${price.toFixed(2)}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
