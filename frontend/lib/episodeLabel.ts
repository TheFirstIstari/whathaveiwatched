/**
 * Parse a compact episode label from a media-item title.
 * The MediaItem table does not store season/episode numbers, so we derive a
 * short tag from the title string when one is present.
 *
 *   "S01E03 - The One"   -> "S01E03"
 *   "s1e3 whatever"      -> "S01E03"
 *   "Ep. 7: Title"       -> "E07"
 *   "E12"                -> "E12"
 *   "Some Movie"         -> null
 */
export function episodeLabel(title: string): string | null {
  if (!title) return null;
  const seasonEp = title.match(/^S(\d+)E(\d+)/i);
  if (seasonEp) {
    return `S${seasonEp[1].padStart(2, '0')}E${seasonEp[2].padStart(2, '0')}`;
  }
  const epOnly = title.match(/^(?:E(?:p\.?)?\s*)(\d+)/i);
  if (epOnly) {
    return `E${epOnly[1].padStart(2, '0')}`;
  }
  return null;
}
