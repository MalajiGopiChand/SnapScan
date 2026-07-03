import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAppStore } from './store'
import * as Icons from 'lucide-react'

export function EventDetailPage() {
  const { id } = useParams()
  const { getToken } = useAuth()
  const activeEvent = useAppStore(state => state.activeEvent)
  const fetchEvent = useAppStore(state => state.fetchEvent)
  const uploadPhotos = useAppStore(state => state.uploadPhotos)
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      if (id) {
        const token = await getToken()
        if (token) await fetchEvent(token, id)
      }
      
      // Load face-api models for face extraction
      import('@vladmandic/face-api').then(async (faceapi) => {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      }).catch(console.error)

      setLoading(false)
    }
    load()
  }, [id, getToken, fetchEvent])

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-stone-500">Loading event details...</div>
  }

  if (!activeEvent || activeEvent.id !== id) {
    return <div className="flex h-64 items-center justify-center text-red-500">Event not found</div>
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeEvent.guestLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const formData = new FormData()
    const files = Array.from(e.target.files)
    
    // 1. ALWAYS append files first so they upload even if AI crashes
    for (const file of files) {
      formData.append('photos', file)
    }

    const embeddingsList: string[] = []

    try {
      const faceapi = await import('@vladmandic/face-api')
      
      for (const file of files) {
        try {
          // Extract faces for each photo
          const img = new Image()
          const url = URL.createObjectURL(file)
          img.src = url
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => reject(new Error('Failed to load image for AI'))
          })
          
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors()
          URL.revokeObjectURL(url)
          
          const faces = detections.map(d => ({
            descriptor: Array.from(d.descriptor),
            box: d.detection.box,
            score: d.detection.score
          }))
          embeddingsList.push(JSON.stringify(faces))
        } catch (fileErr) {
          console.error('Face extraction skipped for file:', file.name, fileErr)
          embeddingsList.push("[]") // Push empty array so indices still match formData
        }
      }

      // Append all embeddings to formData (will match the order of photos)
      embeddingsList.forEach(emb => formData.append('embeddings', emb))

    } catch (err) {
      console.error('Face extraction module failed to load', err)
      // We will still allow upload even if AI fails completely
    }
    
    const token = await getToken()
    if (token && id) {
      await uploadPhotos(token, id, formData)
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
  }

  const API_BASE = 'http://localhost:3001'

  return (
    <div className="mx-auto max-w-6xl py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/dashboard" className="rounded-full p-2 hover:bg-stone-100 text-stone-500 transition-colors">
          <Icons.ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{activeEvent.title}</h1>
          <p className="text-sm text-stone-500">{activeEvent.eventDate} • {activeEvent.venue}, {activeEvent.city}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Event Info & QR */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4 text-stone-800">Guest Access</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border-2 border-dashed border-stone-200 p-2">
                {activeEvent.qrCodeUrl ? (
                  <img src={activeEvent.qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-50 text-stone-400">No QR</div>
                )}
              </div>
              <p className="text-center text-sm text-stone-500">
                Guests can scan this QR code to view their photos.
              </p>
              <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-200 py-2 text-sm font-medium hover:bg-stone-50 transition-colors">
                {copied ? <Icons.Check size={16} className="text-green-500" /> : <Icons.Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Guest Link'}
              </button>
            </div>
          </div>
          
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold mb-4 text-stone-800">Upload Photos</h2>
            <p className="mb-4 text-sm text-stone-500">Upload event photos here. They will be processed for face recognition automatically.</p>
            
            <input 
              type="file" 
              multiple 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleUpload}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {uploading ? (
                <><Icons.Loader2 size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><Icons.UploadCloud size={18} /> Select Photos</>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Gallery */}
        <div className="md:col-span-2 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">Photo Gallery</h2>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
              {activeEvent.photos?.length || 0} Photos
            </span>
          </div>
          
          {activeEvent.photos && activeEvent.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {activeEvent.photos.map((photo: any) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100 shadow-sm transition-all hover:shadow-md">
                  <img 
                    src={photo.thumbnailUrl?.startsWith('data:') ? photo.thumbnailUrl : `${API_BASE}${photo.thumbnailUrl}`} 
                    alt={photo.fileName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-4">
                    <p className="text-white text-sm font-medium truncate">{photo.fileName}</p>
                    <p className="text-white/80 text-xs">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-stone-200 text-stone-400">
              <Icons.Image size={32} className="opacity-50" />
              <p>No photos uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
