import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint scale (brief §16): small mobile / large mobile / tablet / desktop / wide desktop.
 * Values are min-widths in dp.
 */
export const BP = {
  smallMobile: 0,
  largeMobile: 400,
  tablet: 700,
  desktop: 900,
  wideDesktop: 1280,
} as const;

export interface Breakpoint {
  width: number;
  isTablet: boolean; // >= 700
  isDesktop: boolean; // >= 900 — enough room for a persistent side rail
  isWideDesktop: boolean; // >= 1280 — enough room for multi-column detail layouts
  /** number of columns a card grid should use at this width */
  gridCols: number;
  /** content max-width so text/cards don't stretch edge-to-edge on very wide screens */
  contentMaxWidth: number;
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  const isTablet = width >= BP.tablet;
  const isDesktop = width >= BP.desktop;
  const isWideDesktop = width >= BP.wideDesktop;
  const gridCols = isWideDesktop ? 4 : isDesktop ? 3 : isTablet ? 2 : 2;
  return {
    width,
    isTablet,
    isDesktop,
    isWideDesktop,
    gridCols,
    contentMaxWidth: isWideDesktop ? 1180 : isDesktop ? 960 : 720,
  };
}
