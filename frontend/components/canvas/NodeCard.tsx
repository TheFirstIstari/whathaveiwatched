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
        stroke={theme['card.border']}
        strokeWidth={1}
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

      {/* Partial striped overlay */}
      {watchState === 'PARTIAL' && (
        <Rect
          width={w}
          height={4}
          y={h - 4}
          fill={theme['chip.partial']}
          opacity={0.4}
          cornerRadius={[0, 0, cornerR, cornerR]}
          listening={false}
        />
      )}
    </Group>
  );
}
