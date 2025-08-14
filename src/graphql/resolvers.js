import { GraphQLDateTime } from 'graphql-scalars'
import prisma from '@/lib/prisma'
import { haversineKm } from '@/lib/geo'
import { getSession } from '@auth0/nextjs-auth0'

async function getActiveLocation() {
  return prisma.location.findFirst({ where: { active: true } })
}

function withinPerimeter(lat, lng, location) {
  if (!location) return false
  const d = haversineKm(lat, lng, location.latitude, location.longitude)
  return d <= location.radiusKm
}

async function getCurrentUser(req, res) {
  // Prefer Auth0 session (edge SDK for App Router). Fallback to testing headers if absent.
  try {
    const session = await getSession(req, res)
    if (session?.user) {
      const { sub, email, name } = session.user
      if (!sub) return null
      let user = await prisma.user.findUnique({ where: { auth0Id: sub } })
      if (!user) {
        user = await prisma.user.create({ data: { auth0Id: sub, email: email || `${sub}@example.com`, name: name || email || sub, role: 'CAREWORKER' } })
      }
      return user
    }
  } catch (e) {
    // ignore and fallback
  }
  // Fallback headers for local testing
  const role = req.headers.get('x-role') || 'CAREWORKER'
  const auth0Id = req.headers.get('x-auth0-id') || null
  const email = req.headers.get('x-email') || null
  let user = null
  if (auth0Id) {
    user = await prisma.user.findUnique({ where: { auth0Id } })
    if (!user && email) {
      user = await prisma.user.create({ data: { auth0Id, email, role, name: email } })
    }
  }
  if (user) return user
  return null
}

function requireAdmin(user) {
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Admin privileges required')
  }
}

