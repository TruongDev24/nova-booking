"use client";

import React, { createContext, useContext, useState } from "react";
import { AuthFormState } from "@/components/auth/interactive-showcase";

interface AuthUIContextType {
  formState: AuthFormState;
  setFormState: (state: AuthFormState) => void;
  passwordLength: number;
  setPasswordLength: (len: number) => void;
}

const AuthUIContext = createContext<AuthUIContextType | undefined>(undefined);

export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const [formState, setFormState] = useState<AuthFormState>("idle");
  const [passwordLength, setPasswordLength] = useState<number>(0);

  return (
    <AuthUIContext.Provider
      value={{
        formState,
        setFormState,
        passwordLength,
        setPasswordLength,
      }}
    >
      {children}
    </AuthUIContext.Provider>
  );
}

export function useAuthUI() {
  const context = useContext(AuthUIContext);
  if (!context) {
    return {
      formState: "idle" as AuthFormState,
      setFormState: () => {},
      passwordLength: 0,
      setPasswordLength: () => {},
    };
  }
  return context;
}
