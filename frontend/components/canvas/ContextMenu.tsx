'use client';
import { Group, Rect, Text, Line } from 'react-konva';
import Konva from 'konva';
import { ThemeTokens } from '@/lib/theme';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  dividerAfter?: boolean;
}

interface Props {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onDismiss: () => void;
  theme: ThemeTokens;
}

const ITEM_H = 30;
const MENU_W = 192;
const PAD = 4;

export function ContextMenu({ visible, x, y, items, onDismiss, theme }: Props) {
  if (!visible) return null;

  // Keep menu within viewport bounds
  const menuW = MENU_W;
  const totalH = items.length * ITEM_H + PAD * 2;
  const safeX = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - menuW - 8);
  const safeY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - totalH - 8);

  return (
    <Group x={safeX} y={safeY}>
      {/* Background */}
      <Rect
        width={MENU_W}
        height={totalH}
        fill={theme['menu.bg']}
        stroke={theme['menu.border']}
        strokeWidth={1}
        cornerRadius={10}
        shadowColor="#000000"
        shadowBlur={20}
        shadowOpacity={0.16}
        shadowOffsetY={6}
        onClick={onDismiss}
      />

      {items.map((item, i) => (
        <Group
          key={item.label}
          y={PAD + i * ITEM_H}
        >
          {/* Hover highlight rect */}
          <Rect
            x={PAD}
            width={MENU_W - PAD * 2}
            height={ITEM_H}
            fill="transparent"
            cornerRadius={6}
            onMouseEnter={(e) => {
              const rect = e.target as Konva.Rect;
              rect.fill(theme['menu.hover']);
              rect.getLayer()?.batchDraw();
            }}
            onMouseLeave={(e) => {
              const rect = e.target as Konva.Rect;
              rect.fill('transparent');
              rect.getLayer()?.batchDraw();
            }}
            onClick={(e) => { e.cancelBubble = true; item.action(); onDismiss(); }}
          />
          <Text
            text={item.label}
            x={14}
            y={8.5}
            fontSize={12}
            fontStyle={item.danger ? '600' : 'normal'}
            fill={item.danger ? theme.danger : theme['menu.text']}
            listening={false}
          />
          {/* Divider line after item if requested */}
          {item.dividerAfter && (
            <Line
              points={[PAD + 4, ITEM_H, MENU_W - PAD - 4, ITEM_H]}
              stroke={theme['menu.border']}
              strokeWidth={1}
              listening={false}
            />
          )}
        </Group>
      ))}
    </Group>
  );
}
