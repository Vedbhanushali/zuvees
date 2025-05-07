// prisma/seed.ts
import { PrismaClient, Role } from '../generated/prisma'

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // 1. Approved Emails
    const adminEmail = 'abhishek@zuvees.com';
    await prisma.approvedEmail.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            role: Role.ADMIN,
        },
    });

    const adminEmail1 = 'vedbhanushali0@gmail.com';
    await prisma.approvedEmail.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail1,
            role: Role.ADMIN,
        },
    });

    const rider1Email = 'rider1@example.com';
    await prisma.approvedEmail.upsert({
        where: { email: rider1Email },
        update: {},
        create: {
            email: rider1Email,
            role: Role.RIDER,
        },
    });
    const rider2Email = 'rider2@example.com';
    await prisma.approvedEmail.upsert({
        where: { email: rider2Email },
        update: {},
        create: {
            email: rider2Email,
            role: Role.RIDER,
        },
    });

    const customer1Email = 'customer1@example.com';
    await prisma.approvedEmail.upsert({
        where: { email: customer1Email },
        update: {},
        create: {
            email: customer1Email,
            role: Role.CUSTOMER,
        },
    });


    console.log('Seeded approved emails');

    // 2. Products and Variants
    const ps5 = await prisma.product.create({
        data: {
            name: 'PlayStation 5 Console',
            description: 'Experience lightning-fast loading with an ultra-high-speed SSD, deeper immersion with support for haptic feedback, adaptive triggers, and 3D Audio.',
            basePrice: 499.99,
            variants: {
                create: [
                    {
                        color: 'White',
                        size: 'Disc Edition',
                        specificPrice: 499.99,
                        stock: 50,
                        sku: 'PS5-DISC-WHT',
                        images: ['/images/ps5-disc.png'],
                    },
                    {
                        color: 'White',
                        size: 'Digital Edition',
                        specificPrice: 399.99,
                        stock: 30,
                        sku: 'PS5-DIGITAL-WHT',
                        images: ['/images/ps5-digital.png'],
                    },
                ],
            },
        },
    });

    const xboxSeriesX = await prisma.product.create({
        data: {
            name: 'Xbox Series X',
            description: 'The fastest, most powerful Xbox ever. Explore rich new worlds with 12 teraflops of raw graphic processing power.',
            basePrice: 499.99,
            variants: {
                create: [
                    {
                        color: 'Black',
                        size: 'Standard',
                        specificPrice: 499.99,
                        stock: 40,
                        sku: 'XSX-STD-BLK',
                        images: ['/images/xbox-series-x.png'],
                    },
                ],
            },
        },
    });

    const dualSenseController = await prisma.product.create({
        data: {
            name: 'DualSense Wireless Controller',
            description: 'Discover a deeper, highly immersive gaming experience with the innovative PS5 controller, featuring haptic feedback and dynamic adaptive triggers.',
            basePrice: 69.99,
            variants: {
                create: [
                    {
                        color: 'White',
                        size: 'Standard',
                        specificPrice: 69.99,
                        stock: 100,
                        sku: 'DS-CTRL-WHT',
                        images: ['/images/dualsense-white.png'],
                    },
                    {
                        color: 'Cosmic Red',
                        size: 'Standard',
                        specificPrice: 74.99,
                        stock: 75,
                        sku: 'DS-CTRL-RED',
                        images: ['/images/dualsense-red.png'],
                    },
                ],
            },
        },
    });

    const gamingHeadset = await prisma.product.create({
        data: {
            name: 'Pro Gaming Headset',
            description: 'Immersive sound quality with a comfortable design for long gaming sessions.',
            basePrice: 89.99,
            variants: {
                create: [
                    {
                        color: 'Black',
                        size: 'Wired',
                        specificPrice: 89.99,
                        stock: 60,
                        sku: 'HEADSET-PRO-BLK-W',
                        images: ['/images/headset-black.png']
                    },
                    {
                        color: 'White',
                        size: 'Wireless',
                        specificPrice: 119.99,
                        stock: 40,
                        sku: 'HEADSET-PRO-WHT-WL',
                        images: ['/images/headset-white.png']
                    }
                ]
            }
        }
    });

    const gamingKeyboard = await prisma.product.create({
        data: {
            name: 'Mechanical Gaming Keyboard',
            description: 'RGB backlit mechanical keyboard with responsive keys for competitive gaming.',
            basePrice: 129.99,
            variants: {
                create: [
                    {
                        color: 'Black',
                        size: 'Full Size',
                        specificPrice: 129.99,
                        stock: 50,
                        sku: 'KEYB-MECH-BLK-FS',
                        images: ['/images/keyboard-black.png']
                    },
                    {
                        color: 'Silver',
                        size: 'Tenkeyless',
                        specificPrice: 119.99,
                        stock: 30,
                        sku: 'KEYB-MECH-SIL-TKL',
                        images: ['/images/keyboard-silver.png']
                    }
                ]
            }
        }
    });


    console.log('Seeded products and variants');
    console.log({ ps5, xboxSeriesX, dualSenseController, gamingHeadset, gamingKeyboard });

    // Add more products and variants to meet the minimum 5 product requirement

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });