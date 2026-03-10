'use client';

import { useState } from 'react';

type Props = {
  src: string | null;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  placeholderText?: string;
};

export function BookCoverImg({
  src,
  alt = '',
  className = 'h-14 w-10 flex-shrink-0 rounded object-cover',
  placeholderClassName = 'flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-400',
  placeholderText = 'No img',
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={placeholderClassName}>{placeholderText}</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
