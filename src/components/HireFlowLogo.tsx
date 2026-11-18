import React from 'react';

interface HireFlowLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
}

export default function HireFlowLogo({
  className = "w-8 h-8",
  size,
  showText = false,
  textClassName = ""
}: HireFlowLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Precision Editorial Monogram Stamp */}
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full shrink-0 rounded-[18%] overflow-hidden border border-[var(--hf-ink-border)]"
        style={style}
        aria-label="AI HireFlow Logo"
      >
        {/* Solid Charcoal Ink Background */}
        <rect width="512" height="512" rx="88" ry="88" fill="#141413" />
        {/* Corner Editorial Terracotta Accent Tab */}
        <rect x="376" y="48" width="88" height="28" rx="6" fill="#B45309" />

        {/* Brand Ligature Monogram in Warm Ivory */}
        <path
          fill="#F7F4ED"
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 132,142
            C 110,142 96,156 96,178
            L 96,334
            C 96,356 110,370 132,370
            C 152,370 164,358 164,338
            L 164,288
            C 164,276 172,268 184,268
            L 204,268
            C 216,268 224,276 224,288
            L 224,370
            L 288,370
            L 288,302
            L 366,302
            C 378,302 386,294 386,281
            C 386,268 378,260 366,260
            L 288,260
            L 288,198
            L 366,198
            C 378,198 386,190 386,177
            C 386,164 378,156 366,156
            L 276,156
            C 238,156 222,180 216,206
            C 210,230 198,240 184,240
            L 164,240
            L 164,178
            C 164,156 152,142 132,142
            Z
          "
        />
      </svg>

      {showText && (
        <div className={`flex flex-col leading-tight ${textClassName}`}>
          <span className="font-serif-display font-semibold text-base tracking-tight text-[var(--hf-text)]">
            AI HireFlow
          </span>
          <span className="text-[11px] font-sans font-medium text-[var(--hf-text-secondary)]">
            Career Workspace
          </span>
        </div>
      )}
    </div>
  );
}
