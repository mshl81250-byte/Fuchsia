import React from "react";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="30" cy="30" r="28" fill="#1A1A1A" stroke="#D81B60" strokeWidth="1.5"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#D81B60" strokeWidth="0.8" opacity="0.5" transform="rotate(0 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#D81B60" strokeWidth="0.8" opacity="0.5" transform="rotate(60 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#D81B60" strokeWidth="0.8" opacity="0.5" transform="rotate(120 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#F48FB1" strokeWidth="0.8" opacity="0.4" transform="rotate(180 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#F48FB1" strokeWidth="0.8" opacity="0.4" transform="rotate(240 30 30)"/>
      <ellipse cx="30" cy="18" rx="6" ry="10" fill="none" stroke="#F48FB1" strokeWidth="0.8" opacity="0.4" transform="rotate(300 30 30)"/>
      <circle cx="30" cy="30" r="4" fill="#D81B60" opacity="0.9"/>
      <text x="22" y="37" fontFamily="Playfair Display, serif" fontSize="19" fill="#D81B60" fontWeight="700">F</text>
    </svg>
  );
}
