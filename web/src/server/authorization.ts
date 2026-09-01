export type Viewer = { id: string; role: "team" | "committee_member" | "committee_lead" };

export function canAccessProject(_viewer: Viewer, _ownerId: string): boolean {
  return _viewer.role !== "team" || _viewer.id === _ownerId;
}

export function canManageCommittee(_viewer: Viewer): boolean {
  return _viewer.role === "committee_member" || _viewer.role === "committee_lead";
}
