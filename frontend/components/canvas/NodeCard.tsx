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
  FILM:    '#6965DB',
  SHOW:    '#228BE6',
  SEASON:  '#9C36B5',
  ARC:     '#E64980',
  EPISODE: '#4B4740',
};

export function NodeCard({
  id, mediaType, title, subtitle, posterUrl,
  participants, watchState, x, y, theme, isOwnerOrParticipant, scale,
  onClick, onRightClick, onShowTooltip, onHideTooltip,
}: NodeCardProps) {
  const nodeRef = useRef<Konva.Group>(null);
  const { w, h } = nodeDimensions(mediaType);
  const posterH = Math.floor(h * 0.56);
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
    nodeRef.current?.to({ scaleX: 1.04, scaleY: 1.04, duration: 0.12 });
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'pointer';
    const pos = e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };
    onShowTooltip(title, subtitle, pos);
  };

  const handleMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    nodeRef.current?.to({ scaleX: 1.0, scaleY: 1.0, duration: 0.12 });
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
  const badgeSize = 20;
  const badgeX = w - badgeSize - 7;
  const badgeY = 8;
  const isWatched = watchState === 'WATCHED';
  const isPartial = watchState === 'PARTIAL';

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
      {/* Shadow beneath card */}
      <Rect
        width={w}
        height={h}
        fill="transparent"
        cornerRadius={cornerR}
        shadowColor={theme['card.shadow']}
        shadowBlur={isWatched ? 14 : 6}
        shadowOffsetY={isWatched ? 6 : 3}
        shadowOpacity={isWatched ? 0.35 : 0.20}
        listening={false}
      />

      {/* Card background */}
      <Rect
        name="card-bg"
        width={w}
        height={h}
        fill={theme['card.bg']}
        stroke={isWatched || isPartial ? watchColor : theme['card.border']}
        strokeWidth={isWatched || isPartial ? 2 : 1.2}
        cornerRadius={cornerR}
        listening={false}
      />

      {/* Poster area */}
      {poster.status === 'loaded' ? (
        <KonvaImage
          image={poster.image}
          width={w}
          height={posterH}
          y={2}
          cornerRadius={[cornerR - 1, cornerR - 1, 0, 0]}
          listening={false}
        />
      ) : (
        <Rect
          width={w}
          height={posterH}
          y={2}
          fill={theme['card.border']}
          opacity={0.10}
          cornerRadius={[cornerR - 1, cornerR - 1, 0, 0]}
          listening={false}
        />
      )}

      {/* Gradient overlay at bottom of poster for text legibility */}
      <Rect
        width={w}
        height={16}
        y={posterH - 12}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 16 }}
        fillLinearGradientColorStops={[0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.06)']}
        listening={false}
      />

      {/* Type badge (top-left on poster) */}
      {scale >= 0.4 && (
        <>
          <Rect
            x={7}
            y={8}
            width={typeLabel.length * 6 + 12}
            height={17}
            fill={theme['card.bg']}
            stroke={typeColor}
            strokeWidth={1.2}
            cornerRadius={6}
            listening={false}
            opacity={0.92}
          />
          <Text
            text={typeLabel}
            x={13}
            y={12}
            fontSize={8.5}
            fontStyle="bold"
            fill={typeColor}
            listening={false}
          />
        </>
      )}

      {/* Watched checkmark badge (top-right) */}
      {isWatched && scale >= 0.5 && (
        <>
          {/* Outer ring */}
          <Rect
            x={badgeX - 1}
            y={badgeY - 1}
            width={badgeSize + 2}
            height={badgeSize + 2}
            fill={theme['card.bg']}
            cornerRadius={(badgeSize + 2) / 2}
            listening={false}
          />
          <Rect
            x={badgeX}
            y={badgeY}
            width={badgeSize}
            height={badgeSize}
            fill={theme['chip.watched']}
            cornerRadius={badgeSize / 2}
            listening={false}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={4}
            shadowOffsetY={1}
          />
          <Text
            text="✓"
            x={badgeX + 4}
            y={badgeY + 3.5}
            fontSize={12}
            fill="#FFFFFF"
            fontStyle="bold"
            listening={false}
          />
        </>
      )}

      {/* Partial accent dot */}
      {isPartial && !isWatched && (
        <>
          <Rect
            x={badgeX - 1}
            y={badgeY - 1}
            width={badgeSize + 2}
            height={badgeSize + 2}
            fill={theme['card.bg']}
            cornerRadius={(badgeSize + 2) / 2}
            listening={false}
          />
          <Rect
            x={badgeX}
            y={badgeY}
            width={badgeSize}
            height={badgeSize}
            fill={theme['chip.partial']}
            cornerRadius={badgeSize / 2}
            listening={false}
          />
          <Text
            text="~"
            x={badgeX + 4}
            y={badgeY + 2.5}
            fontSize={13}
            fill="#FFFFFF"
            fontStyle="bold"
            listening={false}
          />
        </>
      )}

      {/* Title */}
      <Text
        text={title}
        x={8}
        y={posterH + 9}
        width={w - 16}
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
        x={8}
        y={posterH + 24}
        width={w - 16}
        fontSize={10.5}
        fill={theme['card.subtitle']}
        ellipsis
        wrap="none"
        listening={false}
      />

      {/* Watch chips */}
      {isOwnerOrParticipant && (
        <WatchChips
          participants={participants}
          x={8}
          y={h - chipDiam - 10}
          chipDiameter={chipDiam}
        />
      )}

      {/* Partial progress bar at bottom */}
      {isPartial && (
        <Rect
          width={w * 0.5}
          height={3}
          y={h - 3}
          fill={theme['chip.partial']}
          cornerRadius={[0, 0, 0, cornerR]}
          listening={false}
          opacity={0.6}
        />
      )}
    </Group>
  );
}
