import { type User as ClerkUser } from '@clerk/remix/ssr.server';
import { prisma } from './db.server';

export async function getOrCreateDbUser(clerkUser: Pick<ClerkUser, 'id' | 'primaryEmailAddressId' | 'emailAddresses'>) {
    if (!clerkUser.id) {
        console.error("Clerk user ID is missing.");
        return null;
    }

    const emailAddress = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

    if (!emailAddress) {
        console.error("Primary email address not found for Clerk user:", clerkUser.id);
        return null;
    }

    // 1. Check if email is approved
    const approvedEntry = await prisma.approvedEmail.findUnique({
        where: { email: emailAddress },
    });

    if (!approvedEntry) {
        console.warn(`Email ${emailAddress} is not in the ApprovedEmail list. User will not be created/synced.`);
        // Depending on your policy, you might want to sign them out of Clerk here
        // or prevent DB user creation.
        return null; // Or throw an error, or redirect
    }

    let dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
    });

    if (!dbUser) {
        console.log(`Creating new DB user for Clerk ID: ${clerkUser.id}, Email: ${emailAddress}`);
        try {
            dbUser = await prisma.user.create({
                data: {
                    clerkId: clerkUser.id,
                    email: emailAddress,
                    role: approvedEntry.role, // Assign role from ApprovedEmail table
                },
            });
        } catch (error) {
            console.error("Error creating DB user:", error);
            return null;
        }
    } else if (dbUser.role !== approvedEntry.role) {
        // Optional: Update role if it changed in ApprovedEmail table
        console.log(`Updating role for DB user ${dbUser.id} from ${dbUser.role} to ${approvedEntry.role}`);
        dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { role: approvedEntry.role },
        });
    }
    return dbUser;
}