export const resolvers = {
  DateTime: GraphQLDateTime,

  Query: {
    me: async (_p, _a, { req, res }) => getCurrentUser(req, res),
    users: async (_p, { search }, { req }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      if (!search) return prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
      return prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    },
    user: async (_p, { id }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      if (!me) throw new Error('Unauthenticated')
      if (me.role !== 'ADMIN' && me.id !== id) throw new Error('Forbidden')
      return prisma.user.findUnique({ where: { id } })
    },
    shifts: async (_p, { userId, from, to }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      if (!me) throw new Error('Unauthenticated')
      const targetUserId = userId || me.id
      if (me.role !== 'ADMIN' && targetUserId !== me.id) throw new Error('Forbidden')
      return prisma.shift.findMany({
        where: {
          userId: targetUserId,
          ...(from || to
            ? {
                OR: [
                  { clockInAt: { gte: from || undefined, lte: to || undefined } },
                  { clockOutAt: { gte: from || undefined, lte: to || undefined } },
                ],
              }
            : {}),
        },
        orderBy: { clockInAt: 'desc' },
      })
    },
    locations: (_p, { active }) => prisma.location.findMany({ where: active == null ? {} : { active } }),
    analytics: async (_p, { userId, from, to }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      if (!me) throw new Error('Unauthenticated')
      const targetUserId = userId || me.id
      if (me.role !== 'ADMIN' && targetUserId !== me.id) throw new Error('Forbidden')
      return prisma.analytics.findMany({
        where: { userId: targetUserId, date: { gte: from || undefined, lte: to || undefined } },
        orderBy: { date: 'desc' },
      })
    },
    dashboardStats: async (_p, _a, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      // Avg hours/day for all staff (from Analytics)
      const analytics = await prisma.analytics.groupBy({ by: ['date'], _avg: { totalHours: true } })
      const avgHoursPerDayAll = analytics.reduce((s, a) => s + (a._avg.totalHours || 0), 0) / (analytics.length || 1)

      // Number of people clocking in daily
      const dailyRaw = await prisma.shift.groupBy({ by: ['clockInAt'], _count: { _all: true } })
      const dailyMap = {}
      dailyRaw.forEach((row) => {
        const d = new Date(row.clockInAt)
        const key = d.toISOString().slice(0, 10)
        dailyMap[key] = (dailyMap[key] || 0) + row._count._all
      })
      const dailyClockInCounts = Object.entries(dailyMap)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, count]) => ({ date, count }))

      // Total hours per staff in last week
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
      const weekRows = await prisma.analytics.groupBy({
        by: ['userId'],
        where: { date: { gte: weekAgo } },
        _sum: { totalHours: true },
      })
      const weeklyHoursPerStaff = weekRows.map((r) => ({ userId: r.userId, hours: r._sum.totalHours || 0 }))

      return { avgHoursPerDayAll, dailyClockInCounts, weeklyHoursPerStaff }
    },
    currentlyClockedIn: async (_p, _a, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      return prisma.shift.findMany({ where: { clockOutAt: null }, orderBy: { clockInAt: 'desc' } })
    },
  },

  Mutation: {
    createUser: async (_p, { auth0Id, email, name, role }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      return prisma.user.create({ data: { auth0Id, email, name, role } })
    },
    deleteUser: async (_p, { id }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      await prisma.user.delete({ where: { id } })
      return true
    },
    upsertLocation: async (_p, { id, name, latitude, longitude, radiusKm, active }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      if (id) {
        return prisma.location.update({ where: { id }, data: { name, latitude, longitude, radiusKm, active } })
      }
      return prisma.location.create({ data: { name, latitude, longitude, radiusKm, active } })
    },
    setActiveLocation: async (_p, { id }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      await prisma.location.updateMany({ data: { active: false }, where: {} })
      return prisma.location.update({ where: { id }, data: { active: true } })
    },
    promoteUser: async (_p, { id, role }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      return prisma.user.update({ where: { id }, data: { role } })
    },

    clockIn: async (_p, { note, lat, lng, manualOverride }, { req, res }) => {
      const user = await getCurrentUser(req, res)
      if (!user) throw new Error('Unauthenticated')
      const activeLoc = await getActiveLocation()
      const allowed = manualOverride ? true : withinPerimeter(lat, lng, activeLoc)
      if (!allowed) throw new Error('Outside permitted location perimeter')

      const open = await prisma.shift.findFirst({ where: { userId: user.id, clockOutAt: null } })
      if (open) throw new Error('Already clocked in')

      return prisma.shift.create({
        data: {
          userId: user.id,
          clockInAt: new Date(),
          clockInLat: lat,
          clockInLng: lng,
          clockInNote: note || null,
        },
      })
    },

    clockOut: async (_p, { note, lat, lng, manualOverride }, { req, res }) => {
      const user = await getCurrentUser(req, res)
      if (!user) throw new Error('Unauthenticated')
      const activeLoc = await getActiveLocation()
      const allowed = manualOverride ? true : withinPerimeter(lat, lng, activeLoc)
      if (!allowed) throw new Error('Outside permitted location perimeter')

      const open = await prisma.shift.findFirst({ where: { userId: user.id, clockOutAt: null }, orderBy: { clockInAt: 'desc' } })
      if (!open) throw new Error('No active shift')

      return prisma.shift.update({
        where: { id: open.id },
        data: {
          clockOutAt: new Date(),
          clockOutLat: lat,
          clockOutLng: lng,
          clockOutNote: note || null,
        },
      })
    },

    adminClockOut: async (_p, { userId }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      const open = await prisma.shift.findFirst({ where: { userId, clockOutAt: null }, orderBy: { clockInAt: 'desc' } })
      if (!open) throw new Error('No active shift to close')
      return prisma.shift.update({ where: { id: open.id }, data: { clockOutAt: new Date() } })
    },
    adminRebuildAnalytics: async (_p, { userId, from, to }, { req, res }) => {
      const me = await getCurrentUser(req, res)
      requireAdmin(me)
      const whereShift = {
        ...(userId ? { userId } : {}),
        OR: [
          { clockInAt: { gte: from || undefined, lte: to || undefined } },
          { clockOutAt: { gte: from || undefined, lte: to || undefined } },
        ],
      }
      const shifts = await prisma.shift.findMany({ where: whereShift })

      // Aggregate hours per userId per day (UTC)
      const per = new Map() // key: `${userId}|${dateStr}` -> hours
      const toUTCDateStr = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()

      for (const s of shifts) {
        let start = new Date(s.clockInAt)
        let end = new Date(s.clockOutAt || new Date())
        if (from) start = new Date(Math.max(start, new Date(from)))
        if (to) end = new Date(Math.min(end, new Date(to)))
        if (end <= start) continue

        // Split duration by UTC days
        let cursor = new Date(start)
        while (cursor < end) {
          const dayEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
          const sliceEnd = end < dayEnd ? end : dayEnd
          const hours = (sliceEnd - cursor) / 3600000
          const key = `${s.userId}|${toUTCDateStr(cursor)}`
          per.set(key, (per.get(key) || 0) + hours)
          cursor = sliceEnd
        }
      }

      // Upsert Analytics
      for (const [key, hours] of per.entries()) {
        const [uId, dateIso] = key.split('|')
        const date = new Date(dateIso)
        await prisma.analytics.upsert({
          where: { userId_date: { userId: uId, date } },
          update: { totalHours: hours },
          create: { userId: uId, date, totalHours: hours, shiftCount: 0 },
        })
      }
      return true
    },
  },

  User: {
    shifts: (parent) => prisma.shift.findMany({ where: { userId: parent.id } }),
    analytics: (parent) => prisma.analytics.findMany({ where: { userId: parent.id } }),
  },

  Shift: {
    user: (parent) => prisma.user.findUnique({ where: { id: parent.userId } }),
  },

  Analytics: {
    user: (parent) => prisma.user.findUnique({ where: { id: parent.userId } }),
  },
}
