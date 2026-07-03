import { useState } from 'react'
import * as Icons from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { useAppStore } from './store'
import { useNavigate } from 'react-router-dom'

export function CreateEventModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { getToken } = useAuth()
  const createEvent = useAppStore(state => state.createEvent)
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    city: '',
    state: '',
    country: '',
    eventDate: ''
  })

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const token = await getToken()
    if (token) {
      const result = await createEvent(token, formData)
      if (result.ok && result.eventId) {
        onClose()
        navigate(`/dashboard/events/${result.eventId}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <h2 className="text-lg font-semibold">Create New Event</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-stone-100 text-stone-500">
            <Icons.X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Event Title *</label>
            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-field" placeholder="e.g. Rahul & Priya Wedding" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input-field min-h-[80px]" placeholder="Optional details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Event Date *</label>
              <input required type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Venue</label>
              <input type="text" name="venue" value={formData.venue} onChange={handleChange} className="input-field" placeholder="e.g. Taj Palace" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field" placeholder="e.g. Mumbai" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className="input-field" placeholder="e.g. MH" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-2 flex justify-center py-2.5">
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  )
}
