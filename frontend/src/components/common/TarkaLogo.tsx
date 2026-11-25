import React from 'react';

export interface TarkaLogoProps {
  variant?: 'full' | 'icon' | 'mark';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  width?: number | string;
  alt?: string;
  onClick?: () => void;
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
}) => {
  const isDark = theme === 'dark';
  const isIcon = variant === 'icon' || variant === 'mark';

  let src = '/tarka-logo.svg';
  if (isIcon) {
    src = isDark ? '/tarka-icon-dark.svg' : '/tarka-icon.svg';
  } else {
    src = isDark ? '/tarka-logo-dark.svg' : '/tarka-logo.svg';
  }

  const defaultHeight = isIcon ? (height || 28) : (height || 26);
  const defaultWidth = width || 'auto';

  return (
    <img
      src={src}
      alt={alt}
      width={defaultWidth}
      height={defaultHeight}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style,
      }}
      className={`select-none ${className}`}
      onClick={onClick}
      loading="eager"
      decoding="async"
    />
  );
};

export default TarkaLogo;
