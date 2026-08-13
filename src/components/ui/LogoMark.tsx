import Image from "next/image";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 28, className = "" }: LogoMarkProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Logo Rekah"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      priority
    />
  );
}
