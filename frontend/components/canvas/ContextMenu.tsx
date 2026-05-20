'use client';
import { Group, Rect, Text } from 'react-konva';
import { ThemeTokens } from '@/lib/theme';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
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
const MENU_W = 184;

export function ContextMenu({ visible, x, y, items, onDismiss, theme }: Props) {
  if (!visible) return null;
  return (
    <Group x={x} y={y}>
      <Rect
        width={MENU_W}
        height={items.length * ITEM_H + 8}
        fill={theme['menu.bg']}
        stroke={theme['menu.border']}
        strokeWidth={1}
        cornerRadius={10}
        shadowColor="#000000"
        shadowBlur={18}
        shadowOpacity={0.18}
        shadowOffsetY={6}
        onClick={onDismiss}
      />
      {items.map((item, i) => (
        <Group
          key={item.label}
          y={4 + i * ITEM_H}
          onClick={(e) => { e.cancelBubble = true; item.action(); onDismiss(); }}
        >
          <Rect
            x={4}
            width={MENU_W - 8}
            height={ITEM_H}
            fill="transparent"
            cornerRadius={6}
          />
          <Text
            text={item.label}
            x={12}
            y={8.5}
            fontSize={12}
            fontStyle={item.danger ? '500' : 'normal'}
            fill={item.danger ? theme.danger : theme['menu.text']}
          />
        </Group>
      ))}
    </Group>
  );
}
