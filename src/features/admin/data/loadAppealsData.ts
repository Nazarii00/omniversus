import { ReviewStatus, UserAppealKind } from "@/generated/prisma/enums";
import { getPrisma, hasDatabaseUrl } from "@/server/db/prisma";

export type AppealsData = Awaited<ReturnType<typeof loadAppealsData>>;
export type LoadedAppealsData = NonNullable<AppealsData>;

const APPEAL_INCLUDE = {
  targetVersion: {
    include: {
      subject: true,
    },
  },
  createdSubject: true,
  createdVersion: {
    include: {
      subject: true,
    },
  },
} as const;

export function hasAppealsDatabase(): boolean {
  return hasDatabaseUrl();
}

export async function loadAppealsData() {
  const prisma = getPrisma();

  if (!prisma) return null;

  const [
    pendingInfoAppeals,
    pendingSubjectRequests,
    recentReviewedAppeals,
    pendingCount,
    acceptedCount,
    rejectedCount,
  ] = await Promise.all([
    prisma.userAppeal.findMany({
      where: {
        kind: UserAppealKind.INFO_APPEAL,
        status: ReviewStatus.REQUIRES_REVIEW,
      },
      take: 50,
      orderBy: [{ createdAt: "asc" }],
      include: APPEAL_INCLUDE,
    }),
    prisma.userAppeal.findMany({
      where: {
        kind: UserAppealKind.SUBJECT_REQUEST,
        status: ReviewStatus.REQUIRES_REVIEW,
      },
      take: 50,
      orderBy: [{ createdAt: "asc" }],
      include: APPEAL_INCLUDE,
    }),
    prisma.userAppeal.findMany({
      where: {
        status: {
          in: [ReviewStatus.ACCEPTED, ReviewStatus.REJECTED],
        },
      },
      take: 16,
      orderBy: [{ reviewedAt: "desc" }, { updatedAt: "desc" }],
      include: APPEAL_INCLUDE,
    }),
    prisma.userAppeal.count({
      where: { status: ReviewStatus.REQUIRES_REVIEW },
    }),
    prisma.userAppeal.count({
      where: { status: ReviewStatus.ACCEPTED },
    }),
    prisma.userAppeal.count({
      where: { status: ReviewStatus.REJECTED },
    }),
  ]);

  return {
    counts: {
      pending: pendingCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
    },
    pendingInfoAppeals,
    pendingSubjectRequests,
    recentReviewedAppeals,
  };
}
