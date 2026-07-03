import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import * as Icons from 'lucide-react'

export function GuestPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE = 'http://localhost:3001'

  useEffect(() => {
    const loadEventAndModels = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/guest/event/${slug}`)
        if (res.ok) {
          setEvent(await res.json())
        }
        
        // Load face-api models
        import('@vladmandic/face-api').then(async (faceapi) => {
          await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
          await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (slug) loadEventAndModels()
  }, [slug])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setUploading(true)
    
    try {
      const faceapi = await import('@vladmandic/face-api')
      
      // Load image into HTMLImageElement
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.src = url
      await new Promise(resolve => img.onload = resolve)

      // Detect face
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
      URL.revokeObjectURL(url)

      if (!detection) {
        alert('Could not detect a face in your selfie. Please try again with good lighting.')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('selfie', file)
      formData.append('embedding', JSON.stringify(Array.from(detection.descriptor)))

      const res = await fetch(`${API_BASE}/api/guest/event/${slug}/search`, {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])
        setHasSearched(true)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to search')
      }
    } catch (e) {
      console.error(e)
      alert('Error connecting to server or processing face')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Icons.Loader2 className="animate-spin text-stone-400" size={32} /></div>
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 text-stone-500">
        <Icons.ImageOff size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-medium">Event not found</h2>
        <p>The link might be invalid or expired.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-6 text-center shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{event.title}</h1>
          <p className="text-sm text-stone-500 flex items-center justify-center gap-2">
            <Icons.Calendar size={14} /> {new Date(event.eventDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-stone-500 flex items-center justify-center gap-2 mt-1">
            <Icons.MapPin size={14} /> {event.venue}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!hasSearched ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-teal-100 text-teal-600 shadow-inner">
              <Icons.Camera size={40} />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-stone-800">Find your photos</h2>
            <p className="mb-8 text-stone-500">
              Take a quick selfie to instantly find all the photos you appear in from this event.
            </p>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="user" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleUpload}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-lg shadow-lg"
            >
              {uploading ? (
                <><Icons.Loader2 className="animate-spin" /> Analyzing Faces...</>
              ) : (
                <><Icons.Camera /> Take Selfie</>
              )}
            </button>
            <p className="mt-4 text-xs text-stone-400">
              Your selfie is used only for matching and is not stored permanently.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800">
                Found {matches.length} {matches.length === 1 ? 'photo' : 'photos'}
              </h2>
              <button 
                onClick={() => { setHasSearched(false); setMatches([]); }}
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Try Again
              </button>
            </div>

            {matches.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {matches.map(photo => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl bg-stone-200 shadow-sm aspect-square">
                    <img 
                      src={photo.optimizedUrl?.startsWith('data:') ? photo.optimizedUrl : `${API_BASE}${photo.optimizedUrl}`} 
                      alt="Event Match"
                      className="h-full w-full object-cover"
                    />
                    <a 
                      href={photo.originalUrl?.startsWith('data:') ? photo.originalUrl : `${API_BASE}${photo.originalUrl}`} 
                      download="matched-photo.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
                    >
                      <Icons.Download size={18} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white py-12 px-4 text-center">
                <Icons.Frown size={48} className="mb-4 text-stone-300" />
                <h3 className="mb-2 text-lg font-medium text-stone-700">No matches found</h3>
                <p className="text-stone-500">We couldn't find you in the current event photos.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
