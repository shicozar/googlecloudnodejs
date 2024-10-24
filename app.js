const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8000;

// Set up Google Cloud Vision API
const client = new vision.ImageAnnotatorClient();
const storage = new Storage();
const bucketName = 'mylasttry-439606.appspot.com'; // Replace with your actual bucket name

// Set up file upload handling with Multer
const multerStorage = multer.memoryStorage(); // Use memory storage to keep file in memory
const upload = multer({ storage: multerStorage });

// Serve static files
app.use(express.static('client'));

// Handle image upload and label detection
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Upload file to Google Cloud Storage
        const fileName = Date.now() + path.extname(req.file.originalname);
        const file = storage.bucket(bucketName).file(fileName);
        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        // Send image to Google Cloud Vision API
        const [result] = await client.labelDetection(`gs://${bucketName}/${fileName}`);
        const labels = result.labelAnnotations.map(label => label.description);

        // Optionally delete the file from Cloud Storage after processing
        // await file.delete();

        // Send HTML response back with detected labels
        res.send(`
            <h2>Detected Labels:</h2>
            <ul>
                ${labels.map(label => `<li>${label}</li>`).join('')}
            </ul>
            <a href="/">Go Back</a>
        `);
    } catch (error) {
        console.error('Error processing image:', error.message); // Log the error message
        res.status(500).send('Error processing image');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});