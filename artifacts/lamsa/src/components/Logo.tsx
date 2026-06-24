import React from "react";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="30" cy="30" r="28" fill="#0a0a0a" stroke="#C9A84C" strokeWidth="1.5"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" transform="rotate(0 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" transform="rotate(72 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" transform="rotate(144 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" transform="rotate(216 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" transform="rotate(288 30 30)"/>
      <text x="24" y="37" fontFamily="Playfair Display, serif" fontSize="20" fill="#C9A84C" fontWeight="700">L</text>
    </svg>
  );
}
