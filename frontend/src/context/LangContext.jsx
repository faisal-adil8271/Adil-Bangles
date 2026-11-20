import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations } from "../i18n/translations";
import { configAPI } from "../services/api";

const defaultLang = {
    lang: "en",
    isHindi: false,
    toggleLang: () => {},
    setLanguage: () => {},
    t: (key, fallback) => translations.en?.[key] || fallback || key,
    storeConfig: {
        supportPhone: "9876543210",
        supportWhatsapp: "919876543210",
        dispatchHub: "Kolkata, West Bengal, India",
        supportEmail: "mdimran.alam1701@gmail.com",
        freeDeliveryThreshold: 999,
        standardDeliveryFee: 99,
        razorpayEnabled: false,
        razorpayKeyId: "",
    },
    refreshConfig: async () => null,
    updateStoreConfigState: () => {},
    quickOrderState: null,
    openQuickOrder: () => {},
    closeQuickOrder: () => {},
    sizeGuideOpen: false,
    openSizeGuide: () => {},
    closeSizeGuide: () => {},
};

const LangContext = createContext(defaultLang);

export function LangProvider({ children }) {
    const [storeConfig, setStoreConfig] = useState(defaultLang.storeConfig);
    const [quickOrderState, setQuickOrderState] = useState(null);
    const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.removeItem("bv_lang");
        } catch {
            // silent
        }
        configAPI
            .getPublic()
            .then(({ data }) => {
                if (data?.data) {
                    setStoreConfig((prev) => ({ ...prev, ...data.data }));
                }
            })
            .catch(() => {});
    }, []);

    const refreshConfig = useCallback(async () => {
        try {
            const { data } = await configAPI.getPublic();
            if (data?.data) {
                setStoreConfig((prev) => ({ ...prev, ...data.data }));
            }
            return data?.data;
        } catch {
            return null;
        }
    }, []);

    const updateStoreConfigState = useCallback((newConfig) => {
        setStoreConfig((prev) => ({ ...prev, ...newConfig }));
    }, []);

    const t = useCallback(
        (key, fallback) => translations.en?.[key] || fallback || key,
        []
    );

    const openQuickOrder = useCallback((product, size, quantity = 1) => {
        setQuickOrderState({
            product,
            size: size || product?.sizes?.[0] || "2.6",
            quantity,
        });
    }, []);

    const closeQuickOrder = useCallback(() => setQuickOrderState(null), []);

    return (
        <LangContext.Provider
            value={{
                lang: "en",
                isHindi: false,
                toggleLang: () => {},
                setLanguage: () => {},
                t,
                storeConfig,
                refreshConfig,
                updateStoreConfigState,
                quickOrderState,
                openQuickOrder,
                closeQuickOrder,
                sizeGuideOpen,
                openSizeGuide: () => setSizeGuideOpen(true),
                closeSizeGuide: () => setSizeGuideOpen(false),
            }}
        >
            {children}
        </LangContext.Provider>
    );
}

export const useLang = () => {
    const ctx = useContext(LangContext);
    return ctx || defaultLang;
};
