const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const target = "photos.push(photo);\r\n    }\r\n    res.json({ message: 'Uploaded successfully', photos });";

const replacement = `photos.push(photo);
      // AI Face Extraction
      try {
        const img = new Image();
        img.src = optBuffer;
        const detections = await faceapi.detectAllFaces(img)
                                        .withFaceLandmarks()
                                        .withFaceDescriptors();
        
        if (detections.length > 0) {
          for (const detection of detections) {
            await prisma.faceEmbedding.create({
              data: {
                photoId: photo.id,
                eventId: id,
                embeddingVector: JSON.stringify(Array.from(detection.descriptor)),
                boundingBox: JSON.stringify(detection.detection.box)
              }
            });
          }
          console.log(\`Extracted \${detections.length} faces from photo \${photo.id}\`);
        }
      } catch (aiError) {
        console.error('AI Face Extraction Error:', aiError);
      }
    }
    res.json({ message: 'Uploaded successfully', photos });`;

let target2 = "photos.push(photo);\n    }\n    res.json({ message: 'Uploaded successfully', photos });";

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.js', content);
  console.log('Replaced target 1.');
} else if (content.includes(target2)) {
  content = content.replace(target2, replacement);
  fs.writeFileSync('server.js', content);
  console.log('Replaced target 2.');
} else {
  console.log('Target string not found!');
}
