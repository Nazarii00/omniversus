export function claimTargetId(claimId: string) {
  return `claim-${claimId.replace(/[^\w-]/g, "_")}`;
}
