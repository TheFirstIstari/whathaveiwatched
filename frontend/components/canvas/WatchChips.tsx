'use client';
import { Circle, Text, Group } from 'react-konva';
import { avatarColor } from '@/lib/avatarColor';

export interface ChipParticipant {
  identityHex: string;
  displayName: string;
  watched: boolean;
}

interface Props {
  participants: ChipParticipant[];
  x: number;
  y: number;
  chipDiameter: number;
}

const MAX_CHIPS = 5;
const GAP = 4;

export function WatchChips({ participants, x, y, chipDiameter }: Props) {
  const visible  = participants.slice(0, MAX_CHIPS);
  const overflow = participants.length - MAX_CHIPS;
  const r        = chipDiameter / 2;
  const step     = chipDiameter + GAP;

  return (
    <Group x={x} y={y}>
      {visible.map((p, i) => (
        <Group key={p.identityHex} x={i * step}>
          <Circle
            radius={r}
            fill={avatarColor(p.identityHex)}
            opacity={p.watched ? 1 : 0.3}
            stroke={p.watched ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)'}
            strokeWidth={1.5}
          />
          <Text
            text={p.displayName[0]?.toUpperCase() ?? '?'}
            fontSize={Math.max(6, r * 0.9)}
            fill="white"
            x={-r * 0.3}
            y={-r * 0.55}
            listening={false}
          />
        </Group>
      ))}
      {overflow > 0 && (
        <Group x={visible.length * step}>
          <Circle radius={r} fill="#71717A" stroke="rgba(255,255,255,0.75)" strokeWidth={1.5} />
          <Text
            text={`+${overflow}`}
            fontSize={Math.max(5, r * 0.7)}
            fill="white"
            x={-r * 0.6}
            y={-r * 0.5}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}
