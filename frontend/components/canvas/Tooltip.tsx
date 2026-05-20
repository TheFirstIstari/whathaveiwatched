'use client';
import { Label, Tag, Text } from 'react-konva';

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  subtitle: string;
}

export function Tooltip({ visible, x, y, title, subtitle }: TooltipProps) {
  if (!visible) return null;
  return (
    <Label x={x + 14} y={y + 14}>
      <Tag
        fill="#1A202C"
        opacity={0.9}
        cornerRadius={4}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
      />
      <Text
        text={`${title}${subtitle ? `\n${subtitle}` : ''}`}
        fontSize={12}
        fill="#FFF"
        padding={8}
        lineHeight={1.4}
        listening={false}
      />
    </Label>
  );
}
