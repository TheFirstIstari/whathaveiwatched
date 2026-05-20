'use client';
import { Group, Rect, Text } from 'react-konva';

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
}

const ITEM_H = 32;
const MENU_W = 180;

export function ContextMenu({ visible, x, y, items, onDismiss }: Props) {
  if (!visible) return null;
  return (
    <Group x={x} y={y}>
      <Rect
        width={MENU_W}
        height={items.length * ITEM_H + 8}
        fill="#1e1e2e"
        cornerRadius={8}
        shadowColor="black"
        shadowBlur={12}
        shadowOpacity={0.4}
        onClick={onDismiss}
      />
      {items.map((item, i) => (
        <Group
          key={item.label}
          y={4 + i * ITEM_H}
          onClick={(e) => { e.cancelBubble = true; item.action(); onDismiss(); }}
        >
          <Rect width={MENU_W} height={ITEM_H} fill="transparent" />
          <Text
            text={item.label}
            x={12}
            y={8}
            fontSize={13}
            fill={item.danger ? '#ef4444' : '#cdd6f4'}
          />
        </Group>
      ))}
    </Group>
  );
}
