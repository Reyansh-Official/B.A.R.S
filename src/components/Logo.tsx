import Image from "next/image";

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <Image src="/brand/mark.png" alt="" width={size} height={size} className={`shrink-0 ${className}`} priority />;
}

export function LogoFull({ width = 140, className = "" }: { width?: number; className?: string }) {
  return <Image src="/brand/logo.png" alt="B.A.R.S. · Bill Accessibility & Relief System" width={width} height={Math.round((width * 1264) / 934)} className={className} priority />;
}
