'use client';
import { Group, Rect, Image as KonvaImage, Text } from 'react-konva';
import { useRef } from 'react';
import Konva from 'konva';
import { useKonvaImage } from '@/lib/hooks/useKonvaImage';
import { WatchChips, ChipParticipant } from './WatchChips';
import { nodeDimensions } from '@/lib/canvas/layout';
import { ThemeTokens } from '@/lib/theme';

export interface NodeCardProps {
  id: bigint;
  mediaType: string;
  title: string;
  subtitle: string;
  posterUrl: string | null;
  participants: ChipParticipant[];
  watchState: 'WATCHED' | 'PARTIAL' | 'UNWATCHED';
  x: number;
  y: number;
  theme: ThemeTokens;
  isOwnerOrParticipant: boolean;
  scale: number;
  onClick: (id: bigint) => void;
  onRightClick: (id: bigint, pos: { x: number; y: number }) => void;
  onShowTooltip: (title: string, subtitle: string, pos: { x: number; y: number }) => void;
  onHideTooltip: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  FILM:    'Film',
  SHOW:    'Show',
  SEASON:  'Season',
  ARC:     'Arc',
  EPISODE: 'Ep.',
};

const TYPE_COLORS: Record<string, string> = {
  FILM:    '#6366F1',  // indigo
  SHOW:    '#0EA5E9',  // sky
  SEASON:  '#8B5CF6',  // violet
  ARC:     '#EC4899',  // pink
  EPISODE: '#64748B',  // slate
};

export function NodeCard({
  id, mediaType, title, subtitle, posterUrl,
  participants, watchState, x, y, theme, isOwnerOrParticipant, scale,
  onClick, onRightClick, onShowTooltip, onHideTooltip,
}: NodeCardProps) {
  const nodeRef = useRef<Konva.Group>(null);
  const { w, h } = nodeDimensions(mediaType);
  const posterH = Math.floor(h * 0.55);
  const poster = useKonvaImage(posterUrl);
  const chipDiam = scale >= 0.7 ? 20 : 14;
  const cornerR = mediaType === 'SHOW' || mediaType === 'FILM' ? 14
                : mediaType === 'SEASON' || mediaType === 'ARC' ? 12 : 10;

  const watchColor = watchState === 'WATCHED' ? theme['chip.watched']
                   : watchState === 'PARTIAL' ? theme['chip.partial']
                   : theme['chip.unwatched'];

  const typeColor = TYPE_COLORS[mediaType] ?? '#94A3B8';
  const typeLabel = TYPE_LABELS[mediaType] ?? mediaType;

  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    nodeRef.current?.to({ scaleX: 1.04, scaleY: 1.04, duration: 0.08 });
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'pointer';
    const pos = e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };
    onShowTooltip(title, subtitle, pos);
  };

  const handleMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    nodeRef.current?.to({ scaleX: 1.0, scaleY: 1.0, duration: 0.08 });
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grab';
    onHideTooltip();
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onClick(id);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    const pos = e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };
    onRightClick(id, pos);
  };

  // Watched badge at top-right
  const badgeSize = 18;
  const badgeX = w - badgeSize - 6;
  const badgeY = 8;

  return (
    <Group
      ref={nodeRef}
      x={x}
      y={y}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Card background */}
      <Rect
        name="card-bg"
        width={w}
        height={h}
        fill={theme['card.bg']}
        stroke={watchState === 'WATCHED' ? theme['chip.watched'] : theme['card.border']}
        strokeWidth={watchState === 'WATCHED' ? 2 : 1}
        cornerRadius={cornerR}
        shadowColor={theme['card.shadow']}
        shadowBlur={8}
        shadowOffsetY={2}
      />

      {/* Watch state accent bar at top */}
      <Rect
        width={w}
        height={4}
        fill={watchColor}
        cornerRadius={[cornerR, cornerR, 0, 0]}
      />

      {/* Poster image */}
      {poster.status === 'loaded' ? (
        <KonvaImage
          image={poster.image}
          width={w}
          height={posterH}
          y={4}
          cornerRadius={[cornerR - 2, cornerR - 2, 0, 0]}
          listening={false}
        />
      ) : (
        <Rect
          width={w}
          height={posterH}
          y={4}
          fill={theme['card.border']}
          cornerRadius={[cornerR - 2, cornerR - 2, 0, 0]}
          listening={false}
        />
      )}

      {/* Type badge (top-left on poster) */}
      {scale >= 0.4 && (
        <>
          <Rect
            x={6}
            y={10}
            width={typeLabel.length * 6 + 10}
            height={16}
            fill={typeColor}
            opacity={0.9}
            cornerRadius={4}
            listening={false}
          />
          <Text
            text={typeLabel}
            x={11}
            y={14}
            fontSize={9}
            fontStyle="bold"
            fill="#FFFFFF"
            listening={false}
          />
        </>
      )}

      {/* Watched checkmark badge (top-right) */}
      {watchState === 'WATCHED' && scale >= 0.5 && (
        <>
          <Rect
            x={badgeX}
            y={badgeY}
            width={badgeSize}
            height={badgeSize}
            fill={theme['chip.watched']}
            cornerRadius={badgeSize / 2}
            listening={false}
          />
          <Text
            text="✓"
            x={badgeX + 3}
            y={badgeY + 3}
            fontSize={11}
            fill="#FFFFFF"
            fontStyle="bold"
            listening={false}
          />
        </>
      )}

      {/* Title */}
      <Text
        text={title}
        x={6}
        y={posterH + 10}
        width={w - 12}
        fontSize={13}
        fontStyle="bold"
        fill={theme['card.title']}
        ellipsis
        wrap="none"
        listening={false}
      />

      {/* Subtitle */}
      <Text
        text={subtitle}
        x={6}
        y={posterH + 26}
        width={w - 12}
        fontSize={11}
        fill={theme['card.subtitle']}
        ellipsis
        wrap="none"
        listening={false}
      />

      {/* Watch chips */}
      {isOwnerOrParticipant && (
        <WatchChips
          participants={participants}
          x={6}
          y={h - chipDiam - 8}
          chipDiameter={chipDiam}
        />
      )}

      {/* Partial progress bar at bottom */}
      {watchState === 'PARTIAL' && (
        <Rect
          width={w}
          height={3}
          y={h - 3}
          fill={theme['chip.partial']}
          cornerRadius={[0, 0, cornerR, cornerR]}
          listening={false}
        />
      )}
    </Group>
  );
}
