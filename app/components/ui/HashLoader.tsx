// components/ui/HashLoader.tsx
import React from "react";

interface HashLoaderProps {
  size?: number; // Size in pixels (default: 48)
  className?: string; // Extra class names (optional)
}

const HashLoader: React.FC<HashLoaderProps> = ({ size = 48, className = "" }) => {
  return (
    <div className={`flex justify-center items-center w-full h-full ${className}`}>
      <div
        className="animate-spin rounded-full border-t-2 border-b-2 border-emerald-500"
        style={{ width: size, height: size }}
      ></div>
    </div>
  );
};

export default HashLoader;
