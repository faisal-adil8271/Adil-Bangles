import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
    Users,
    UserCheck,
    UserX,
    ShoppingBag,
    DollarSign,
    Package,
    Trash2,
    Check,
    X,
    Search,
    Plus,
    Tag,
    Megaphone,
    Shield,
    ShieldCheck,
    RefreshCw,
    Eye,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Phone,
    MapPin,
    Calendar,
    Star,
    Store,
    Settings,
    MessageCircle,
    CreditCard,
    ExternalLink,
    Box,
    Clock,
    FileText,
    Save,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    adminAPI,
    orderAPI,
    transactionAPI,
    productAPI,
    couponAPI,
    announcementAPI,
    resolveAssetUrl,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { LoadingSpinner, PriceTag, StatusBadge } from "../components/UI";

export default function AdminDashboard() {
    const { user } = useAuth();
    const { isHindi, refreshConfig, updateStoreConfigState } = useLang();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTabParam = searchParams.get("tab") || "overview";

    // Map legacy tab names to clean structure
    const tab =
        currentTabParam === "coupons" || currentTabParam === "announcements"
            ? "marketing"
            : currentTabParam === "transactions"
                ? "orders"
                : currentTabParam;

    const setTab = (nextTab) => setSearchParams(nextTab === "overview" ? {} : { tab: nextTab });

    // Primary Data State
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Storefront Configuration & Customer Care State ({isHindi ? "संपादन योग्य" : "Editable"}!)
    const [storeConfigForm, setStoreConfigForm] = useState({
        supportPhone: "9876543210",
        supportWhatsapp: "919876543210",
        dispatchHub: "Jaipur Heritage Johari Craft Hub, Rajasthan",
        supportEmail: "mdimran.alam1701@gmail.com",
        freeDeliveryThreshold: 999,
        standardDeliveryFee: 99,
    });
    const [savingConfig, setSavingConfig] = useState(false);

    // Filters & Search
    const [userFilter, setUserFilter] = useState("all");
    const [userSearch, setUserSearch] = useState("");
    const [orderFilter, setOrderFilter] = useState("all");
    const [orderSearch, setOrderSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [productFilter, setProductFilter] = useState("all");

    // Detail Modals State
    const [activeUserDetailModal, setActiveUserDetailModal] = useState(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    const [activeOrderModal, setActiveOrderModal] = useState(null);
    const [productEditModal, setProductEditModal] = useState(null);
    const [couponModalOpen, setCouponModalOpen] = useState(false);
    const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

    // Form States
    const [newCoupon, setNewCoupon] = useState({
        code: "",
        discountType: "percentage",
        discountValue: 15,
        minOrderAmount: 499,
        maxDiscount: 300,
        description: "",
    });
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        message: "",
        type: "info",
        targetAudience: "all",
    });

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const [statsRes, usersRes, ordersRes, productsRes, couponsRes, announcementsRes, configRes] =
                await Promise.all([
                    adminAPI.getStats().catch(() => ({ data: { data: null } })),
                    adminAPI.getAllUsers().catch(() => ({ data: { data: [] } })),
                    orderAPI.getAll().catch(() => ({ data: { data: [] } })),
                    productAPI.getAll({ limit: 50 }).catch(() => ({ data: { data: { products: [] } } })),
                    couponAPI.getAll().catch(() => ({ data: { data: [] } })),
                    announcementAPI.getAll().catch(() => ({ data: { data: [] } })),
                    adminAPI.getConfig().catch(() => ({ data: { data: null } })),
                ]);

            setStats(statsRes.data?.data || statsRes.data || null);
            setUsers(usersRes.data?.data || []);
            setOrders(ordersRes.data?.data || []);

            const pData = productsRes.data?.data;
            setProducts(Array.isArray(pData) ? pData : pData?.products || []);

            setCoupons(couponsRes.data?.data || []);
            setAnnouncements(announcementsRes.data?.data || []);

            if (configRes.data?.data) {
                setStoreConfigForm((prev) => ({ ...prev, ...configRes.data.data }));
            }

            if (isManual) toast.success("Live data refreshed!");
        } catch {
            toast.error("Failed to load some admin data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Open Deep User Details Modal
    const handleOpenUserDetail = async (targetUser) => {
        setUserDetailLoading(true);
        setActiveUserDetailModal({ base: targetUser, detail: null });
        try {
            if (targetUser.role === "owner") {
                const { data } = await adminAPI.getOwnerDetail(targetUser._id);
                setActiveUserDetailModal({ base: targetUser, detail: data.data || data, type: "owner" });
            } else if (targetUser.role === "user") {
                const { data } = await adminAPI.getCustomerDetail(targetUser._id);
                setActiveUserDetailModal({ base: targetUser, detail: data.data || data, type: "customer" });
            } else {
                setActiveUserDetailModal({ base: targetUser, detail: null, type: "admin" });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not load full profile details");
        } finally {
            setUserDetailLoading(false);
        }
    };

    // User Operations
    const handleApprove = async (id) => {
        try {
            await adminAPI.approveOwner(id);
            toast.success("Artisan shop approved!");
            fetchData();
            if (activeUserDetailModal?.base?._id === id) {
                setActiveUserDetailModal((prev) => ({
                    ...prev,
                    base: { ...prev.base, isApproved: true },
                    detail: prev.detail ? { ...prev.detail, owner: { ...prev.detail.owner, isApproved: true } } : null,
                }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to approve shop");
        }
    };

    const handleReject = async (id) => {
        try {
            await adminAPI.rejectOwner(id);
            toast.success("Shop approval revoked");
            fetchData();
            if (activeUserDetailModal?.base?._id === id) {
                setActiveUserDetailModal((prev) => ({
                    ...prev,
                    base: { ...prev.base, isApproved: false },
                    detail: prev.detail ? { ...prev.detail, owner: { ...prev.detail.owner, isApproved: false } } : null,
                }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to revoke approval");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this user account?")) return;
        try {
            await adminAPI.deleteUser(id);
            toast.success("User deleted successfully");
            if (activeUserDetailModal?.base?._id === id) {
                setActiveUserDetailModal(null);
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete user");
        }
    };

    // Product Operations
    const handleToggleFeatured = async (product) => {
        try {
            const nextFeatured = !product.isFeatured;
            await productAPI.update(product._id, { isFeatured: nextFeatured });
            toast.success(nextFeatured ? `"${product.name}" featured on Homepage!` : `Removed from Featured.`);
            setProducts((prev) =>
                prev.map((p) => (p._id === product._id ? { ...p, isFeatured: nextFeatured } : p))
            );
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update featured status");
        }
    };

    const handleUpdateProductStockPrice = async (e) => {
        e.preventDefault();
        if (!productEditModal) return;
        try {
            await productAPI.update(productEditModal._id, {
                stock: Number(productEditModal.stock),
                price: Number(productEditModal.price),
                compareAtPrice: Number(productEditModal.compareAtPrice || 0),
            });
            toast.success("Price & stock updated!");
            setProducts((prev) =>
                prev.map((p) => (p._id === productEditModal._id ? { ...p, ...productEditModal } : p))
            );
            setProductEditModal(null);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update product");
        }
    };

    const handleDeleteProduct = async (id, name) => {
        if (!confirm(`Delete "${name}" from the store catalog?`)) return;
        try {
            await productAPI.delete(id);
            toast.success("Product removed");
            setProducts((prev) => prev.filter((p) => p._id !== id));
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete product");
        }
    };

    // Order Operations
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            await orderAPI.updateStatus(orderId, { status: newStatus, note: "Status updated by Platform Admin" });
            toast.success(`Order marked as "${newStatus}"`);
            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
            );
            if (activeOrderModal?._id === orderId) {
                setActiveOrderModal((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!confirm("Cancel this order and automatically restore product stock?")) return;
        try {
            await orderAPI.cancel(orderId);
            toast.success("Order cancelled & stock restored");
            fetchData();
            if (activeOrderModal?._id === orderId) {
                setActiveOrderModal(null);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to cancel order");
        }
    };

    // Coupon Operations
    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code: newCoupon.code.toUpperCase().trim(),
                discountType: newCoupon.discountType,
                discountValue: Number(newCoupon.discountValue),
                minOrderAmount: Number(newCoupon.minOrderAmount),
                maxDiscount: Number(newCoupon.maxDiscount),
                description: newCoupon.description.trim(),
            };
            await couponAPI.create(payload);
            toast.success(`Coupon ${payload.code} created!`);
            setCouponModalOpen(false);
            setNewCoupon({
                code: "",
                discountType: "percentage",
                discountValue: 15,
                minOrderAmount: 499,
                maxDiscount: 300,
                description: "",
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create coupon");
        }
    };

    const handleToggleCoupon = async (id) => {
        try {
            await couponAPI.toggle(id);
            toast.success("Coupon status toggled");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to toggle coupon");
        }
    };

    const handleDeleteCoupon = async (id) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            await couponAPI.delete(id);
            toast.success("Coupon deleted");
            setCoupons((prev) => prev.filter((c) => c._id !== id));
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete coupon");
        }
    };

    // Announcement Operations
    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await announcementAPI.create({
                title: newAnnouncement.title.trim(),
                message: newAnnouncement.message.trim(),
                type: newAnnouncement.type,
                targetAudience: newAnnouncement.targetAudience,
            });
            toast.success("Store banner published!");
            setAnnouncementModalOpen(false);
            setNewAnnouncement({
                title: "",
                message: "",
                type: "info",
                targetAudience: "all",
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to publish banner");
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm("Delete this banner?")) return;
        try {
            await announcementAPI.delete(id);
            toast.success("Banner deleted");
            setAnnouncements((prev) => prev.filter((a) => a._id !== id));
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete banner");
        }
    };

    // Storefront Settings Save Handler
    const handleSaveStoreConfig = async (e) => {
        e.preventDefault();
        setSavingConfig(true);
        try {
            const payload = {
                supportPhone: storeConfigForm.supportPhone.trim(),
                supportWhatsapp: storeConfigForm.supportWhatsapp.trim(),
                dispatchHub: storeConfigForm.dispatchHub.trim(),
                supportEmail: storeConfigForm.supportEmail.trim(),
                freeDeliveryThreshold: Number(storeConfigForm.freeDeliveryThreshold) || 999,
                standardDeliveryFee: Number(storeConfigForm.standardDeliveryFee) || 99,
            };
            const { data } = await adminAPI.updateConfig(payload);
            toast.success("Storefront Identity & Customer Care updated live!");
            if (data?.data) {
                setStoreConfigForm((prev) => ({ ...prev, ...data.data }));
                if (updateStoreConfigState) updateStoreConfigState(data.data);
            }
            if (refreshConfig) refreshConfig();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update storefront settings");
        } finally {
            setSavingConfig(false);
        }
    };

    // Filtered lists
    const pendingOwners = useMemo(() => users.filter((u) => u.role === "owner" && !u.isApproved), [users]);

    const filteredUsers = useMemo(() => {
        let list = users;
        if (userFilter === "customers") list = list.filter((u) => u.role === "user");
        else if (userFilter === "owners") list = list.filter((u) => u.role === "owner");
        else if (userFilter === "pending") list = list.filter((u) => u.role === "owner" && !u.isApproved);
        else if (userFilter === "admins") list = list.filter((u) => u.role === "admin");

        if (userSearch.trim()) {
            const q = userSearch.toLowerCase();
            list = list.filter(
                (u) =>
                    u.name?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.phone?.includes(q) ||
                    u.companyName?.toLowerCase().includes(q) ||
                    u.city?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [users, userFilter, userSearch]);

    const filteredOrders = useMemo(() => {
        let list = orders;
        if (orderFilter !== "all") list = list.filter((o) => o.status === orderFilter);
        if (orderSearch.trim()) {
            const q = orderSearch.toLowerCase();
            list = list.filter(
                (o) =>
                    o.orderCode?.toLowerCase().includes(q) ||
                    o._id?.toLowerCase().includes(q) ||
                    o.customerName?.toLowerCase().includes(q) ||
                    o.customerPhone?.includes(q) ||
                    o.user?.name?.toLowerCase().includes(q) ||
                    o.user?.phone?.includes(q)
            );
        }
        return list;
    }, [orders, orderFilter, orderSearch]);

    const filteredProducts = useMemo(() => {
        let list = products;
        if (productFilter === "featured") list = list.filter((p) => p.isFeatured);
        else if (productFilter === "instock") list = list.filter((p) => p.stock > 0);
        else if (productFilter === "outofstock") list = list.filter((p) => p.stock <= 0);

        if (productSearch.trim()) {
            const q = productSearch.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.category?.toLowerCase().includes(q) ||
                    p.material?.toLowerCase().includes(q) ||
                    p.owner?.name?.toLowerCase().includes(q) ||
                    p.owner?.companyName?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [products, productFilter, productSearch]);

    if (loading) return <LoadingSpinner label="Loading Bangels Verse Admin Panel..." />;

    return (
        <div className="min-h-screen bg-slate-50 text-ink pb-20">
            {/* Top Clean Sub-Header */}
            <div className="bg-white border-b border-parchment shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-sindoor-50 border border-sindoor-200 text-sindoor-700 flex items-center justify-center shrink-0">
                                <Shield size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-serif font-bold text-ink">
                                        {isHindi ? "एडमिन प्रबंधन पैनल" : "Admin Management Panel"}
                                    </h1>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                        {isHindi ? "सिस्टम लाइव" : "System Live"}
                                    </span>
                                </div>
                                <p className="text-xs text-umber mt-0.5">
                                    {isHindi ? "लॉगिन खाता: " : "Logged in as "}
                                    <strong className="text-ink">{user?.email || user?.name}</strong> • {isHindi ? "पूर्ण स्टोरफ़्रंट व यूज़र नियंत्रण" : "Full Storefront & User Control"}
                                </p>
                            </div>
                        </div>

                        {/* Top Action Triggers */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                className="btn-secondary !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5"
                                title="Refresh live database data"
                            >
                                <RefreshCw size={14} className={refreshing ? "animate-spin text-sindoor-700" : ""} />
                                <span>{refreshing ? (isHindi ? "ताज़ा हो रहा है..." : "Refreshing...") : (isHindi ? "ताज़ा करें" : "Refresh")}</span>
                            </button>
                            <Link
                                to="/"
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5"
                            >
                                <span>{isHindi ? "दुकान देखें" : "Storefront"}</span>
                                <ExternalLink size={13} />
                            </Link>
                        </div>
                    </div>

                    {/* Pending Verification Notice */}
                    {pendingOwners.length > 0 && (
                        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={17} className="text-amber-700 shrink-0" />
                                <span>
                                    <strong>{pendingOwners.length} {isHindi ? "नई कारीगर दुकानें" : "New Artisan Shop(s)"}</strong> {isHindi ? "स्वीकृति की प्रतीक्षा कर रही हैं।" : "awaiting administrative approval to sell on Bangels Verse."}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setTab("users");
                                    setUserFilter("pending");
                                }}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                            >
                                {isHindi ? "दुकान स्वीकृति जांचें →" : "Review Shop Approvals →"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Clear Segmented Navigation Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-parchment/60 py-2">
                    {[
                        { id: "overview", label: isHindi ? "कार्यकारी अवलोकन" : "Executive Overview", icon: ShieldCheck },
                        { id: "users", label: isHindi ? `दुकानें व यूज़र (${users.length})` : `Users & Shops (${users.length})`, icon: Users },
                        { id: "products", label: isHindi ? `मास्टर कैटलॉग (${products.length})` : `Catalog (${products.length})`, icon: Package },
                        { id: "orders", label: isHindi ? `ऑर्डर व पूर्ति (${orders.length})` : `Orders (${orders.length})`, icon: ShoppingBag },
                        { id: "marketing", label: isHindi ? `मार्केटिंग (${coupons.length + announcements.length})` : `Marketing (${coupons.length + announcements.length})`, icon: Tag },
                        { id: "settings", label: isHindi ? "प्लेटफ़ॉर्म सेटिंग्स" : "Platform Settings", icon: Settings },
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${active
                                    ? "bg-sindoor-700 text-white shadow-xs font-bold"
                                    : "bg-white text-umber hover:text-ink hover:bg-linen border border-parchment"
                                    }`}
                            >
                                <Icon size={15} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Clean KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4 flex items-center gap-3.5 bg-white border border-parchment">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-umber uppercase tracking-wider">
                                {isHindi ? "कुल बिक्री (GMV)" : "Total Sales (GMV)"}
                            </p>
                            <p className="text-xl font-serif font-bold text-ink tabular-nums">
                                ₹{(stats?.totalRevenue || 0).toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>

                    <div className="card p-4 flex items-center gap-3.5 bg-white border border-parchment">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                            <ShoppingBag size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-umber uppercase tracking-wider">
                                {isHindi ? "ग्राहक ऑर्डर" : "Customer Orders"}
                            </p>
                            <p className="text-xl font-serif font-bold text-ink tabular-nums">
                                {orders.length}
                                <span className="text-xs text-amber-700 font-normal ml-1">
                                    ({orders.filter((o) => o.status === "pending").length} {isHindi ? "लंबित" : "pending"})
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="card p-4 flex items-center gap-3.5 bg-white border border-parchment">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                            <Store size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-umber uppercase tracking-wider">
                                {isHindi ? "कारीगर दुकानें" : "Artisan Shops"}
                            </p>
                            <p className="text-xl font-serif font-bold text-ink tabular-nums">
                                {users.filter((u) => u.role === "owner" && u.isApproved).length}
                                {pendingOwners.length > 0 && (
                                    <span className="text-xs text-red-600 font-bold ml-1">
                                        ({pendingOwners.length} {isHindi ? "लंबित" : "pending"})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="card p-4 flex items-center gap-3.5 bg-white border border-parchment">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-sindoor-700 flex items-center justify-center shrink-0 border border-rose-100">
                            <Package size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-umber uppercase tracking-wider">
                                {isHindi ? "कंगन कैटलॉग" : "Bangles Catalog"}
                            </p>
                            <p className="text-xl font-serif font-bold text-ink tabular-nums">
                                {products.length} {isHindi ? "डिज़ाइन" : "Designs"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========================================================= */}
                {/* TAB 1: EXECUTIVE OVERVIEW                                 */}
                {/* ========================================================= */}
                {tab === "overview" && (
                    <div className="space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Recent Customer Orders Stream */}
                            <div className="card p-5 bg-white border border-parchment space-y-4">
                                <div className="flex items-center justify-between border-b border-parchment pb-3">
                                    <h3 className="font-serif font-bold text-ink text-base flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-sindoor-700" />
                                        Latest Marketplace Orders
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setTab("orders")}
                                        className="text-xs font-semibold text-sindoor-700 hover:underline"
                                    >
                                        View All ({orders.length}) →
                                    </button>
                                </div>

                                {orders.length === 0 ? (
                                    <p className="text-xs text-umber py-6 text-center">No orders placed yet.</p>
                                ) : (
                                    <div className="divide-y divide-parchment/60">
                                        {orders.slice(0, 5).map((o) => (
                                            <div
                                                key={o._id}
                                                className="py-3 flex items-center justify-between gap-3 text-xs"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-sindoor-700 text-sm">
                                                            {o.orderCode || `#${o._id.slice(-6)}`}
                                                        </span>
                                                        <span className="font-semibold text-ink">
                                                            {o.customerName || o.user?.name || "Customer"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-umber mt-0.5">
                                                        {o.items?.length || 1} item(s) • {o.shippingAddress?.city || "Direct Address"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <StatusBadge status={o.status} />
                                                    <span className="font-bold text-ink text-sm tabular-nums">
                                                        ₹{Number(o.totalAmount || 0).toLocaleString("en-IN")}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveOrderModal(o)}
                                                        className="btn-secondary !py-1 !px-2 text-xs"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Registered Users & Shops */}
                            <div className="card p-5 bg-white border border-parchment space-y-4">
                                <div className="flex items-center justify-between border-b border-parchment pb-3">
                                    <h3 className="font-serif font-bold text-ink text-base flex items-center gap-2">
                                        <Users size={18} className="text-brass-700" />
                                        Recent User & Shop Accounts
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setTab("users")}
                                        className="text-xs font-semibold text-sindoor-700 hover:underline"
                                    >
                                        Directory ({users.length}) →
                                    </button>
                                </div>

                                <div className="divide-y divide-parchment/60">
                                    {users.slice(0, 5).map((u) => (
                                        <div key={u._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                                            <div>
                                                <p className="font-semibold text-ink text-sm">
                                                    {u.name} {u.companyName ? `• ${u.companyName}` : ""}
                                                </p>
                                                <p className="text-umber text-[11px]">
                                                    {u.phone || u.email} {u.city ? `• ${u.city}` : ""}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === "owner"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : u.role === "admin"
                                                            ? "bg-rose-100 text-rose-800"
                                                            : "bg-slate-100 text-slate-800"
                                                        }`}
                                                >
                                                    {u.role}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenUserDetail(u)}
                                                    className="btn-secondary !py-1 !px-2.5 text-xs inline-flex items-center gap-1 font-semibold"
                                                >
                                                    <Eye size={12} /> View Profile
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: SHOPS & USERS DIRECTORY (With Full Details!)       */}
                {/* ========================================================= */}
                {tab === "users" && (
                    <div className="space-y-4">
                        <div className="card p-4 bg-white border border-parchment flex flex-col md:flex-row items-center justify-between gap-3">
                            {/* Filter Pills */}
                            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                                {[
                                    { id: "all", label: `All Users (${users.length})` },
                                    { id: "owners", label: `Artisan Shops (${users.filter((u) => u.role === "owner").length})` },
                                    { id: "pending", label: `Pending Approval (${pendingOwners.length})` },
                                    { id: "customers", label: `Customers (${users.filter((u) => u.role === "user").length})` },
                                    { id: "admins", label: `Admins (${users.filter((u) => u.role === "admin").length})` },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setUserFilter(f.id)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${userFilter === f.id
                                            ? "bg-sindoor-700 text-white border-sindoor-700 shadow-xs"
                                            : "bg-white text-ink border-parchment hover:bg-linen"
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-80">
                                <Search size={15} className="absolute left-3 top-2.5 text-umber" />
                                <input
                                    type="text"
                                    placeholder="Search by name, phone, email, shop..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-linen/50 border border-parchment text-xs text-ink placeholder-umber focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="card bg-white border border-parchment overflow-x-auto shadow-xs">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-linen/70 text-[11px] uppercase tracking-wider text-umber border-b border-parchment">
                                    <tr>
                                        <th className="px-5 py-3.5">User & Contact</th>
                                        <th className="px-5 py-3.5">Role</th>
                                        <th className="px-5 py-3.5">Shop / Business Name</th>
                                        <th className="px-5 py-3.5">Location</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions & Profile</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-parchment/60">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-umber">
                                                No users matching current filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u._id} className="hover:bg-ivory/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-sindoor-100 text-sindoor-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                            {u.name?.[0] || "U"}
                                                        </div>
                                                        <div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenUserDetail(u)}
                                                                className="font-bold text-ink hover:text-sindoor-700 text-sm text-left block"
                                                            >
                                                                {u.name}
                                                            </button>
                                                            <p className="text-umber font-mono text-[11px]">
                                                                {u.phone || u.email || "No direct phone"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 capitalize">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === "admin"
                                                            ? "bg-rose-100 text-rose-800"
                                                            : u.role === "owner"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : "bg-slate-100 text-slate-800"
                                                            }`}
                                                    >
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {u.companyName ? (
                                                        <span className="font-semibold text-brass-700">
                                                            {u.companyName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-umber/60">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-umber">
                                                    {u.city || u.address || "—"}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {u.role === "owner" ? (
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${u.isApproved
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-amber-100 text-amber-800 font-bold"
                                                                }`}
                                                        >
                                                            {u.isApproved ? "Approved Shop" : "Pending Verification"}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right space-x-2">
                                                    {/* Primary Button to Open Details */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenUserDetail(u)}
                                                        className="px-2.5 py-1 rounded bg-linen hover:bg-parchment text-ink font-semibold text-xs inline-flex items-center gap-1 border border-parchment shadow-xs"
                                                    >
                                                        <Eye size={13} className="text-sindoor-700" />
                                                        <span>View Details</span>
                                                    </button>

                                                    {u.role === "owner" && !u.isApproved && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(u._id)}
                                                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                                                            title="Approve Shop"
                                                        >
                                                            <Check size={13} /> Approve
                                                        </button>
                                                    )}
                                                    {u.role === "owner" && u.isApproved && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(u._id)}
                                                            className="px-2 py-1 rounded bg-white hover:bg-linen text-amber-800 font-semibold text-xs border border-parchment"
                                                            title="Revoke Approval"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                    {u.role !== "admin" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteUser(u._id)}
                                                            className="p-1.5 rounded hover:bg-red-50 text-umber hover:text-red-600 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: MASTER CATALOG OVERSIGHT                           */}
                {/* ========================================================= */}
                {tab === "products" && (
                    <div className="space-y-4">
                        <div className="card p-4 bg-white border border-parchment flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                                {[
                                    { id: "all", label: `All Bangles (${products.length})` },
                                    { id: "featured", label: `Featured ⭐ (${products.filter((p) => p.isFeatured).length})` },
                                    { id: "instock", label: `In Stock (${products.filter((p) => p.stock > 0).length})` },
                                    { id: "outofstock", label: `Out of Stock (${products.filter((p) => p.stock <= 0).length})` },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setProductFilter(f.id)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${productFilter === f.id
                                            ? "bg-sindoor-700 text-white border-sindoor-700 shadow-xs"
                                            : "bg-white text-ink border-parchment hover:bg-linen"
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-80">
                                <Search size={15} className="absolute left-3 top-2.5 text-umber" />
                                <input
                                    type="text"
                                    placeholder="Search by bangle title, material, category..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-linen/50 border border-parchment text-xs text-ink placeholder-umber focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="card bg-white border border-parchment overflow-x-auto shadow-xs">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-linen/70 text-[11px] uppercase tracking-wider text-umber border-b border-parchment">
                                    <tr>
                                        <th className="px-5 py-3.5">{isHindi ? "कंगन डिज़ाइन" : "Bangle Design"}</th>
                                        <th className="px-5 py-3.5">{isHindi ? "श्रेणी व सामग्री" : "Category & Material"}</th>
                                        <th className="px-5 py-3.5">{isHindi ? "कारीगर दुकान" : "Artisan Shop"}</th>
                                        <th className="px-5 py-3.5">{isHindi ? "मूल्य" : "Price"}</th>
                                        <th className="px-5 py-3.5">Stock</th>
                                        <th className="px-5 py-3.5">Homepage Featured</th>
                                        <th className="px-5 py-3.5 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-parchment/60">
                                    {filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-umber">
                                                No bangles match current filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map((p) => {
                                            const imgSrc =
                                                resolveAssetUrl(p.image || p.images?.[0]) ||
                                                "/images/products/gold-kada.svg";
                                            return (
                                                <tr key={p._id} className="hover:bg-ivory/60 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={imgSrc}
                                                                alt=""
                                                                className="w-10 h-10 object-cover rounded-lg border border-parchment bg-linen shrink-0"
                                                            />
                                                            <div className="min-w-0">
                                                                <Link
                                                                    to={`/products/${p._id}`}
                                                                    target="_blank"
                                                                    className="font-bold text-ink hover:text-sindoor-700 truncate block font-serif text-sm"
                                                                >
                                                                    {p.name}
                                                                </Link>
                                                                {p.nameHi && (
                                                                    <p className="text-[11px] text-umber truncate">
                                                                        {p.nameHi}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-semibold text-ink">{p.category || "Jewelry"}</span>
                                                        <p className="text-[11px] text-umber">{p.material || "Handcrafted"}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-ink font-medium">
                                                        {p.owner?.companyName || p.owner?.name || "Artisan"}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-bold text-ink text-sm tabular-nums">
                                                            ₹{p.price}
                                                        </span>
                                                        {p.compareAtPrice > p.price && (
                                                            <span className="block text-[10px] text-umber line-through">
                                                                ₹{p.compareAtPrice}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${p.stock > 0
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-red-100 text-red-800 font-bold"
                                                                }`}
                                                        >
                                                            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleFeatured(p)}
                                                            className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 border transition-colors ${p.isFeatured
                                                                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                                                                : "bg-white text-umber border-parchment hover:text-ink"
                                                                }`}
                                                            title="Toggle showcase on Homepage Hero"
                                                        >
                                                            <Star
                                                                size={13}
                                                                className={p.isFeatured ? "fill-amber-500 text-amber-500" : ""}
                                                            />
                                                            <span>{p.isFeatured ? "Featured" : "Normal"}</span>
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right space-x-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setProductEditModal(p)}
                                                            className="p-1.5 rounded bg-white hover:bg-linen text-ink border border-parchment shadow-xs"
                                                            title="Quick Edit Price & Stock"
                                                        >
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteProduct(p._id, p.name)}
                                                            className="p-1.5 rounded hover:bg-red-50 text-umber hover:text-red-600 transition-colors"
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: ORDERS & FULFILLMENT                               */}
                {/* ========================================================= */}
                {tab === "orders" && (
                    <div className="space-y-4">
                        <div className="card p-4 bg-white border border-parchment flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                                {[
                                    { id: "all", label: `All Orders (${orders.length})` },
                                    { id: "pending", label: "Pending" },
                                    { id: "confirmed", label: "Confirmed" },
                                    { id: "packed", label: "Packed" },
                                    { id: "shipped", label: "Shipped" },
                                    { id: "delivered", label: "Delivered" },
                                    { id: "cancelled", label: "Cancelled" },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setOrderFilter(f.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${orderFilter === f.id
                                            ? "bg-sindoor-700 text-white border-sindoor-700 shadow-xs"
                                            : "bg-white text-ink border-parchment hover:bg-linen"
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-80">
                                <Search size={15} className="absolute left-3 top-2.5 text-umber" />
                                <input
                                    type="text"
                                    placeholder="Search by order code (BV-XXXX), name, phone..."
                                    value={orderSearch}
                                    onChange={(e) => setOrderSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-linen/50 border border-parchment text-xs text-ink placeholder-umber focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="card bg-white border border-parchment overflow-x-auto shadow-xs">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-linen/70 text-[11px] uppercase tracking-wider text-umber border-b border-parchment">
                                    <tr>
                                        <th className="px-5 py-3.5">Order Code</th>
                                        <th className="px-5 py-3.5">Customer & Phone</th>
                                        <th className="px-5 py-3.5">Delivery City</th>
                                        <th className="px-5 py-3.5">Payment</th>
                                        <th className="px-5 py-3.5">Total Amount</th>
                                        <th className="px-5 py-3.5">Status (Live Change)</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-parchment/60">
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-umber">
                                                No orders matching current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((o) => (
                                            <tr key={o._id} className="hover:bg-ivory/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <span className="font-mono font-bold text-sindoor-700 text-sm">
                                                        {o.orderCode || `#${o._id.slice(-6)}`}
                                                    </span>
                                                    <p className="text-[10px] text-umber mt-0.5">
                                                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-bold text-ink">
                                                        {o.customerName || o.user?.name || "Customer"}
                                                    </p>
                                                    <p className="text-umber font-mono text-[11px]">
                                                        {o.customerPhone || o.user?.phone || "—"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 text-ink">
                                                    <p className="font-semibold">{o.shippingAddress?.city || "Direct"}</p>
                                                    <p className="text-[11px] text-umber truncate max-w-[150px]">
                                                        {o.shippingAddress?.line1}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 capitalize">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${o.paymentType === "online"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : o.paymentType === "credit"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : "bg-emerald-100 text-emerald-800"
                                                            }`}
                                                    >
                                                        {o.paymentType === "credit"
                                                            ? "Khata"
                                                            : o.paymentType === "online"
                                                                ? "Razorpay"
                                                                : "COD"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="font-bold text-ink text-sm tabular-nums">
                                                        ₹{Number(o.totalAmount || 0).toLocaleString("en-IN")}
                                                    </span>
                                                    {o.isPaid && (
                                                        <span className="block text-[10px] text-emerald-700 font-bold">
                                                            ✓ Paid
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <select
                                                        value={o.status}
                                                        onChange={(e) => handleUpdateOrderStatus(o._id, e.target.value)}
                                                        className="px-2.5 py-1 rounded-lg bg-linen border border-parchment text-xs font-bold text-ink focus:outline-none focus:border-sindoor-600"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="packed">Packed</option>
                                                        <option value="shipped">Shipped</option>
                                                        <option value="delivered">Delivered</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </td>
                                                <td className="px-5 py-3.5 text-right space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveOrderModal(o)}
                                                        className="px-2.5 py-1 rounded bg-white hover:bg-linen text-xs font-semibold text-ink border border-parchment shadow-xs inline-flex items-center gap-1"
                                                    >
                                                        <Eye size={12} /> Details
                                                    </button>
                                                    {o.status !== "cancelled" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelOrder(o._id)}
                                                            className="px-2 py-1 rounded hover:bg-red-50 text-red-700 text-xs border border-parchment"
                                                            title="Cancel & Restock"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 5: MARKETING & BANNERS (Unified Tab)                  */}
                {/* ========================================================= */}
                {tab === "marketing" && (
                    <div className="space-y-6">
                        {/* Coupons Section */}
                        <div className="card p-5 bg-white border border-parchment space-y-4">
                            <div className="flex items-center justify-between border-b border-parchment pb-3">
                                <div>
                                    <h3 className="font-serif font-bold text-ink text-base">Discount Coupons</h3>
                                    <p className="text-xs text-umber">Create promo codes for festive campaigns</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCouponModalOpen(true)}
                                    className="btn-primary !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5"
                                >
                                    <Plus size={14} /> + Create Coupon
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-linen/60 text-[11px] uppercase tracking-wider text-umber border-b border-parchment">
                                        <tr>
                                            <th className="px-4 py-3">Promo Code</th>
                                            <th className="px-4 py-3">Discount</th>
                                            <th className="px-4 py-3">Min Order / Cap</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-parchment/60">
                                        {coupons.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-6 text-umber">
                                                    No coupons created. Click "+ Create Coupon" above.
                                                </td>
                                            </tr>
                                        ) : (
                                            coupons.map((c) => (
                                                <tr key={c._id}>
                                                    <td className="px-4 py-3 font-mono font-bold text-sindoor-700 text-sm">
                                                        {c.code}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-ink">
                                                        {c.discountType === "percentage"
                                                            ? `${c.discountValue}% OFF`
                                                            : `₹${c.discountValue} Flat OFF`}
                                                    </td>
                                                    <td className="px-4 py-3 text-umber">
                                                        Min ₹{c.minOrderAmount || 0} • Cap ₹{c.maxDiscount || "No Cap"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleCoupon(c._id)}
                                                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${c.isActive
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-slate-100 text-slate-700"
                                                                }`}
                                                        >
                                                            {c.isActive ? "Active" : "Paused"}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCoupon(c._id)}
                                                            className="p-1 rounded text-umber hover:text-red-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Announcements Banners Section */}
                        <div className="card p-5 bg-white border border-parchment space-y-4">
                            <div className="flex items-center justify-between border-b border-parchment pb-3">
                                <div>
                                    <h3 className="font-serif font-bold text-ink text-base">Storefront Banners</h3>
                                    <p className="text-xs text-umber">Broadcast top ticker alerts across the marketplace</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAnnouncementModalOpen(true)}
                                    className="btn-primary !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5"
                                >
                                    <Plus size={14} /> + Publish Banner
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-linen/60 text-[11px] uppercase tracking-wider text-umber border-b border-parchment">
                                        <tr>
                                            <th className="px-4 py-3">Heading</th>
                                            <th className="px-4 py-3">Message Preview</th>
                                            <th className="px-4 py-3">Audience</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-parchment/60">
                                        {announcements.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-6 text-umber">
                                                    No banners active. Click "+ Publish Banner" above.
                                                </td>
                                            </tr>
                                        ) : (
                                            announcements.map((a) => (
                                                <tr key={a._id}>
                                                    <td className="px-4 py-3 font-semibold text-ink">{a.title}</td>
                                                    <td className="px-4 py-3 text-umber max-w-sm truncate">{a.message}</td>
                                                    <td className="px-4 py-3 capitalize text-ink">{a.targetAudience}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAnnouncement(a._id)}
                                                            className="p-1 rounded text-umber hover:text-red-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 6: PLATFORM & SYSTEM SETTINGS                         */}
                {/* ========================================================= */}
                {tab === "settings" && (
                    <div className="space-y-6">
                        {/* Master Admin Profile & Security Card */}
                        <div className="card p-6 bg-white border border-parchment space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-sindoor-50 border border-sindoor-200 text-sindoor-700 flex items-center justify-center shrink-0">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-serif font-bold text-ink text-lg">
                                                Master Platform Authority
                                            </h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                                Super Admin
                                            </span>
                                        </div>
                                        <p className="text-xs text-umber mt-0.5">
                                            Signed in as <strong className="text-ink">{user?.email || "mdimran.alam1701@gmail.com"}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                        Authenticated Active
                                    </span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 text-xs">
                                <div className="p-3.5 bg-linen/50 rounded-xl border border-parchment">
                                    <span className="text-[10px] uppercase font-bold text-umber block">Admin Email Account</span>
                                    <p className="font-bold text-ink mt-1 truncate">{user?.email || "mdimran.alam1701@gmail.com"}</p>
                                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Bcrypt salt (12-rounds)</p>
                                </div>
                                <div className="p-3.5 bg-linen/50 rounded-xl border border-parchment">
                                    <span className="text-[10px] uppercase font-bold text-umber block">Administrative Role</span>
                                    <p className="font-bold text-ink mt-1">Master Administrator (`admin`)</p>
                                    <p className="text-[11px] text-umber mt-0.5">Unrestricted root system permissions</p>
                                </div>
                                <div className="p-3.5 bg-linen/50 rounded-xl border border-parchment">
                                    <span className="text-[10px] uppercase font-bold text-umber block">Session Status</span>
                                    <p className="font-bold text-ink mt-1">Active JWT Token</p>
                                    <p className="text-[11px] text-umber mt-0.5">Live MongoDB Session Verified</p>
                                </div>
                            </div>
                        </div>

                        {/* Store Identity & Customer Care Desk (EDITABLE!) */}
                        <form onSubmit={handleSaveStoreConfig} className="space-y-6">
                            <div className="card p-6 bg-white border border-parchment space-y-5 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-serif font-bold text-ink text-base">{isHindi ? "स्टोरफ़्रंट पहचान व ग्राहक सहायता" : "Storefront Identity & Customer Care"}</h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                                                {isHindi ? "संपादन योग्य" : "Editable"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-umber mt-0.5">{isHindi ? "बैनर, कॉल बटन, चेकआउट और WhatsApp पर दिखने वाली आधिकारिक जानकारी" : "Edit official channels shown across store banners, call buttons, checkout & WhatsApp"}</p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingConfig}
                                        className="btn-primary !py-2.5 !px-5 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs shrink-0"
                                    >
                                        <Save size={14} className={savingConfig ? "animate-pulse" : ""} />
                                        <span>{savingConfig ? (isHindi ? "सहेजा जा रहा है..." : "Saving...") : (isHindi ? "स्टोरफ़्रंट बदलाव सुरक्षित करें" : "Save Storefront Changes")}</span>
                                    </button>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-umber flex items-center gap-1.5">
                                            <Phone size={13} className="text-sindoor-700" />
                                            <span>{isHindi ? "ऑर्डर हेल्पलाइन (ग्राहक कॉल)" : "Order Helpline (Customer Call)"}</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 font-mono text-xs text-umber font-bold">+91</span>
                                            <input
                                                type="text"
                                                value={storeConfigForm.supportPhone}
                                                onChange={(e) =>
                                                    setStoreConfigForm((prev) => ({ ...prev, supportPhone: e.target.value }))
                                                }
                                                placeholder="9876543210"
                                                className="w-full pl-12 pr-3 py-2 rounded-lg bg-linen/50 border border-parchment font-mono font-bold text-sm text-ink focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                                required
                                            />
                                        </div>
                                        <p className="text-[11px] text-umber">{isHindi ? "शीर्ष घोषणा पट्टी, ऑर्डर सहायता और फ़ूटर पर दिखाई देती है" : "Displayed on top announcement bar, order help, and footer"}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-umber flex items-center gap-1.5">
                                            <MessageCircle size={13} className="text-emerald-700" />
                                            <span>{isHindi ? "WhatsApp ऑर्डर डेस्क" : "WhatsApp Ordering Desk"}</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 font-mono text-xs text-umber font-bold">+91</span>
                                            <input
                                                type="text"
                                                value={storeConfigForm.supportWhatsapp}
                                                onChange={(e) =>
                                                    setStoreConfigForm((prev) => ({ ...prev, supportWhatsapp: e.target.value }))
                                                }
                                                placeholder="9876543210"
                                                className="w-full pl-12 pr-3 py-2 rounded-lg bg-linen/50 border border-parchment font-mono font-bold text-sm text-ink focus:outline-none focus:border-emerald-600 focus:bg-white"
                                                required
                                            />
                                        </div>
                                        <p className="text-[11px] text-umber">{isHindi ? "ग्राहकों के लिए 1-क्लिक सीधा WhatsApp चैट बटन" : "Direct 1-tap WhatsApp chat button for non-tech-savvy buyers"}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-umber flex items-center gap-1.5">
                                            <MapPin size={13} className="text-brass-700" />
                                            <span>{isHindi ? "आधिकारिक डिस्पैच हब पता" : "Official Dispatch Hub Address"}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={storeConfigForm.dispatchHub}
                                            onChange={(e) =>
                                                setStoreConfigForm((prev) => ({ ...prev, dispatchHub: e.target.value }))
                                            }
                                            placeholder="Jaipur Heritage Johari Craft Hub, Rajasthan"
                                            className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment font-semibold text-xs text-ink focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                            required
                                        />
                                        <p className="text-[11px] text-umber">{isHindi ? "केंद्रीय पैकेजिंग, छंटाई व प्रेषण स्थान" : "Central sorting, crafting & packaging location"}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase text-umber flex items-center gap-1.5">
                                            <span>{isHindi ? "आधिकारिक सहायता ईमेल" : "Official Support Email"}</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={storeConfigForm.supportEmail}
                                            onChange={(e) =>
                                                setStoreConfigForm((prev) => ({ ...prev, supportEmail: e.target.value }))
                                            }
                                            placeholder="mdimran.alam1701@gmail.com"
                                            className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment font-semibold text-xs text-ink focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                            required
                                        />
                                        <p className="text-[11px] text-umber">{isHindi ? "बिलिंग, रिटर्न व पूछताछ के लिए संपर्क" : "Escalation contact for billing, returns and queries"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Marketplace Policies & Ordering Rules */}
                            <div className="card p-6 bg-white border border-parchment space-y-4 shadow-xs">
                                <div className="border-b border-parchment pb-3">
                                    <h3 className="font-serif font-bold text-ink text-base">{isHindi ? "ऑर्डर नियम व लॉजिस्टिक्स नीतियां" : "Ordering Rules & Logistics Policies"}</h3>
                                    <p className="text-xs text-umber">{isHindi ? "प्लेटफ़ॉर्म-व्यापी सीमाएं और शिपिंग शर्तें" : "Platform-wide thresholds and shipping constraints"}</p>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                                    <div className="p-4 rounded-xl bg-linen/50 border border-parchment space-y-2">
                                        <label className="font-bold text-ink text-xs block">{isHindi ? "मुफ़्त डिलीवरी सीमा (₹)" : "Free Delivery Threshold (₹)"}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={storeConfigForm.freeDeliveryThreshold}
                                            onChange={(e) =>
                                                setStoreConfigForm((prev) => ({ ...prev, freeDeliveryThreshold: e.target.value }))
                                            }
                                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-parchment font-bold text-base text-sindoor-700 focus:outline-none focus:border-sindoor-600"
                                        />
                                        <p className="text-umber text-[11px]">{isHindi ? "इस राशि से कम के ऑर्डर पर कूरियर शुल्क लगता है" : "Orders below this amount incur courier charges"}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-linen/50 border border-parchment space-y-2">
                                        <label className="font-bold text-ink text-xs block">{isHindi ? "मानक कूरियर शुल्क (₹)" : "Standard Courier Fee (₹)"}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={storeConfigForm.standardDeliveryFee}
                                            onChange={(e) =>
                                                setStoreConfigForm((prev) => ({ ...prev, standardDeliveryFee: e.target.value }))
                                            }
                                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-parchment font-bold text-base text-ink focus:outline-none focus:border-sindoor-600"
                                        />
                                        <p className="text-umber text-[11px]">{isHindi ? "मुफ़्त सीमा से कम होने पर कार्ट में जोड़ा जाता है" : "Applied to cart when subtotal is below free delivery threshold"}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-linen/50 border border-parchment space-y-1.5">
                                        <span className="font-bold text-ink text-xs block">{isHindi ? "भुगतान के तरीके" : "Payment Methods"}</span>
                                        <p className="text-sm font-bold text-emerald-700">{isHindi ? "COD, UPI व खाता सक्रिय" : "COD, UPI, & Khata Active"}</p>
                                        <p className="text-umber text-[11px]">{isHindi ? "ग्राहक 1-टैप या घर आने पर नकद भुगतान कर सकते हैं" : "Non-tech buyers can order via 1-tap or cash upon delivery"}</p>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingConfig}
                                        className="btn-primary !py-2.5 !px-6 text-xs font-bold inline-flex items-center gap-2 shadow-xs"
                                    >
                                        <Save size={14} className={savingConfig ? "animate-pulse" : ""} />
                                        <span>{savingConfig ? "Saving Changes..." : "Save All Configuration"}</span>
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* System Health & Cache Controls */}
                        <div className="card p-6 bg-white border border-parchment space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment pb-3">
                                <div>
                                    <h3 className="font-serif font-bold text-ink text-base">{isHindi ? "सिस्टम स्वास्थ्य व लाइव डेटाबेस" : "System Health & Live Database"}</h3>
                                    <p className="text-xs text-umber">{isHindi ? "बैकएंड सेवाओं और डेटाबेस का वास्तविक समय स्थिति" : "Real-time status of backend microservices and database daemon"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fetchData(true)}
                                    disabled={refreshing}
                                    className="btn-primary !py-2 !px-4 text-xs inline-flex items-center gap-1.5"
                                >
                                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                                    <span>{isHindi ? "डेटाबेस कैश सिंक करें" : "Sync Database Cache"}</span>
                                </button>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono">
                                <div className="p-3 bg-linen/30 rounded-lg border border-parchment">
                                    <span className="text-[10px] font-sans font-bold text-umber uppercase block">Database Daemon</span>
                                    <p className="font-bold text-emerald-700 mt-1">MongoDB 8.0</p>
                                    <p className="text-slate-500 text-[11px]">127.0.0.1:27017</p>
                                </div>
                                <div className="p-3 bg-linen/30 rounded-lg border border-parchment">
                                    <span className="text-[10px] font-sans font-bold text-umber uppercase block">API Gateway</span>
                                    <p className="font-bold text-emerald-700 mt-1">Node Express 5002</p>
                                    <p className="text-slate-500 text-[11px]">IPv4 0.0.0.0:5002</p>
                                </div>
                                <div className="p-3 bg-linen/30 rounded-lg border border-parchment">
                                    <span className="text-[10px] font-sans font-bold text-umber uppercase block">Vite Client</span>
                                    <p className="font-bold text-emerald-700 mt-1">React 18 SPA</p>
                                    <p className="text-slate-500 text-[11px]">localhost:3000</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL 1: COMPREHENSIVE USER DETAIL INSPECTOR (THE FIX!)   */}
            {/* ========================================================= */}
            {activeUserDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-parchment rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-parchment pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-sindoor-50 border border-sindoor-200 text-sindoor-800 flex items-center justify-center font-bold text-lg uppercase shrink-0">
                                    {activeUserDetailModal.base.name?.[0] || "U"}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-serif font-bold text-ink">
                                            {activeUserDetailModal.base.name}
                                        </h3>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${activeUserDetailModal.base.role === "owner"
                                                ? "bg-purple-100 text-purple-800"
                                                : activeUserDetailModal.base.role === "admin"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-slate-100 text-slate-800"
                                                }`}
                                        >
                                            {activeUserDetailModal.base.role}
                                        </span>
                                        {activeUserDetailModal.base.role === "owner" && (
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeUserDetailModal.base.isApproved
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-amber-100 text-amber-800"
                                                    }`}
                                            >
                                                {activeUserDetailModal.base.isApproved ? "Approved Shop" : "Pending Approval"}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-umber mt-0.5">
                                        {activeUserDetailModal.base.companyName && (
                                            <strong className="text-brass-700 mr-2">{activeUserDetailModal.base.companyName}</strong>
                                        )}
                                        User ID: <span className="font-mono text-slate-500">{activeUserDetailModal.base._id}</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveUserDetailModal(null)}
                                className="w-8 h-8 rounded-full bg-linen hover:bg-parchment flex items-center justify-center text-ink transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {userDetailLoading ? (
                            <div className="py-16 text-center">
                                <div className="w-8 h-8 border-2 border-parchment border-t-sindoor-700 rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-umber">Fetching profile details, orders, and catalog...</p>
                            </div>
                        ) : (
                            <div className="space-y-5 text-xs">
                                {/* Contact & Location Strip */}
                                <div className="grid sm:grid-cols-3 gap-3 bg-linen/50 p-3.5 rounded-xl border border-parchment">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-umber block">Phone Number</span>
                                        <a
                                            href={`tel:${activeUserDetailModal.base.phone}`}
                                            className="font-bold text-ink hover:text-sindoor-700 mt-0.5 block font-mono text-sm"
                                        >
                                            {activeUserDetailModal.base.phone || "—"}
                                        </a>
                                        {activeUserDetailModal.base.whatsappNumber && (
                                            <a
                                                href={`https://wa.me/91${activeUserDetailModal.base.whatsappNumber.replace(/\D/g, "")}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-emerald-700 hover:underline mt-0.5 inline-flex items-center gap-1 font-semibold"
                                            >
                                                <MessageCircle size={12} /> WhatsApp Chat
                                            </a>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-umber block">Email Address</span>
                                        <p className="font-semibold text-ink mt-0.5 truncate">
                                            {activeUserDetailModal.base.email || "No email registered"}
                                        </p>
                                        <p className="text-[11px] text-umber mt-0.5">
                                            Joined {new Date(activeUserDetailModal.base.createdAt || Date.now()).toLocaleDateString("en-IN")}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-umber block">Registered Address</span>
                                        <p className="font-semibold text-ink mt-0.5">
                                            {activeUserDetailModal.base.address || activeUserDetailModal.base.city || "—"}
                                        </p>
                                        {activeUserDetailModal.base.pincode && (
                                            <p className="text-[11px] text-umber">Pincode: {activeUserDetailModal.base.pincode}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Metrics Summary Strip */}
                                {activeUserDetailModal.detail?.stats && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {activeUserDetailModal.type === "owner" ? (
                                            <>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Bangles Listed</span>
                                                    <span className="text-lg font-bold text-ink">
                                                        {activeUserDetailModal.detail.stats.totalProducts || 0}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Orders Received</span>
                                                    <span className="text-lg font-bold text-ink">
                                                        {activeUserDetailModal.detail.stats.totalOrders || 0}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Shop Revenue</span>
                                                    <span className="text-lg font-bold text-emerald-700">
                                                        ₹{(activeUserDetailModal.detail.stats.totalRevenue || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Khata Balance</span>
                                                    <span className="text-lg font-bold text-brass-700">
                                                        ₹{(activeUserDetailModal.detail.stats.totalOutstanding || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Total Orders</span>
                                                    <span className="text-lg font-bold text-ink">
                                                        {activeUserDetailModal.detail.stats.totalOrders || 0}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Total Spent</span>
                                                    <span className="text-lg font-bold text-emerald-700">
                                                        ₹{(activeUserDetailModal.detail.stats.totalSpent || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Khata Debt</span>
                                                    <span className="text-lg font-bold text-amber-700">
                                                        ₹{(activeUserDetailModal.detail.stats.totalOutstanding || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white border border-parchment rounded-xl text-center">
                                                    <span className="text-[10px] text-umber uppercase block">Account Type</span>
                                                    <span className="text-xs font-bold text-ink block mt-1">
                                                        {activeUserDetailModal.base.isQuickAccount ? "Quick 1-Tap Buyer" : "Registered"}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Associated Orders History */}
                                <div className="space-y-2">
                                    <h4 className="font-serif font-bold text-ink text-sm flex items-center justify-between">
                                        <span>Order History ({activeUserDetailModal.detail?.orders?.length || 0})</span>
                                    </h4>

                                    {(!activeUserDetailModal.detail?.orders || activeUserDetailModal.detail.orders.length === 0) ? (
                                        <p className="text-umber py-4 text-center bg-linen/30 rounded-lg">
                                            No orders associated with this account.
                                        </p>
                                    ) : (
                                        <div className="border border-parchment rounded-xl overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-linen/70 text-[10px] uppercase text-umber border-b border-parchment">
                                                    <tr>
                                                        <th className="px-3 py-2">Order</th>
                                                        <th className="px-3 py-2">Items</th>
                                                        <th className="px-3 py-2">Amount</th>
                                                        <th className="px-3 py-2">Status</th>
                                                        <th className="px-3 py-2">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-parchment/60">
                                                    {activeUserDetailModal.detail.orders.map((ord) => (
                                                        <tr key={ord._id}>
                                                            <td className="px-3 py-2 font-mono font-bold text-sindoor-700">
                                                                {ord.orderCode || ord._id.slice(-6)}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {ord.items?.length || 1} item(s)
                                                            </td>
                                                            <td className="px-3 py-2 font-bold text-ink">
                                                                ₹{ord.totalAmount}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <StatusBadge status={ord.status} />
                                                            </td>
                                                            <td className="px-3 py-2 text-umber">
                                                                {new Date(ord.createdAt).toLocaleDateString("en-IN")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Shop's Published Bangles (if Artisan Shop) */}
                                {activeUserDetailModal.type === "owner" && (
                                    <div className="space-y-2">
                                        <h4 className="font-serif font-bold text-ink text-sm">
                                            Shop Catalog ({activeUserDetailModal.detail?.products?.length || 0} designs)
                                        </h4>
                                        {(!activeUserDetailModal.detail?.products || activeUserDetailModal.detail.products.length === 0) ? (
                                            <p className="text-umber py-4 text-center bg-linen/30 rounded-lg">
                                                This artisan has not published any bangles yet.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {activeUserDetailModal.detail.products.map((p) => (
                                                    <div key={p._id} className="p-2 border border-parchment rounded-lg bg-white flex flex-col justify-between">
                                                        <img
                                                            src={resolveAssetUrl(p.image || p.images?.[0]) || "/images/products/gold-kada.svg"}
                                                            alt=""
                                                            className="w-full aspect-square object-cover rounded bg-linen mb-1.5"
                                                        />
                                                        <p className="font-semibold text-ink truncate text-[11px]">{p.name}</p>
                                                        <div className="flex items-center justify-between text-[11px] mt-1">
                                                            <span className="font-bold text-sindoor-700">₹{p.price}</span>
                                                            <span className="text-umber">{p.stock} in stock</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Admin Action Buttons inside User Modal */}
                                <div className="border-t border-parchment pt-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {activeUserDetailModal.base.role === "owner" && !activeUserDetailModal.base.isApproved && (
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(activeUserDetailModal.base._id)}
                                                className="btn-primary !py-2 !px-4 text-xs font-bold inline-flex items-center gap-1.5"
                                            >
                                                <Check size={14} /> Approve This Shop
                                            </button>
                                        )}
                                        {activeUserDetailModal.base.role === "owner" && activeUserDetailModal.base.isApproved && (
                                            <button
                                                type="button"
                                                onClick={() => handleReject(activeUserDetailModal.base._id)}
                                                className="btn-secondary !py-2 !px-4 text-xs font-bold"
                                            >
                                                Revoke Shop Approval
                                            </button>
                                        )}
                                        {activeUserDetailModal.base.role !== "admin" && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(activeUserDetailModal.base._id)}
                                                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 text-xs border border-red-200"
                                            >
                                                Delete User Account
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActiveUserDetailModal(null)}
                                        className="btn-secondary !py-2 !px-4 text-xs"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: ORDER DETAILS INSPECTOR                          */}
            {/* ========================================================= */}
            {activeOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-parchment rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-parchment pb-3">
                            <div>
                                <span className="font-mono text-xs text-sindoor-700 uppercase tracking-wider font-bold">
                                    Order Inspector
                                </span>
                                <h3 className="text-xl font-serif font-bold text-ink">
                                    Order {activeOrderModal.orderCode || `#${activeOrderModal._id.slice(-6)}`}
                                </h3>
                                <p className="text-xs text-umber mt-0.5">
                                    Placed on {new Date(activeOrderModal.createdAt).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveOrderModal(null)}
                                className="w-8 h-8 rounded-full bg-linen hover:bg-parchment flex items-center justify-center text-ink"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Customer & Address Details */}
                        <div className="grid sm:grid-cols-2 gap-3 text-xs bg-linen/50 p-3.5 rounded-xl border border-parchment">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-umber">Customer Info</span>
                                <p className="font-bold text-ink mt-1 text-sm">
                                    {activeOrderModal.customerName || activeOrderModal.user?.name || "Customer"}
                                </p>
                                <p className="text-ink font-mono mt-0.5">
                                    Phone: {activeOrderModal.customerPhone || activeOrderModal.user?.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-umber">Shipping Address</span>
                                <p className="text-ink mt-1 font-medium">
                                    {activeOrderModal.shippingAddress?.line1 || "Direct delivery"}
                                </p>
                                <p className="text-umber">
                                    {activeOrderModal.shippingAddress?.city} {activeOrderModal.shippingAddress?.pincode ? `(${activeOrderModal.shippingAddress.pincode})` : ""}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-umber">
                                Bangle Items Ordered ({activeOrderModal.items?.length || 0})
                            </span>
                            <div className="divide-y divide-parchment border border-parchment rounded-xl bg-white overflow-hidden">
                                {(activeOrderModal.items || []).map((it, idx) => (
                                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            {it.product?.image && (
                                                <img
                                                    src={resolveAssetUrl(it.product.image)}
                                                    alt=""
                                                    className="w-10 h-10 object-cover rounded border border-parchment bg-linen"
                                                />
                                            )}
                                            <div>
                                                <p className="font-bold text-ink">
                                                    {it.product?.name || "Handcrafted Bangle"}
                                                </p>
                                                <p className="text-[11px] text-umber">
                                                    Size: <strong className="text-sindoor-700">{it.size || "2.6"}</strong> • Qty: {it.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-ink tabular-nums text-sm">
                                            ₹{((it.price || it.product?.price || 0) * it.quantity).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Financial Summary & Status Control */}
                        <div className="p-4 rounded-xl bg-linen/50 border border-parchment flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div>
                                <span className="text-umber">Payment Method: </span>
                                <span className="font-bold text-ink capitalize">
                                    {activeOrderModal.paymentType} {activeOrderModal.isPaid ? "(Paid)" : "(Pending Collection)"}
                                </span>
                                <p className="text-lg font-bold text-ink tabular-nums mt-0.5">
                                    Total: ₹{Number(activeOrderModal.totalAmount || 0).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-ink font-semibold">Change Status:</label>
                                <select
                                    value={activeOrderModal.status}
                                    onChange={(e) => handleUpdateOrderStatus(activeOrderModal._id, e.target.value)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-parchment text-xs font-bold text-ink focus:outline-none focus:border-sindoor-600"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="packed">Packed</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 3: QUICK EDIT PRODUCT STOCK / PRICE                 */}
            {/* ========================================================= */}
            {productEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-parchment rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-parchment pb-3">
                            <h3 className="text-base font-serif font-bold text-ink">
                                Quick Edit Price & Stock
                            </h3>
                            <button
                                type="button"
                                onClick={() => setProductEditModal(null)}
                                className="w-8 h-8 rounded-full bg-linen hover:bg-parchment flex items-center justify-center text-ink"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-sindoor-700 font-bold">{productEditModal.name}</p>

                        <form onSubmit={handleUpdateProductStockPrice} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-umber mb-1 font-semibold">Selling Price (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={productEditModal.price}
                                    onChange={(e) =>
                                        setProductEditModal((prev) => ({ ...prev, price: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-bold text-sm focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-umber mb-1 font-semibold">Compare at Price (₹, optional MRP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={productEditModal.compareAtPrice || ""}
                                    onChange={(e) =>
                                        setProductEditModal((prev) => ({ ...prev, compareAtPrice: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink text-sm focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-umber mb-1 font-semibold">Stock Quantity (Units Available)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={productEditModal.stock}
                                    onChange={(e) =>
                                        setProductEditModal((prev) => ({ ...prev, stock: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-bold text-sm focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    required
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setProductEditModal(null)}
                                    className="btn-secondary !py-2 !px-4 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary !py-2 !px-4 text-xs"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 4: CREATE NEW PROMO COUPON                          */}
            {/* ========================================================= */}
            {couponModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-parchment rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-parchment pb-3">
                            <h3 className="text-base font-serif font-bold text-ink">Create Discount Coupon</h3>
                            <button
                                type="button"
                                onClick={() => setCouponModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-linen hover:bg-parchment flex items-center justify-center text-ink"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-umber mb-1 font-semibold">Coupon Code (Uppercase)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. FESTIVE20"
                                    value={newCoupon.code}
                                    onChange={(e) =>
                                        setNewCoupon((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-sindoor-700 font-mono font-bold text-sm focus:outline-none focus:border-sindoor-600 focus:bg-white uppercase"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Discount Type</label>
                                    <select
                                        value={newCoupon.discountType}
                                        onChange={(e) =>
                                            setNewCoupon((prev) => ({ ...prev, discountType: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-semibold text-xs focus:outline-none focus:border-sindoor-600"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Discount Value</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newCoupon.discountValue}
                                        onChange={(e) =>
                                            setNewCoupon((prev) => ({ ...prev, discountValue: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-bold text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Min Order Amount (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newCoupon.minOrderAmount}
                                        onChange={(e) =>
                                            setNewCoupon((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Max Discount Cap (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newCoupon.maxDiscount}
                                        onChange={(e) =>
                                            setNewCoupon((prev) => ({ ...prev, maxDiscount: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-umber mb-1 font-semibold">Description / Campaign</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Flat 15% discount on all Bridal Bangle Sets"
                                    value={newCoupon.description}
                                    onChange={(e) =>
                                        setNewCoupon((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCouponModalOpen(false)}
                                    className="btn-secondary !py-2 !px-4 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary !py-2 !px-4 text-xs"
                                >
                                    Publish Coupon
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 5: CREATE STOREFRONT ANNOUNCEMENT BANNER             */}
            {/* ========================================================= */}
            {announcementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-parchment rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-parchment pb-3">
                            <h3 className="text-base font-serif font-bold text-ink">Publish Store Banner</h3>
                            <button
                                type="button"
                                onClick={() => setAnnouncementModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-linen hover:bg-parchment flex items-center justify-center text-ink"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-umber mb-1 font-semibold">Banner Heading</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Wedding Season Chooda Sale"
                                    value={newAnnouncement.title}
                                    onChange={(e) =>
                                        setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-semibold text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-umber mb-1 font-semibold">Message Text</label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Free shipping on all orders above ₹999 + Instant ₹100 off with code BV100!"
                                    value={newAnnouncement.message}
                                    onChange={(e) =>
                                        setNewAnnouncement((prev) => ({ ...prev, message: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink text-xs focus:outline-none focus:border-sindoor-600 focus:bg-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Banner Style</label>
                                    <select
                                        value={newAnnouncement.type}
                                        onChange={(e) =>
                                            setNewAnnouncement((prev) => ({ ...prev, type: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-semibold text-xs focus:outline-none focus:border-sindoor-600"
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="success">Success / Offer (Green)</option>
                                        <option value="warning">Notice (Amber)</option>
                                        <option value="error">Urgent (Red)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-umber mb-1 font-semibold">Audience</label>
                                    <select
                                        value={newAnnouncement.targetAudience}
                                        onChange={(e) =>
                                            setNewAnnouncement((prev) => ({ ...prev, targetAudience: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-linen/50 border border-parchment text-ink font-semibold text-xs focus:outline-none focus:border-sindoor-600"
                                    >
                                        <option value="all">All Visitors</option>
                                        <option value="users">Customers Only</option>
                                        <option value="owners">Shop Owners Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAnnouncementModalOpen(false)}
                                    className="btn-secondary !py-2 !px-4 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary !py-2 !px-4 text-xs"
                                >
                                    Publish Banner
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
