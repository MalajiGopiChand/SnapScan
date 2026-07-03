import { create } from 'zustand'

export type ClientStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'all' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type UserRole = 'SUPER_ADMIN' | 'PHOTOGRAPHER' | 'GUEST' | 'admin' | 'client'
export type PlanName = 'Monthly' | 'Quarterly' | 'Yearly'

export const demoClientEmail = 'demo@snapscan.in'
export const demoClientPassword = 'password'

export type Client = {
  id: string
  clerkUserId: string
  name: string
  email: string
  role: UserRole
  approvalStatus: ClientStatus
  status?: ClientStatus // Mock for old components
  createdAt: string
  // Mock properties to fix App.tsx compilation
  studioName?: string
  phone?: string
  city?: string
  state?: string
  plan?: PlanName
  events?: number
  photos?: number
  searches?: number
  storageGb?: number | string
  joinedAt?: string
  notes?: string
  subscriptionStatus?: string
  subscriptionType?: string
  subscriptionMethod?: string
}

export type EventType = {
  id: string
  title: string
  slug: string
  description: string
  venue: string
  city: string
  state: string
  country: string
  eventDate: string
  guestLink: string
  qrCodeUrl: string
  _count?: { photos: number }
  photos?: any[]
}

export type AdminStats = {
  totalClients: number
  pending: number
  events: number
  storageGb: string
}

type AuthUser = {
  id: string
  role: UserRole
  name: string
  email: string
  clerkUserId: string
  approvalStatus: ClientStatus
  subscriptionStatus: string
  subscriptionType: string
  subscriptionMethod: string
}

type AppState = {
  authUser: AuthUser | null 
  syncAuthUser: (token: string, email: string, name: string) => Promise<void>
  logout: () => void 
  registerClient: (token: string, data: any) => Promise<{ ok: boolean, redirectTo?: string }>
  deleteClient: () => void 
  
  clients: Client[]
  events: EventType[]
  activeEvent: EventType | null
  adminStats: AdminStats | null
  
  fetchAdminStats: (token: string) => Promise<void>
  fetchClients: (token: string) => Promise<void>
  updateClientStatus: (token: string, clientId: string, status: ClientStatus) => Promise<void>
  updateClientSubscription: (token: string, clientId: string, data: any) => Promise<void>
  
  fetchEvents: (token: string) => Promise<void>
  fetchEvent: (token: string, id: string) => Promise<void>
  createEvent: (token: string, data: any) => Promise<{ ok: boolean, eventId?: string }>
  uploadPhotos: (token: string, id: string, formData: FormData) => Promise<void>
}

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const useAppStore = create<AppState>((set, get) => ({
  authUser: null,
  syncAuthUser: async (token, email, name) => {
    try {
      const res = await fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ email, name })
      })
      if (res.ok) {
        const user = await res.json()
        set({ authUser: user })
      }
    } catch (err) {
      console.error(err)
    }
  },
  logout: () => { set({ authUser: null }) },
  registerClient: async (token, data) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        const user = await res.json()
        set({ authUser: user })
        return { ok: true, redirectTo: '/subscription' }
      }
      return { ok: false }
    } catch (err) {
      console.error(err)
      return { ok: false }
    }
  },
  deleteClient: () => {},
  
  clients: [],
  events: [],
  activeEvent: null,
  adminStats: null,

  fetchAdminStats: async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const stats = await res.json()
        set({ adminStats: stats })
      }
    } catch (err) {
      console.error(err)
    }
  },

  fetchClients: async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const clients = await res.json()
        set({ clients })
      }
    } catch (err) {
      console.error(err)
    }
  },

  updateClientStatus: async (token: string, clientId: string, status: ClientStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/clients/${clientId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        get().fetchClients(token)
      }
    } catch (err) {
      console.error(err)
    }
  },

  updateClientSubscription: async (token: string, clientId: string, data: any) => {
    try {
      const res = await fetch(`${API_URL}/admin/clients/${clientId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        get().fetchClients(token)
      }
    } catch (err) {
      console.error(err)
    }
  },

  fetchEvents: async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const events = await res.json()
        set({ events })
      }
    } catch (err) {
      console.error(err)
    }
  },

  fetchEvent: async (token: string, id: string) => {
    try {
      const res = await fetch(`${API_URL}/events/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const event = await res.json()
        set({ activeEvent: event })
      }
    } catch (err) {
      console.error(err)
    }
  },

  createEvent: async (token: string, data: any) => {
    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        const event = await res.json()
        get().fetchEvents(token)
        return { ok: true, eventId: event.id }
      }
      return { ok: false }
    } catch (err) {
      console.error(err)
      return { ok: false }
    }
  },

  uploadPhotos: async (token: string, id: string, formData: FormData) => {
    try {
      const res = await fetch(`${API_URL}/events/${id}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      if (res.ok) {
        get().fetchEvent(token, id) // Refresh event photos
      }
    } catch (err) {
      console.error(err)
    }
  }
}))
