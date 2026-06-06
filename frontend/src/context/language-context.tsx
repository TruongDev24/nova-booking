"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import en from "../dictionaries/en.json";
import vi from "../dictionaries/vi.json";

type Locale = "vi" | "en";

type Dictionary = typeof vi;

const dictionaries: Record<Locale, Dictionary> = {
    vi: vi as Dictionary,
    en: en as unknown as Dictionary,
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("vi");

    useEffect(() => {
        // Read preference from cookie first
        const savedLocale = Cookies.get("NEXT_LOCALE") as Locale;
        if (savedLocale === "en" || savedLocale === "vi") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocaleState(savedLocale);
        } else {
            // Read from navigator language
            const browserLang = navigator.language.split("-")[0];
            const defaultLocale: Locale = browserLang === "en" ? "en" : "vi";
            setLocaleState(defaultLocale);
            Cookies.set("NEXT_LOCALE", defaultLocale, { path: "/", expires: 365 });
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        Cookies.set("NEXT_LOCALE", newLocale, { path: "/", expires: 365 });
    };

    // Helper function to resolve dot-nested keys like 'auth.login'
    const t = (key: string, variables?: Record<string, string | number>): string => {
        const dictionary = dictionaries[locale];
        const keys = key.split(".");
        
        let value: unknown = dictionary;
        for (const k of keys) {
            if (value && typeof value === "object" && k in (value as Record<string, unknown>)) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return key; // Fallback to key if not found
            }
        }

        if (typeof value !== "string") {
            return key;
        }

        // Handle string interpolation like {count}
        if (variables) {
            let interpolated = value;
            Object.entries(variables).forEach(([varKey, varValue]) => {
                interpolated = interpolated.replace(new RegExp(`{${varKey}}`, "g"), String(varValue));
            });
            return interpolated;
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
