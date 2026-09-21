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
      {/* Precision Vector Icon matching user brand logo */}
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full shrink-0 shadow-md shadow-[#00F08B]/20 rounded-[26%] overflow-hidden"
        style={style}
        aria-label="AI HireFlow Logo"
      >
        {/* Squircle Background */}
        <rect width="512" height="512" rx="136" ry="136" fill="#00F08B" />

        {/* Brand Ligature Monogram */}
        <path
          fill="#000000"
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
        <div className={`flex flex-col leading-none ${textClassName}`}>
          <span className="font-sans font-black text-lg tracking-tight text-ink">
            AI HireFlow
          </span>
          <span className="text-[9px] font-bold text-accent uppercase tracking-wider mt-0.5 font-mono">
            Career Hub
          </span>
        </div>
      )}
    </div>
  );
}
