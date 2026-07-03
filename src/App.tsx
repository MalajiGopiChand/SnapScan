import { useState, useEffect } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import heroImage from './assets/snapscan-hero.png'
import { useAppStore } from './store'
import type { Client, ClientStatus, PlanName } from './store'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser, SignIn } from '@clerk/clerk-react'
import { CreateEventModal } from './CreateEventModal'
import { EventDetailPage } from './EventDetailPage'
import { GuestPage } from './GuestPage'

const fadeIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: 'easeOut' },
}

const publicNav = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/subscription', label: 'Subscription' },
  { to: '/contact', label: 'Contact' },
]

const statusStyles: Record<ClientStatus, string> = {
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  SUSPENDED: 'border-stone-300 bg-stone-100 text-stone-700',
  all: '',
  approved: '',
  pending: '',
  rejected: '',
  suspended: ''
}

function App() {
  const location = useLocation()
  const { user } = useUser()
  const { getToken } = useAuth()
  const syncAuthUser = useAppStore(state => state.syncAuthUser)

  useEffect(() => {
    const init = async () => {
      if (user) {
        const token = await getToken()
        if (token) {
          const email = user.primaryEmailAddress?.emailAddress || ''
          const name = user.fullName || ''
          syncAuthUser(token, email, name)
        }
      }
    }
    init()
  }, [user, getToken, syncAuthUser])

  return (
    <Routes location={location}>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/guest/:slug" element={<GuestPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/events/:id"
        element={
          <ProtectedRoute role="client">
            <EventDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute role="admin">
            <AdminClientsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function ProtectedRoute({ children, role }: { children: ReactNode; role: 'admin' | 'client' }) {
  const { isLoaded, isSignedIn } = useAuth()
  const [syncError, setSyncError] = useState<string | null>(null)
  const authUser = useAppStore((state) => state.authUser)

  useEffect(() => {
    if (isSignedIn && !authUser) {
      const timeout = setTimeout(() => {
        setSyncError("Backend is not responding. Please ensure 'node server.js' is running on port 3001.")
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [isSignedIn, authUser])

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center text-sm text-stone-500">Loading auth...</div>
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  if (!authUser) {
    if (syncError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
          <div className="text-red-500 font-semibold">{syncError}</div>
          <p className="text-sm text-stone-500">
            Check your terminal where the backend is running. If it crashed, restart it with `node server.js`.
          </p>
        </div>
      )
    }
    return <div className="flex h-screen items-center justify-center text-sm text-stone-500">Syncing workspace...</div>
  }

  const isSuperAdmin = authUser.role === 'SUPER_ADMIN' || authUser.role === 'admin'
  const isClient = authUser.role === 'PHOTOGRAPHER' || authUser.role === 'client'

  if (role === 'admin' && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  if (role === 'client' && !isClient) {
    return <Navigate to="/admin" replace />
  }
  
  if (role === 'client' && authUser.subscriptionStatus !== 'ACTIVE' && authUser.approvalStatus !== 'APPROVED') {
    return <Navigate to="/subscription" replace />
  }

  return <>{children}</>
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#f8f7f3] text-stone-950">
      <PublicHeader />
      <main>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  )
}

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="initial" animate="animate" exit={{ opacity: 0 }} variants={fadeIn}>
      {children}
    </motion.div>
  )
}

function PublicHeader() {
  const authUser = useAppStore((state) => state.authUser)
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/92 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
            <Icons.ScanFace size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-normal">Snap Scan</span>
            <span className="block text-xs font-medium uppercase tracking-normal text-stone-500">
              AI event photos
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-stone-100 text-teal-800' : 'text-stone-600 hover:text-stone-950'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <SignedIn>
            <Link
              className="btn-secondary"
              to={authUser?.role === 'admin' ? '/admin' : '/dashboard'}
            >
              <Icons.LayoutDashboard size={17} aria-hidden="true" />
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-secondary">
                <Icons.LockKeyhole size={17} aria-hidden="true" />
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary">
                <Icons.UserPlus size={17} aria-hidden="true" />
                Start free
              </button>
            </SignUpButton>
          </SignedOut>
        </div>

        <button
          className="icon-button md:hidden"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open menu"
        >
          {open ? <Icons.X size={20} aria-hidden="true" /> : <Icons.Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-stone-200 bg-white px-4 py-3 md:hidden">
          <nav className="grid gap-2">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-stone-100 text-teal-800' : 'text-stone-650'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link className="btn-primary mt-2 justify-center" to="/login" onClick={() => setOpen(false)}>
              <Icons.LockKeyhole size={17} aria-hidden="true" />
              Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

function HomePage() {
  const workSteps: { title: string; text: string; Icon: LucideIcon }[] = [
    {
      title: 'Upload',
      text: 'Photographer creates an event and uploads folders of images.',
      Icon: Icons.UploadCloud,
    },
    {
      title: 'Process',
      text: 'Images are resized, thumbnailed, and scanned for faces.',
      Icon: Icons.Cpu,
    },
    {
      title: 'Share',
      text: 'Snap Scan creates a guest link and downloadable QR code.',
      Icon: Icons.QrCode,
    },
    {
      title: 'Match',
      text: 'Guests upload a selfie and receive only matched photos.',
      Icon: Icons.BadgeCheck,
    },
  ]

  const platformItems: { title: string; text: string; Icon: LucideIcon }[] = [
    {
      title: 'Private albums',
      text: 'Guests never browse the full event unless the client enables it.',
      Icon: Icons.ShieldCheck,
    },
    {
      title: 'Fast uploads',
      text: 'Batch upload, retry states, previews, and processing status.',
      Icon: Icons.UploadCloud,
    },
    {
      title: 'Photo delivery',
      text: 'Matched gallery with favorite, share, and download actions.',
      Icon: Icons.Download,
    },
    {
      title: 'Admin control',
      text: 'Approve, reject, suspend, and review every photographer account.',
      Icon: Icons.FileCheck,
    },
  ]

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
              <Icons.Sparkles size={16} aria-hidden="true" />
              AI face search for every event guest
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-stone-950 sm:text-5xl lg:text-6xl">
              Snap Scan
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-650">
              Photographers upload event photos, Snap Scan indexes every face, and guests use a QR
              link to find only their own images with a selfie.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary justify-center" to="/register">
                <Icons.Camera size={18} aria-hidden="true" />
                Create client account
              </Link>
              <Link className="btn-secondary justify-center" to="/subscription">
                <Icons.CreditCard size={18} aria-hidden="true" />
                View subscriptions
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-xl">
            <img
              src={heroImage}
              alt="Snap Scan event gallery with QR based guest photo search"
              className="h-full min-h-[330px] w-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
              <HeroMetric icon={<Icons.Images size={18} />} label="Photos" value="100k+" />
              <HeroMetric icon={<Icons.QrCode size={18} />} label="Guest QR" value="Instant" />
              <HeroMetric icon={<Icons.ScanFace size={18} />} label="Match" value="Selfie" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-[#f4fbf8]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="From upload to guest delivery in four clean steps"
            text="No manual tagging. No full gallery exposure. Every guest sees the photos matched to their face."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workSteps.map(({ title, text, Icon }, index) => (
              <article key={title} className="feature-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-teal-800 shadow-sm">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <span className="mt-5 block text-sm font-semibold text-coral-700">0{index + 1}</span>
                <h3 className="mt-2 text-xl font-semibold tracking-normal">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-650">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <SectionHeading
            eyebrow="Built for event scale"
            title="A smart platform for weddings, colleges, corporate events, and festivals"
            text="Client dashboards, admin approvals, QR sharing, AI matching, storage insights, and secure guest delivery are arranged as one practical workflow."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {platformItems.map(({ title, text, Icon }) => (
              <article className="feature-card" key={title}>
                <Icon className="text-teal-800" size={22} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold tracking-normal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-650">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/86 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-teal-800">{icon}</div>
      <p className="mt-2 text-xs font-medium uppercase tracking-normal text-stone-500">{label}</p>
      <p className="text-base font-semibold text-stone-950">{value}</p>
    </div>
  )
}

function AboutPage() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading
            eyebrow="About Snap Scan"
            title="Professional AI event photo sharing for photographers"
            text="Snap Scan is designed for high-volume events where every guest wants fast access to their own memories without scrolling through thousands of unrelated images."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Face-first search', 'Each detected face gets its own embedding, so one group photo can match multiple guests correctly.'],
              ['Photographer control', 'Clients manage events, uploads, downloads, privacy, QR links, and analytics from one dashboard.'],
              ['Admin review', 'The super admin approves client accounts before photographers can publish live guest experiences.'],
              ['Free-stack friendly', 'The architecture is ready for React, Node, Prisma, Neon, Cloudinary, InsightFace, and Render/Vercel.'],
            ].map(([title, text]) => (
              <article className="feature-card" key={title}>
                <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-650">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-3">
          <MiniStat label="Face embeddings" value="Separate per face" />
          <MiniStat label="Guest privacy" value="Matched photos only" />
          <MiniStat label="Admin flow" value="Approval required" />
        </div>
      </div>
    </section>
  )
}

function SubscriptionPage() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Subscription"
          title="Simple pricing for Snap Scan clients"
          text="Choose a plan for instant dashboard access! If you prefer a manual setup without paying, admin approval is required."
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <PricingCard
            icon={<Icons.CalendarDays size={22} aria-hidden="true" />}
            name="Monthly"
            amount={3000}
            original="₹3,000 / month"
            price="₹3,000 / month"
            badge="Standard"
            description="Best for trial runs, seasonal photographers, and smaller event teams."
            features={['Unlimited events in demo UI', 'QR guest links', 'Client dashboard', 'Instant dashboard access']}
          />
          <PricingCard
            icon={<Icons.Clock3 size={22} aria-hidden="true" />}
            name="Quarterly"
            amount={7500}
            original="₹9,000 / 3 months"
            price="₹7,500 / 3 months"
            badge="Save 15%"
            description="Great for photographers entering peak season needing reliable short-term access."
            features={['Save ₹1,500 total', 'Priority support access', 'Custom event branding', 'Instant dashboard access']}
          />
          <PricingCard
            icon={<Icons.BadgePercent size={22} aria-hidden="true" />}
            name="Yearly"
            amount={15000}
            original="₹30,000 / year"
            price="₹15,000 / year"
            badge="50% off"
            description="Best value for studios that manage weddings and recurring large events."
            features={['Save ₹15,000 yearly', 'Priority onboarding', 'Storage and search analytics', 'Instant dashboard access']}
            highlighted
          />
        </div>
      </div>
    </section>
  )
}

function PricingCard({ icon, name, amount, original, price, badge, description, features, highlighted = false }: any) {
  const { user } = useUser()
  const { userId, getToken } = useAuth()
  const navigate = useNavigate()
  const syncAuthUser = useAppStore(state => state.syncAuthUser)
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!userId) {
      navigate('/register')
      return
    }

    setLoading(true)
    const loadRazorpay = () => new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })

    const res = await loadRazorpay()
    if (!res) {
      alert("Failed to load Razorpay SDK. Check your connection.")
      setLoading(false)
      return
    }

    try {
      const token = await getToken()
      const orderRes = await fetch('http://localhost:3001/api/billing/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      })
      const order = await orderRes.json()

      if (order.error) throw new Error(order.error)

      const options = {
        key: 'rzp_test_yourkeyhere', // In prod, inject via env
        amount: order.amount,
        currency: order.currency,
        name: "Snap Scan",
        description: `Subscription - ${name}`,
        order_id: order.id,
        handler: async function (response: any) {
          const token = await getToken()
          const verifyRes = await fetch('http://localhost:3001/api/billing/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(response)
          })
          const verify = await verifyRes.json()
          if (verify.success) {
            await syncAuthUser(token!, user?.primaryEmailAddress?.emailAddress || '', user?.fullName || '')
            navigate('/dashboard')
          } else {
            alert('Payment verification failed!')
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: { color: "#115e59" }
      }
      
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.error(err)
      alert("Error creating order: " + err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <article
      className={`rounded-lg border p-6 shadow-sm ${
        highlighted ? 'border-teal-200 bg-[#eefbf7]' : 'border-stone-200 bg-[#fbfaf7]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-teal-800 shadow-sm">
          {icon}
        </div>
        <span className="rounded-lg border border-coral-200 bg-coral-50 px-3 py-1 text-sm font-semibold text-coral-700">
          {badge}
        </span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-normal">{name}</h2>
      <p className="mt-2 text-stone-650">{description}</p>
      <div className="mt-6">
        <p className="text-sm font-medium text-stone-500 line-through">{original}</p>
        <p className="mt-1 text-4xl font-semibold tracking-normal text-stone-950">{price}</p>
      </div>
      <ul className="mt-6 grid gap-3">
        {features.map((feature: string) => (
          <li className="flex items-center gap-3 text-sm text-stone-700" key={feature}>
            <Icons.CheckCircle2 size={18} className="text-emerald-600" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      {userId ? (
        <button className="btn-primary mt-6 w-full justify-center" onClick={handleCheckout} disabled={loading}>
          <Icons.CreditCard size={17} aria-hidden="true" />
          {loading ? 'Loading...' : `Subscribe to ${name}`}
        </button>
      ) : (
        <Link className="btn-primary mt-6 w-full justify-center" to="/register">
          <Icons.UserPlus size={17} aria-hidden="true" />
          Choose {name}
        </Link>
      )}
    </article>
  )
}

function ContactPage() {
  const [sent, setSent] = useState(false)

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <SectionHeading
            eyebrow="Contact"
            title="Talk to Snap Scan"
            text="Send your studio details, event volume, and preferred plan. The admin team can review your client account and approve access."
          />
          <div className="mt-8 grid gap-3">
            <ContactLine icon={<Icons.Mail size={18} />} label="Email" value="thegopichand@gmail.com" />
            <ContactLine icon={<Icons.MapPin size={18} />} label="Service" value="India and global online events" />
            <ContactLine icon={<Icons.Clock3 size={18} />} label="Response" value="Within one business day" />
          </div>
        </div>

        <form
          className="rounded-lg border border-stone-200 bg-[#fbfaf7] p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            setSent(true)
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" placeholder="Your name" required />
            <Field label="Studio" name="studio" placeholder="Studio name" required />
            <Field label="Email" name="email" placeholder="you@example.com" required type="email" />
            <Field label="Phone" name="phone" placeholder="+91 ..." required />
          </div>
          <label className="mt-4 block">
            <span className="field-label">Message</span>
            <textarea
              className="field-input min-h-32 resize-y"
              placeholder="Tell us about your events and photo volume"
              required
            />
          </label>
          <button className="btn-primary mt-5 w-full justify-center" type="submit">
            <Icons.Send size={17} aria-hidden="true" />
            Send message
          </button>
          {sent ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              Message captured in this demo. Connect a backend email service for production.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  )
}

function LoginPage() {
  return (
    <section className="bg-white">
      <div className="flex h-screen items-center justify-center">
        <SignIn routing="path" path="/login" />
      </div>
    </section>
  )
}

function RegisterPage() {
  const { userId, getToken } = useAuth()
  const registerClient = useAppStore((state) => state.registerClient)
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanName>('Yearly')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userId) {
      setMessage("Please Sign In via Clerk (top right) before submitting this form.")
      return
    }
    const formData = new FormData(event.currentTarget)
    const token = await getToken()
    const result = await registerClient(token!, {
      name: String(formData.get('name') ?? ''),
      studioName: String(formData.get('studio') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      city: String(formData.get('city') ?? ''),
      state: String(formData.get('state') ?? ''),
      plan,
    })

    if (result.ok && result.redirectTo) {
      setMessage("Success! Redirecting...")
      window.setTimeout(() => navigate(result.redirectTo ?? '/subscription'), 900)
    } else {
      setMessage("Error submitting registration. Please try again.")
    }
  }

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <SectionHeading
          eyebrow="Client registration"
          title="Create a photographer account"
          text="Register your studio below. Once registered, you can subscribe for instant dashboard access, or wait for manual admin approval."
        />

        <form className="rounded-lg border border-stone-200 bg-[#fbfaf7] p-5 shadow-sm" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" placeholder="Client name" required />
            <Field label="Studio name" name="studio" placeholder="Photography studio" required />
            <Field label="Phone" name="phone" placeholder="+91 ..." required />
            <Field label="City" name="city" placeholder="City" required />
            <Field label="State" name="state" placeholder="State" required />
            <label className="block">
              <span className="field-label">Plan</span>
              <select
                className="field-input"
                value={plan}
                onChange={(event) => setPlan(event.target.value as PlanName)}
              >
                <option value="Yearly">Yearly - ₹15,000</option>
                <option value="Quarterly">Quarterly - ₹7,500</option>
                <option value="Monthly">Monthly - ₹3,000</option>
              </select>
            </label>
          </div>
          <button className="btn-primary mt-5 w-full justify-center" type="submit">
            <Icons.FileCheck size={17} aria-hidden="true" />
            Submit Registration
          </button>
          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  )
}

function ClientDashboard() {
  const { userId, getToken } = useAuth()
  const authUser = useAppStore((state) => state.authUser)
  const events = useAppStore((state) => state.events)
  const fetchEvents = useAppStore((state) => state.fetchEvents)
  const logout = useAppStore((state) => state.logout)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  useEffect(() => {
    const load = async () => {
      if (userId) {
        const token = await getToken()
        if (token) fetchEvents(token)
      }
    }
    load()
  }, [userId, getToken, fetchEvents])

  const client: any = authUser || { studioName: 'Studio', events: events.length, photos: 0, searches: 0, storageGb: '0' }

  return (
    <DashboardShell
      title="Client Dashboard"
      subtitle={`${client.studio} account overview`}
      nav={[
        { label: 'Dashboard', to: '/dashboard', icon: <Icons.LayoutDashboard size={17} /> },
        { label: 'Events', to: '/dashboard', icon: <Icons.CalendarDays size={17} /> },
        { label: 'Uploads', to: '/dashboard', icon: <Icons.UploadCloud size={17} /> },
      ]}
      actions={
        <button className="btn-secondary" type="button" onClick={logout}>
          <Icons.LogOut size={17} aria-hidden="true" />
          Logout
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<Icons.CalendarDays size={21} />} label="Events" value={client.events} tone="teal" />
        <MetricCard icon={<Icons.Images size={21} />} label="Photos" value={formatNumber(client.photos || 0)} tone="coral" />
        <MetricCard icon={<Icons.Search size={21} />} label="Guest searches" value={formatNumber(client.searches)} tone="green" />
        <MetricCard icon={<Icons.Database size={21} />} label="Storage" value={`${client.storageGb} GB`} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="dashboard-panel">
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Event workspace</h2>
              <p className="mt-1 text-sm text-stone-650">Create an event, upload images, and share the QR with guests.</p>
            </div>
            <button className="btn-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>
              <Icons.Plus size={17} aria-hidden="true" />
              Create event
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {events.length > 0 ? events.map((event) => (
              <Link to={`/dashboard/events/${event.id}`} key={event.id} className="block transition-transform hover:scale-[1.01]">
                <article className="rounded-lg border border-stone-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold tracking-normal text-stone-900 group-hover:text-amber-700">{event.title}</h3>
                      <p className="mt-1 text-sm text-stone-650">
                        {event.venue} • {event.city} • {event.eventDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 rounded-lg border border-teal-100 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                        <Icons.Image size={14} /> {event._count?.photos || 0}
                      </span>
                      <Icons.ChevronRight size={18} className="text-stone-400" />
                    </div>
                  </div>
                </article>
              </Link>
            )) : (
              <div className="rounded-lg border border-stone-200 p-8 text-center text-stone-500">
                No events yet. Create one to get started!
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="text-xl font-semibold tracking-normal">Upload and AI status</h2>
          <div className="mt-5 grid gap-4">
            <ProgressItem icon={<Icons.UploadCloud size={18} />} label="Photo upload" value={72} color="bg-teal-700" />
            <ProgressItem icon={<Icons.ScanFace size={18} />} label="Face detection" value={64} color="bg-coral-600" />
            <ProgressItem icon={<Icons.QrCode size={18} />} label="QR generated" value={100} color="bg-emerald-600" />
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Icons.ShieldCheck className="mt-1 text-amber-700" size={20} aria-hidden="true" />
              <div>
                <h3 className="font-semibold tracking-normal text-amber-900">Guest privacy active</h3>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Guests receive only matched photos from selfie search, not the full gallery.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <CreateEventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </DashboardShell>
  )
}

function AdminOverview() {
  const { userId, getToken } = useAuth()
  const clients = useAppStore((state) => state.clients)
  const adminStats = useAppStore((state) => state.adminStats)
  const fetchAdminStats = useAppStore((state) => state.fetchAdminStats)
  const fetchClients = useAppStore((state) => state.fetchClients)
  const updateClientStatus = useAppStore((state) => state.updateClientStatus)

  useEffect(() => {
    const load = async () => {
      if (userId) {
        const token = await getToken()
        if (token) {
          fetchAdminStats(token)
          fetchClients(token)
        }
      }
    }
    load()
  }, [userId, getToken, fetchAdminStats, fetchClients])

  const stats = adminStats || { totalClients: 0, pending: 0, events: 0, storageGb: '0' }

  return (
    <AdminShell title="Admin Dashboard" subtitle="Super admin overview for Snap Scan">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<Icons.Users size={21} />} label="Total clients" value={stats.totalClients} tone="teal" />
        <MetricCard icon={<Icons.Clock3 size={21} />} label="Pending approvals" value={stats.pending} tone="amber" />
        <MetricCard icon={<Icons.CalendarDays size={21} />} label="Events" value={stats.events} tone="coral" />
        <MetricCard icon={<Icons.Database size={21} />} label="Storage" value={`${stats.storageGb} GB`} tone="green" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="dashboard-panel">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Pending client approvals</h2>
              <p className="mt-1 text-sm text-stone-650">Approve or reject new photographers before they can log in.</p>
            </div>
            <Link className="btn-secondary" to="/admin/clients">
              <Icons.Eye size={17} aria-hidden="true" />
              View all
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            {clients.filter((client) => client.status === 'pending').length ? (
              clients
                .filter((client) => client.status === 'pending')
                .slice(0, 3)
                .map((client) => (
                  <ClientApprovalRow
                    key={client.id}
                    client={client}
                    onApprove={async () => updateClientStatus((await getToken())!, client.id, 'APPROVED' as any)}
                    onReject={async () => updateClientStatus((await getToken())!, client.id, 'REJECTED' as any)}
                  />
                ))
            ) : (
              <EmptyState icon={<Icons.CheckCircle2 size={22} />} title="No pending approvals" text="All client registrations are reviewed." />
            )}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="text-xl font-semibold tracking-normal">Recent activity</h2>
          <div className="mt-5 grid gap-4">
             <div className="rounded-lg border border-stone-200 p-8 text-center text-stone-500">
                No recent activity.
             </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function AdminClientsPage() {
  const { getToken } = useAuth()
  const clients = useAppStore((state) => state.clients)
  const updateClientStatus = useAppStore((state) => state.updateClientStatus)
  const updateClientSubscription = useAppStore((state) => state.updateClientSubscription)
  const [filter, setFilter] = useState<string>('all')

  const filteredClients = clients.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'PENDING' || filter === 'APPROVED') return c.approvalStatus === filter;
    if (filter === 'RAZORPAY' || filter === 'MANUAL_ADMIN') return c.subscriptionMethod === filter;
    return true;
  });

  return (
    <AdminShell title="Client Details & Approval" subtitle="Review every client and control account access">
      <section className="dashboard-panel">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">All client details</h2>
            <p className="mt-1 text-sm text-stone-650">Approve accounts and manage subscriptions manually.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'PENDING', 'APPROVED', 'RAZORPAY', 'MANUAL_ADMIN'] as const).map((item) => (
              <button
                key={item}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  filter === item
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-stone-200 bg-white text-stone-650 hover:text-stone-950'
                }`}
                type="button"
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-normal text-stone-500">
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Contact</th>
                <th className="py-3 pr-4">Plan / Status</th>
                <th className="py-3 pr-4">Usage</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr className="border-b border-stone-100 align-top" key={client.id}>
                  <td className="py-4 pr-4">
                    <div className="font-semibold tracking-normal">{client.studioName || 'Studio'}</div>
                    <div className="mt-1 text-sm text-stone-650">{client.name}</div>
                    <div className="mt-2 text-xs font-medium uppercase tracking-normal text-stone-500">
                      Joined {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-sm text-stone-700">{client.email}</div>
                    <div className="mt-1 text-sm text-stone-650">{client.phone}</div>
                    <div className="mt-1 text-sm text-stone-650">
                      {client.city}, {client.state}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-col items-start gap-2">
                      <span className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-semibold">
                        {client.subscriptionType || 'NONE'}
                      </span>
                      <StatusBadge status={client.approvalStatus as any} />
                      {client.subscriptionStatus === 'ACTIVE' && (
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          PAID: {client.subscriptionMethod}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-sm text-stone-700">{client.events} events</div>
                    <div className="mt-1 text-sm text-stone-650">{formatNumber(client.photos || 0)} photos</div>
                    <div className="mt-1 text-sm text-stone-650">{client.storageGb} GB storage</div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton label="Approve" icon={<Icons.Check size={16} />} onClick={async () => updateClientStatus((await getToken())!, client.id, 'APPROVED' as any)} />
                      <ActionButton label="Reject" icon={<Icons.X size={16} />} onClick={async () => updateClientStatus((await getToken())!, client.id, 'REJECTED' as any)} />
                      <ActionButton label="Active Sub" icon={<Icons.CreditCard size={16} />} onClick={async () => updateClientSubscription((await getToken())!, client.id, { subscriptionStatus: 'ACTIVE', subscriptionMethod: 'MANUAL_ADMIN' })} />
                      <ActionButton label="Revoke Sub" icon={<Icons.Ban size={16} />} onClick={async () => updateClientSubscription((await getToken())!, client.id, { subscriptionStatus: 'INACTIVE', subscriptionMethod: 'MANUAL_ADMIN' })} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  )
}

function AdminShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const logout = useAppStore((state) => state.logout)

  return (
    <DashboardShell
      title={title}
      subtitle={subtitle}
      nav={[
        { label: 'Overview', to: '/admin', icon: <Icons.LayoutDashboard size={17} /> },
        { label: 'Clients', to: '/admin/clients', icon: <Icons.Users size={17} /> },
      ]}
      actions={
        <button className="btn-secondary" type="button" onClick={logout}>
          <Icons.LogOut size={17} aria-hidden="true" />
          Logout
        </button>
      }
    >
      {children}
    </DashboardShell>
  )
}

function DashboardShell({
  children,
  title,
  subtitle,
  nav,
  actions,
}: {
  children: ReactNode
  title: string
  subtitle: string
  nav: { label: string; to: string; icon: ReactNode }[]
  actions: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f8f7f3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-stone-200 bg-white p-4 lg:block">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Icons.ScanFace size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold tracking-normal">Snap Scan</span>
            <span className="block text-xs uppercase tracking-normal text-stone-500">Control center</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-teal-50 text-teal-800' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">Snap Scan</p>
              <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-stone-650">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}

function ClientApprovalRow({
  client,
  onApprove,
  onReject,
}: {
  client: Client
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-normal">{client.studioName}</h3>
            <StatusBadge status={client.approvalStatus} />
          </div>
          <p className="mt-1 text-sm text-stone-650">{client.name} • {client.city}, {client.state}</p>
          <p className="mt-2 text-sm text-stone-650">{client.email} • {client.phone}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-small bg-emerald-600 text-white hover:bg-emerald-700" type="button" onClick={onApprove}>
            <Icons.Check size={15} aria-hidden="true" />
            Approve
          </button>
          <button className="btn-small bg-rose-600 text-white hover:bg-rose-700" type="button" onClick={onReject}>
            <Icons.X size={15} aria-hidden="true" />
            Reject
          </button>
        </div>
      </div>
    </article>
  )
}

function ActionButton({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className={`btn-small ${
        danger
          ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
      }`}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  tone: 'teal' | 'coral' | 'green' | 'amber'
}) {
  const toneClass = {
    teal: 'bg-teal-50 text-teal-800',
    coral: 'bg-coral-50 text-coral-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
      <p className="mt-5 text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-stone-950">{value}</p>
    </article>
  )
}

function ProgressItem({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-lg bg-stone-100">
        <div className={`h-2 rounded-lg ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  placeholder,
  type = 'text',
  required = false,
  value,
  onChange,
}: {
  label: string
  name: string
  placeholder: string
  type?: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </label>
  )
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-stone-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-stone-650">{text}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-[#fbfaf7] p-5">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal text-stone-950">{value}</p>
    </div>
  )
}

function ContactLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-[#fbfaf7] p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">{label}</p>
        <p className="text-sm font-semibold text-stone-800">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white text-teal-800">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold tracking-normal">{title}</h3>
      <p className="mt-2 text-sm text-stone-650">{text}</p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600">
            <Icons.ScanFace size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold tracking-normal">Snap Scan</p>
            <p className="text-sm text-stone-300">AI event photo sharing platform</p>
          </div>
        </div>
        <p className="text-sm text-stone-300">Home • About • Subscription • Contact • Client • Admin</p>
      </div>
    </footer>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-20 text-center">
      <Icons.SearchX className="mx-auto text-teal-800" size={42} aria-hidden="true" />
      <h1 className="mt-5 text-3xl font-semibold tracking-normal">Page not found</h1>
      <p className="mt-3 text-stone-650">The page you opened is not available in this Snap Scan demo.</p>
      <Link className="btn-primary mx-auto mt-6 w-fit" to="/">
        <Icons.Home size={17} aria-hidden="true" />
        Go home
      </Link>
    </div>
  )
}


function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
}

export default App
