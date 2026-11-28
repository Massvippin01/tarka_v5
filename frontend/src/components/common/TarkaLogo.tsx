import React from 'react';

export interface TarkaLogoProps {
  variant?: 'full' | 'icon' | 'mark' | 'wordmark';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  width?: number | string;
  alt?: string;
  onClick?: () => void;
  preferPng?: boolean;
}

export const TarkaLogo: React.FC<TarkaLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  style,
  height,
  width,
  alt = 'TARKA — Indigenous Digital Forensics Platform',
  onClick,
  preferPng = true,
}) => {
  const isDark = theme === 'dark';
  const isIcon = variant === 'icon' || variant === 'mark';
  const isWordmark = variant === 'wordmark';

  // Authoritative Brand Asset Resolution
  let primarySrc = '/brand/tarka-logo-full.png';
  let fallbackSrc = isDark ? '/tarka-logo-dark.svg' : '/tarka-logo.svg';

  if (isIcon) {
    primarySrc = isDark ? '/brand/tarka-symbol-dark.png' : '/brand/tarka-symbol.png';
    fallbackSrc = isDark ? '/tarka-icon-dark.svg' : '/tarka-icon.svg';
  } else if (isWordmark) {
    primarySrc = '/brand/tarka-wordmark.png';
    fallbackSrc = '/brand/tarka-wordmark.png';
  } else {
    primarySrc = isDark ? '/brand/tarka-logo-dark.png' : '/brand/tarka-logo-full.png';
    fallbackSrc = isDark ? '/tarka-logo-dark.svg' : '/tarka-logo.svg';
  }

  const [imgSrc, setImgSrc] = React.useState<string>(preferPng ? primarySrc : fallbackSrc);

  React.useEffect(() => {
    setImgSrc(preferPng ? primarySrc : fallbackSrc);
  }, [primarySrc, fallbackSrc, preferPng]);

  const defaultHeight = isIcon ? (height || 26) : (height || 24);
  const defaultWidth = width || 'auto';

  const handleClick = (_e?: React.SyntheticEvent) => {
    if (onClick) {
      onClick();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tarka:navigate-workspace'));
    }
  };

  return (
    <img
      src={imgSrc}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
      alt={alt}
      width={defaultWidth}
      height={defaultHeight}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style,
      }}
      className={`select-none cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150 ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      loading="eager"
      decoding="async"
    />
  );
};

export default TarkaLogo;
