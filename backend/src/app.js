import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import orderRoutes from "./modules/order/order.route.js";
import creditRoutes from "./modules/credit/credit.route.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import transactionRoutes from "./modules/transaction/transaction.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import reviewRoutes from "./modules/review/review.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";
import addressRoutes from "./modules/address/address.routes.js";
import couponRoutes from "./modules/coupon/coupon.routes.js";
import announcementRoutes from "./modules/announcement/announcement.routes.js";
import activityLogRoutes from "./modules/activityLog/activityLog.routes.js";
import categoryRoutes from "./modules/category/category.routes.js";
import payoutRoutes from "./modules/payout/payout.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import { isRazorpayConfigured } from "./config/razorpay.js";
import { getStoreSettings } from "./modules/admin/admin.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

// Security & Performance headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false,
    })
);
app.use(compression());

// CORS allowlist
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }
            try {
                const url = new URL(origin);
                if (url.hostname.endsWith(".vercel.app") || url.hostname.endsWith(".onrender.com")) {
                    return cb(null, true);
                }
            } catch {}
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return cb(null, true);
            }
            return cb(new Error("Origin not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Rate limiting (skip in test mode)
if (process.env.NODE_ENV !== "test") {
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 400,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many requests, please try again shortly." },
    });
    const strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many attempts. Please wait a few minutes." },
    });

    app.use("/api", apiLimiter);
    app.use("/api/auth/login", strictLimiter);
    app.use("/api/auth/register", strictLimiter);
    app.use("/api/orders/quick", strictLimiter);
}

// Health & Public Store Config
app.get("/api/health", (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
        success: true,
        status: dbReady ? "ok" : "degraded",
        db: dbReady ? "connected" : "disconnected",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/config", async (_req, res) => {
    try {
        const settings = await getStoreSettings();
        res.json({
            success: true,
            data: {
                supportPhone: settings.supportPhone || process.env.SUPPORT_PHONE || "9876543210",
                supportWhatsapp: settings.supportWhatsapp || process.env.SUPPORT_WHATSAPP || "919876543210",
                dispatchHub: settings.dispatchHub || "Jaipur Heritage Johari Craft Hub, Rajasthan",
                supportEmail: settings.supportEmail || "mdimran.alam1701@gmail.com",
                freeDeliveryThreshold: settings.freeDeliveryThreshold || 999,
                standardDeliveryFee: settings.standardDeliveryFee || 99,
                quickOrderEnabled: settings.quickOrderEnabled !== false,
                khataEnabled: settings.khataEnabled !== false,
                razorpayEnabled: isRazorpayConfigured(),
                razorpayKeyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : "",
            },
        });
    } catch {
        res.json({
            success: true,
            data: {
                supportPhone: process.env.SUPPORT_PHONE || "9876543210",
                supportWhatsapp: process.env.SUPPORT_WHATSAPP || "919876543210",
                dispatchHub: "Jaipur Heritage Johari Craft Hub, Rajasthan",
                supportEmail: "mdimran.alam1701@gmail.com",
                freeDeliveryThreshold: 999,
                standardDeliveryFee: 99,
                quickOrderEnabled: true,
                khataEnabled: true,
                razorpayEnabled: isRazorpayConfigured(),
                razorpayKeyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : "",
            },
        });
    }
});

// Translation Service (Auto-translates Product Names & Descriptions to Hindi)
const PHRASE_DICT = {
    "what are you": "आप क्या हैं",
    "who are you": "आप कौन हैं",
    "how are you": "आप कैसे हैं",
    "what is this": "यह क्या है",
    "who is this": "यह कौन है",
    "where are you": "आप कहाँ हैं",
    "thank you": "धन्यवाद",
    "welcome": "स्वागत है",
    "pure gold": "शुद्ध सोना",
    "gold plated": "गोल्ड प्लेटेड (सोने का पानी)",
    "22k gold plated": "22K गोल्ड प्लेटेड",
    "silver plated": "चाँदी पॉलिश",
    "rose gold": "रोज़ गोल्ड",
    "american diamond": "अमेरिकन डायमंड",
    "daily wear": "रोज़ाना पहनने के लिए",
    "free size": "समायोज्य नाप",
};

