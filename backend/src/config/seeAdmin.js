import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "../modules/auth/user.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bangelsverse";
        await mongoose.connect(mongoUri);

        const email = process.env.ADMIN_EMAIL || "faisaladil724@gmail.com";
        const plainPassword = process.env.ADMIN_PASSWORD || "Mdjahangir@9304";
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        // Remove old admin users if present
        const oldAdminEmails = ["mdimran.alam1701@gmail.com", "admin@bangelsverse.com"].filter(e => e !== email);
        if (oldAdminEmails.length > 0) {
            const deleted = await User.deleteMany({ email: { $in: oldAdminEmails } });
            if (deleted.deletedCount > 0) {
                console.log(`🧹 Removed ${deleted.deletedCount} old admin account(s):`, oldAdminEmails.join(", "));
            }
        }

        const adminUser = await User.findOneAndUpdate(
            { email },
            {
                name: "Bangels Verse Admin",
                email,
                phone: "9999900000",
                password: hashedPassword,
                role: "admin",
                isApproved: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log("✅ Admin account configured successfully:", adminUser.email);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to configure admin:", error);
        process.exit(1);
    }
};

seedAdmin();
