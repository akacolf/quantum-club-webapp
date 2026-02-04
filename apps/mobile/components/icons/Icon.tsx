import React from 'react';
import { SvgXml } from 'react-native-svg';
import { iconData } from './icon-data';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 24, color = 'currentColor', style }: IconProps) {
  const icon = iconData[name];
  
  if (!icon) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  // Replace currentColor with the specified color
  const coloredPaths = icon.paths
    .replace(/currentColor/g, color)
    .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
    .replace(/fill="([^"]+)"/g, (match, p1) => {
      if (p1 === 'none') return match;
      return `fill="${color}"`;
    });

  const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}">${coloredPaths}</svg>`;

  return <SvgXml xml={svgXml} width={size} height={size} style={style} />;
}

export default Icon;
