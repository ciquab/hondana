'use client';

import { useState } from 'react';

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
};

const FALLBACK_SRC = '/assets/book-placeholder.svg';

export function BookCoverImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackText = 'No img',
}: Props) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className={fallbackClassName} aria-label={fallbackText}>
        {fallbackText}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        if (e.currentTarget.src.endsWith(FALLBACK_SRC)) {
          setBroken(true);
          return;
        }
        e.currentTarget.src = FALLBACK_SRC;
      }}
    />
  );
}
