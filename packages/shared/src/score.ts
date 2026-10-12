/**
 * spec §9: where the rope marker sits, in % of the track measured from my side.
 * `lead` = my points − partner's points; the marker moves toward whoever leads.
 */
export function ropePosition(lead: number): number {
  return 50 - Math.min(40, Math.max(-40, 7 * lead));
}
