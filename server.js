import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import QRCode from 'qrcode';
import cors from 'cors';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret'
});

const prisma = new PrismaClient();
const app = express();

// Firewall & Rate Limiting
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
}));

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'd', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for memory storage so we can process images with Sharp before saving
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------------------
// Auth Sync Webhook
// ----------------------------------------------------
app.post('/api/auth/sync', ClerkExpressRequireAuth(), async (req, res) => {
  const clerkUserId = req.auth.userId;
  const { email, name } = req.body;
  if (!email || !clerkUserId) return res.status(400).json({ error: 'Missing data' });
    try {
      let user = await prisma.user.findUnique({ where: { email } });
      const isAdminEmail = email.toLowerCase() === 'thegopichand@gmail.com';
      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkUserId,
            email,
            name: name || 'Unknown',
            role: isAdminEmail ? 'SUPER_ADMIN' : 'PHOTOGRAPHER',
            approvalStatus: isAdminEmail ? 'APPROVED' : 'PENDING'
          }
        });
      } else if (user.clerkUserId !== clerkUserId || (isAdminEmail && user.role !== 'SUPER_ADMIN')) {
        user = await prisma.user.update({
          where: { email },
          data: { 
            clerkUserId, 
            ...(isAdminEmail ? { role: 'SUPER_ADMIN', approvalStatus: 'APPROVED' } : {})
          }
        });
      }
      res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', ClerkExpressRequireAuth(), async (req, res) => {
  const clerkuserid = req.auth.userId;
  const { studioName, phone, city, state, plan } = req.body;
  if (!clerkuserid) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await prisma.user.update({
      where: { clerkUserId: clerkuserid },
      data: { studioName, phone, city, state, subscriptionType: plan }
    });
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// Admin Routes
// ----------------------------------------------------
// Middleware to check if user is SUPER_ADMIN
const requireSuperAdmin = [
  ClerkExpressRequireAuth(),
  async (req, res, next) => {
    try {
      const clerkuserid = req.auth.userId;
      if (!clerkuserid) return res.status(401).json({ error: 'Unauthorized' });

      const user = await prisma.user.findUnique({ where: { clerkUserId: clerkuserid } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

app.get('/api/admin/stats', requireSuperAdmin, async (req, res) => {
  try {
    const totalClients = await prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } });
    const pending = await prisma.user.count({ where: { approvalStatus: 'PENDING', role: { not: 'SUPER_ADMIN' } } });
    const events = await prisma.event.count();
    // Dummy storage calculation based on photo count
    const photoCount = await prisma.photo.count();
    const storageGb = ((photoCount * 5) / 1024).toFixed(2); // Assume 5MB per photo

    res.json({ totalClients, pending, events, storageGb });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/clients', requireSuperAdmin, async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: { not: 'SUPER_ADMIN' } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/clients/:id/status', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const client = await prisma.user.update({
      where: { id },
      data: { approvalStatus: status }
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/clients/:id/subscription', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { subscriptionStatus, subscriptionMethod } = req.body;
  try {
    const client = await prisma.user.update({
      where: { id },
      data: { subscriptionStatus, subscriptionMethod }
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Photographer Routes
// ----------------------------------------------------
const requireClient = [
  ClerkExpressRequireAuth(),
  async (req, res, next) => {
    try {
      const clerkuserid = req.auth.userId;
      if (!clerkuserid) return res.status(401).json({ error: 'Unauthorized' });

      const user = await prisma.user.findUnique({ where: { clerkUserId: clerkuserid } });
      if (!user || (user.role !== 'PHOTOGRAPHER' && user.role !== 'SUPER_ADMIN')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (user.role === 'PHOTOGRAPHER' && user.subscriptionStatus !== 'ACTIVE' && user.approvalStatus !== 'APPROVED') {
        return res.status(403).json({ error: 'Account inactive or pending' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

app.post('/api/events', requireClient, async (req, res) => {
  const { title, description, venue, city, state, country, eventDate } = req.body;
  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const guestLink = `http://localhost:5173/guest/${slug}`; // Replace with env variable in prod
    const qrCodeDataUrl = await QRCode.toDataURL(guestLink);
    
    const event = await prisma.event.create({
      data: {
        ownerId: req.user.id,
        title,
        slug,
        description,
        venue,
        city,
        state,
        country,
        eventDate,
        guestLink,
        qrCodeUrl: qrCodeDataUrl
      }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', requireClient, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: req.user.role === 'SUPER_ADMIN' ? {} : { ownerId: req.user.id },
      include: { _count: { select: { photos: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:id', requireClient, async (req, res) => {
  const { id } = req.params;
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { photos: { orderBy: { uploadedAt: 'desc' } } }
    });
    if (!event || (event.ownerId !== req.user.id && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/:id/photos', requireClient, upload.array('photos'), async (req, res) => {
  console.log(`Received upload request for event ${req.params.id}. Files count: ${req.files ? req.files.length : 0}`);
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.ownerId !== req.user.id && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files provided' });

    const photos = [];
    for (const file of req.files) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const originalFileName = `${uniqueSuffix}-orig.jpg`;
      const optFileName = `${uniqueSuffix}-opt.webp`;
      const thumbFileName = `${uniqueSuffix}-thumb.webp`;

      // Save original
      const origBuffer = await sharp(file.buffer).autoOrient().jpeg().toBuffer();
      const origBase64 = `data:image/jpeg;base64,${origBuffer.toString('base64')}`;

      // Save optimized
      const optBuffer = await sharp(file.buffer).autoOrient().resize({ width: 1200 }).webp({ quality: 80 }).toBuffer();
      const optBase64 = `data:image/webp;base64,${optBuffer.toString('base64')}`;

      // Save thumbnail
      const thumbBuffer = await sharp(file.buffer).autoOrient().resize({ width: 320 }).webp({ quality: 60 }).toBuffer();
      const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString('base64')}`;

      const photo = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalUrl: origBase64,
          optimizedUrl: optBase64,
          thumbnailUrl: thumbBase64,
          fileName: file.originalname,
          width: 1200,
          size: optBuffer.length
        }
      });
      photos.push(photo);

      // Parse embeddings for this specific photo from req.body
      if (req.body.embeddings) {
        try {
          const embeddingsArray = Array.isArray(req.body.embeddings) ? req.body.embeddings : [req.body.embeddings];
          // files and embeddings should be in the same order
          const fileIndex = req.files.indexOf(file);
          if (fileIndex !== -1 && embeddingsArray[fileIndex]) {
            const faces = JSON.parse(embeddingsArray[fileIndex]);
            for (const face of faces) {
              await prisma.faceEmbedding.create({
                data: {
                  photoId: photo.id,
                  eventId: event.id,
                  embeddingVector: JSON.stringify(face.descriptor),
                  boundingBox: JSON.stringify(face.box),
                  confidence: face.score || 1.0
                }
              });
            }
          }
        } catch (err) {
          console.error('Error parsing embeddings from client:', err);
        }
      }
    }

    res.json({ message: 'Photos uploaded', photos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Guest Routes
// ----------------------------------------------------
app.get('/api/guest/event/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, title: true, description: true, venue: true, eventDate: true, coverImageUrl: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/guest/event/:slug/search', upload.single('selfie'), async (req, res) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!req.file) return res.status(400).json({ error: 'Selfie required' });

    // Save selfie
    const selfieName = `selfie-${Date.now()}.jpg`;
    await sharp(req.file.buffer).autoOrient().resize({ width: 400 }).jpeg().toFile(path.join(uploadDir, selfieName));
    
    const selfieUrl = `/uploads/${selfieName}`;

    // Create Guest Search record
    const search = await prisma.guestSearch.create({
      data: {
        eventId: event.id,
        selfieUrl
      }
    });

    // AI FACE RECOGNITION MATCHING (using client-provided embedding)
    if (!req.body.embedding) {
      return res.status(400).json({ error: 'No face embedding provided from client' });
    }

    const queryDescriptor = JSON.parse(req.body.embedding);

    // Fetch all embeddings for this event
    const embeddings = await prisma.faceEmbedding.findMany({
      where: { eventId: event.id },
      include: { photo: true }
    });

    const threshold = 0.55; // Lower is stricter
    const matches = [];

    // Pure math Euclidean distance
    const euclideanDistance = (arr1, arr2) => {
      let sum = 0;
      for (let i = 0; i < arr1.length; i++) {
        const diff = arr1[i] - arr2[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    };

    for (const emb of embeddings) {
      const dbDescriptor = JSON.parse(emb.embeddingVector);
      if (dbDescriptor.length !== queryDescriptor.length) continue;
      
      const distance = euclideanDistance(queryDescriptor, dbDescriptor);
      if (distance < threshold) {
        matches.push({ photoId: emb.photo.id, distance });
      }
    }

    // Deduplicate photos (if multiple faces matched in the same photo)
    const uniqueMatches = [];
    const seenPhotoIds = new Set();
    matches.sort((a, b) => a.distance - b.distance); // Best match first
    for (const match of matches) {
      if (!seenPhotoIds.has(match.photoId)) {
        seenPhotoIds.add(match.photoId);
        uniqueMatches.push(match);
      }
    }

    for (const match of uniqueMatches) {
      await prisma.matchedPhoto.create({
        data: {
          guestSearchId: search.id,
          photoId: match.photoId,
          similarityScore: 1 - match.distance // Convert distance to score
        }
      });
    }

    // Update result count
    await prisma.guestSearch.update({
      where: { id: search.id },
      data: { resultCount: uniqueMatches.length }
    });

    // Fetch matched photos to return
    const matchedPhotosResult = await prisma.matchedPhoto.findMany({
      where: { guestSearchId: search.id },
      include: { photo: true }
    });

    res.json({ searchId: search.id, matches: matchedPhotosResult.map(m => m.photo) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'd', 'uploads')));

// ----------------------------------------------------
// Billing & Razorpay Routes
// ----------------------------------------------------
app.post('/api/billing/create-order', ClerkExpressRequireAuth(), async (req, res) => {
  const clerkuserid = req.auth.userId;
  const { amount, currency = "INR" } = req.body;
  
  if (!clerkuserid) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId: clerkuserid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency,
      receipt: `rcpt_${user.id.substring(0, 8)}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/billing/verify', ClerkExpressRequireAuth(), async (req, res) => {
  const clerkuserid = req.auth.userId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
                                    .update(body.toString())
                                    .digest('hex');
                                    
    if (expectedSignature === razorpay_signature) {
      await prisma.user.update({
        where: { clerkUserId: clerkuserid },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionMethod: 'RAZORPAY',
          razorpaySubscriptionId: razorpay_order_id
        }
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler for JSON responses instead of HTML stack traces
app.use((err, req, res, next) => {
  console.error('Express Error:', err.message);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