const JEWELRY_DICT = {
    bangle: "चूड़ी",
    bangles: "चूड़ियाँ",
    kada: "कड़ा",
    kadas: "कड़े",
    kangan: "कंगन",
    kangans: "कंगन",
    pair: "जोड़ा",
    set: "सेट",
    gold: "सोना (स्वर्ण)",
    golden: "सुनहरा",
    silver: "चाँदी",
    kundan: "कुंदन",
    lac: "लाख",
    meenakari: "मीनाकारी",
    bridal: "दुल्हन",
    dulhan: "दुल्हन",
    wedding: "शादी",
    chooda: "चूड़ा",
    chuda: "चूड़ा",
    glass: "कांच",
    velvet: "मखमली",
    royal: "शाही",
    jaipur: "जयपुर",
    jaipuri: "जयपुरी",
    jodhpur: "जोधपुर",
    firozabad: "फिरोजाबाद",
    traditional: "पारंपरिक",
    handcrafted: "हस्तनिर्मित",
    festive: "त्यौहारी",
    party: "पार्टी",
    gift: "उपहार",
    red: "लाल",
    green: "हरा",
    maroon: "मैरून",
    white: "सफ़ेद",
    black: "काला",
    blue: "नीला",
    pink: "गुलाबी",
    yellow: "पीला",
    orange: "नारंगी",
    diamond: "हीरा",
    pearl: "मोती",
    stone: "नगीना",
    women: "महिलाएं",
    girl: "लड़की",
    girls: "लड़कियां",
    designer: "डिज़ाइनर",
    fancy: "फैंसी",
    pure: "शुद्ध",
    original: "असली",
    new: "नया",
    best: "सर्वश्रेष्ठ",
    what: "क्या",
    who: "कौन",
    how: "कैसे",
    where: "कहाँ",
    why: "क्यों",
    you: "आप",
    are: "हैं",
    is: "है",
    am: "हूँ",
    this: "यह",
    that: "वह",
    for: "के लिए",
    with: "के साथ",
    and: "और",
};

app.post("/api/translate", async (req, res) => {
    try {
        const { text, target = "hi" } = req.body;
        if (!text || typeof text !== "string") {
            return res.json({ success: true, translatedText: "" });
        }
        const trimmed = text.trim();
        if (!trimmed) {
            return res.json({ success: true, translatedText: "" });
        }

        const lower = trimmed.toLowerCase();
        if (PHRASE_DICT[lower]) {
            return res.json({ success: true, translatedText: PHRASE_DICT[lower] });
        }

        // Try Google Translate public endpoint
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(trimmed)}`;
            const gRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (gRes.ok) {
                const data = await gRes.json();
                const translated = (data[0] || []).map((chunk) => chunk[0]).join("");
                if (translated && translated !== trimmed) {
                    return res.json({ success: true, translatedText: translated });
                }
            }
        } catch {
            // fallback below
        }

        // Dictionary fallback
        let fallback = trimmed;
        for (const [en, hi] of Object.entries(PHRASE_DICT)) {
            const regex = new RegExp(`\\b${en}\\b`, "gi");
            fallback = fallback.replace(regex, hi);
        }
        for (const [en, hi] of Object.entries(JEWELRY_DICT)) {
            const regex = new RegExp(`\\b${en}\\b`, "gi");
            fallback = fallback.replace(regex, hi);
        }
        res.json({ success: true, translatedText: fallback });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Local uploads static serving
const uploadsDir = path.resolve("uploads");
app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/chat", chatRoutes);

// Unified Production Static Frontend Fallback
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

if (process.env.SERVE_FRONTEND !== "false" && fs.existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath, { maxAge: "7d" }));
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
            return next();
        }
        return res.sendFile(frontendIndexPath);
    });
} else {
    app.get("/", (_req, res) => {
        res.json({ success: true, message: "Bangels Verse API is running" });
    });
}

app.use("/api/*", notFoundHandler);
app.use(errorHandler);

export default app;
