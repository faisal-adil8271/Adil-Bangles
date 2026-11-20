import mongoose from "mongoose";

const storeSettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, default: "default" },
        supportPhone: { type: String, default: "9876543210" },
        supportWhatsapp: { type: String, default: "919876543210" },
        dispatchHub: { type: String, default: "Jaipur Heritage Johari Craft Hub, Rajasthan" },
        supportEmail: { type: String, default: "mdimran.alam1701@gmail.com" },
        freeDeliveryThreshold: { type: Number, default: 999 },
        standardDeliveryFee: { type: Number, default: 99 },
        quickOrderEnabled: { type: Boolean, default: true },
        khataEnabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const StoreSetting = mongoose.model("StoreSetting", storeSettingSchema);
