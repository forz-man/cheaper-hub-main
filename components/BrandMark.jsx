import Image from "next/image";

export default function BrandMark({ className = "h-9 w-auto", priority = false }) {
  return (
    <Image
      src="/cheaper-icon.png"
      alt="Cheaper"
      width={76}
      height={61}
      priority={priority}
      className={className}
      sizes="(max-width: 640px) 28px, 40px"
    />
  );
}