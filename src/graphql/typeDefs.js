import gql from 'graphql-tag'

export const typeDefs = gql`
  scalar DateTime

  enum Role {
    ADMIN
    CAREWORKER
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: Role!
    createdAt: DateTime!
    updatedAt: DateTime!
    shifts: [Shift!]!
    analytics: [Analytics!]!
  }

  type Shift {
    id: ID!
    user: User!
    userId: String!
    clockInAt: DateTime!
    clockInLat: Float!
    clockInLng: Float!
    clockInNote: String
    clockOutAt: DateTime
    clockOutLat: Float
    clockOutLng: Float
    clockOutNote: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Location {
    id: ID!
    name: String
    latitude: Float!
    longitude: Float!
    radiusKm: Float!
    active: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Analytics {
    id: ID!
    user: User!
    userId: String!
    date: DateTime!
    totalHours: Float!
    shiftCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DashboardStats {
    avgHoursPerDayAll: Float!
    dailyClockInCounts: [DailyCount!]!
    weeklyHoursPerStaff: [StaffHours!]!
    dailyTotalHours: [DailyHours!]!
  }

  type DailyCount { date: String!, count: Int! }
  type StaffHours { userId: String!, hours: Float! }
  type DailyHours { date: String!, hours: Float! }

  type Query {
    me: User
    users(search: String): [User!]!
    user(id: ID!): User
    shifts(userId: ID, from: DateTime, to: DateTime): [Shift!]!
    locations(active: Boolean): [Location!]!
    analytics(userId: ID!, from: DateTime, to: DateTime): [Analytics!]!
    dashboardStats: DashboardStats!
    currentlyClockedIn: [Shift!]!
  }

  type Mutation {
    createUser(email: String!, name: String, role: Role!): User!
    deleteUser(id: ID!): Boolean!
    upsertLocation(id: ID, name: String, latitude: Float!, longitude: Float!, radiusKm: Float!, active: Boolean!): Location!
    setActiveLocation(id: ID!): Location!
    promoteUser(id: ID!, role: Role!): User!
    adminRebuildAnalytics(userId: ID, from: DateTime, to: DateTime): Boolean!

    clockIn(note: String, lat: Float!, lng: Float!, manualOverride: Boolean): Shift!
    clockOut(note: String, lat: Float!, lng: Float!, manualOverride: Boolean): Shift!
    adminClockOut(userId: ID!): Shift!
  }
`
