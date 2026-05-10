declare module 'next' {
  type MetadataInterface = import('next/dist/lib/metadata/types/metadata-interface');
  export type Metadata = MetadataInterface.Metadata;
  export import MetadataRoute = MetadataInterface.MetadataRoute;
  export type ResolvedMetadata = MetadataInterface.ResolvedMetadata;
  export type NextConfig = import('next/dist/server/config-shared').NextConfig;
}

declare module 'next/navigation' {
  export * from 'next/dist/client/components/navigation';
}

declare module 'next/headers' {
  export function cookies(): any;
  export function headers(): any;
}

declare module 'next/link' {
  import { ComponentType, AnchorHTMLAttributes, ReactNode } from 'react';
  export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string | object;
    as?: string | object;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean | null;
    locale?: string | false;
    legacyBehavior?: boolean;
    onMouseEnter?: (e: any) => void;
    onTouchStart?: (e: any) => void;
    onClick?: (e: any) => void;
  }
  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module 'next/image' {
  import { ComponentType, ImgHTMLAttributes } from 'react';
  export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading' | 'ref'> {
    src: string | object;
    width?: number | `${number}`;
    height?: number | `${number}`;
    fill?: boolean;
    loader?: (p: any) => string;
    quality?: number | `${number}`;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty' | `data:image/${string}`;
    blurDataURL?: string;
    unoptimized?: boolean;
    onLoadingComplete?: (img: HTMLImageElement) => void;
    layout?: string;
    objectFit?: string;
    objectPosition?: string;
    lazyBoundary?: string;
    lazyRoot?: string;
  }
  const Image: ComponentType<ImageProps>;
  export default Image;
}

declare module 'next/types.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}
