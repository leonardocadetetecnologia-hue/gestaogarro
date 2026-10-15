import Image from "next/image";
import { preload } from "react-dom";
import styles from "./garro-brand.module.css";

const symbolPath = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/garro-symbol-terracotta.webp`;

export function GarroMark({ size = 40, decorative = false, className = "" }: {
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  preload(symbolPath, { as: "image" });
  return (
    <span
      className={`${styles.mark} ${className}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Garro Produtora"}
      aria-hidden={decorative ? true : undefined}
      style={{ width: size, height: size, maskImage: `url("${symbolPath}")`, WebkitMaskImage: `url("${symbolPath}")` }}
    />
  );
}

export function GarroBrand({ size = 44, wordmarkWidth = 140, className = "", priority = false }: {
  size?: number;
  wordmarkWidth?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`${styles.brand} ${className}`}>
      <GarroMark size={size} decorative />
      <Image src="/images/garro-wordmark.png" alt="Garro Produtora" width={wordmarkWidth} height={Math.round(wordmarkWidth * 93 / 256)} className={styles.wordmark} priority={priority} />
    </div>
  );
}
