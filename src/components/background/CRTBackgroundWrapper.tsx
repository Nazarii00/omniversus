"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const CRTBackground = dynamic(() => import("./CRTBackground"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-black" />,
});

type CRTBackgroundWrapperProps = {
  children?: ReactNode;
};

export default function CRTBackgroundWrapper({
  children,
}: CRTBackgroundWrapperProps) {
  return <CRTBackground>{children}</CRTBackground>;
}
