'use client';
import { Label, Tag, Text } from 'react-konva';
import { ThemeTokens } from '@/lib/theme';

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  theme: ThemeTokens;
}

export function Tooltip({ visible, x, y, title, subtitle, theme }: TooltipProps) {
  if (!visible) return null;
  return (
    <Label x={x + 14} y={y + 14}>
      <Tag
        fill={theme['menu.bg']}
        stroke={theme['menu.border']}
        strokeWidth={1}
        cornerRadius={8}
        shadowColor="#000000"
        shadowBlur={12}
        shadowOpacity={0.16}
        shadowOffsetY={4}
      />
      <Text
        text={`${title}${subtitle ? `\n${subtitle}` : ''}`}
        fontSize={12}
        fill={theme['menu.text']}
        padding={9}
        lineHeight={1.35}
        listening={false}
      />
    </Label>
  );
}
