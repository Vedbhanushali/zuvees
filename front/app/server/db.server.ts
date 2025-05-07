// app/utils/prisma.server.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

declare global {
    // allow global `var` declarations
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new PrismaClient instance with every change either.
if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.__prisma) {
        global.__prisma = new PrismaClient();
    }
    prisma = global.__prisma;
    // Optional: connect explicitly in dev to catch issues early,
    // though Prisma often handles lazy connections well.
    // prisma.$connect();
}

export { prisma };