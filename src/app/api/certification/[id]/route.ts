import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { certifications } from '@/lib/db/schema'

// ─── PATCH /api/certification/[id] ───────────────────────────────────────────
// Platform admin only. Approve or request revision on a submitted certification.

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { action: 'approve' | 'request_revision'; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.action || !['approve', 'request_revision'].includes(body.action)) {
    return NextResponse.json(
      { error: 'action must be "approve" or "request_revision"' },
      { status: 400 }
    )
  }

  // Fetch the certification
  const [certification] = await db
    .select()
    .from(certifications)
    .where(eq(certifications.id, params.id))

  if (!certification) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  const now = new Date()

  if (body.action === 'approve') {
    const [updated] = await db
      .update(certifications)
      .set({
        status: 'approved',
        approvedAt: now,
        approvedById: user.id ?? user.email ?? 'unknown',
        approvedByEmail: user.email ?? 'unknown',
        updatedAt: now,
      })
      .where(eq(certifications.id, params.id))
      .returning()

    return NextResponse.json(updated)
  } else {
    // request_revision
    const [updated] = await db
      .update(certifications)
      .set({
        status: 'revision_requested',
        revisionNotes: body.notes ?? null,
        revisionRequestedAt: now,
        updatedAt: now,
      })
      .where(eq(certifications.id, params.id))
      .returning()

    return NextResponse.json(updated)
  }
}
