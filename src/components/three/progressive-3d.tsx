"use client";

import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type MobilePolicy = "fallback" | "opt-in";

type ConnectionNavigator = Navigator & {
  connection?: { saveData?: boolean };
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useProgressive3D(mobilePolicy: MobilePolicy) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [capability, setCapability] = useState({ allowed: false, mobile: false });
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [optedIn, setOptedIn] = useState(false);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileOrCoarse = window.matchMedia("(max-width: 48rem), (pointer: coarse)");

    const updateCapability = () => {
      const saveData = (navigator as ConnectionNavigator).connection?.saveData === true;
      setCapability({
        allowed: !reducedMotion.matches && !saveData && supportsWebGL(),
        mobile: mobileOrCoarse.matches,
      });
    };

    updateCapability();
    reducedMotion.addEventListener("change", updateCapability);
    mobileOrCoarse.addEventListener("change", updateCapability);

    return () => {
      reducedMotion.removeEventListener("change", updateCapability);
      mobileOrCoarse.removeEventListener("change", updateCapability);
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const mobileEnabled = mobilePolicy === "opt-in" ? optedIn : false;
  const enabled = capability.allowed && (!capability.mobile || mobileEnabled);

  return {
    active: enabled && visible && pageVisible && !failed,
    containerRef,
    fail,
    showMobileOptIn:
      mobilePolicy === "opt-in" && capability.allowed && capability.mobile && !optedIn && !failed,
    enableMobile: () => setOptedIn(true),
  };
}

export class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Optional 3D enhancement failed; retaining the static fallback.", error, info);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
