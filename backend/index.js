const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = 8080;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.status(200).send("server home page");
});

const mergeChunks = async (fileName, totalChunks) => {
  const chunkDir = __dirname + "/chunks";
  const mergedFilePath = __dirname + "/uploads";

  if (!fs.existsSync(mergedFilePath)) {
    fs.mkdirSync(mergedFilePath);
  }

  const writeStream = fs.createWriteStream(`${mergedFilePath}/${fileName}`);
  for (let i = 0; i < totalChunks; i++) {
    const chunkFilePath = `${chunkDir}/${fileName}.part_${i}`;
    const chunkBuffer = await fs.promises.readFile(chunkFilePath);
    writeStream.write(chunkBuffer);
    fs.unlinkSync(chunkFilePath); // Delete the individual chunk file after merging
  }

  writeStream.end();
  console.log("Chunks merged successfully");
};

app.post("/upload", upload.single("file"), async (req, res) => {
  const chunk = req.file.buffer;
  const chunkNumber = Number(req.body.chunkNumber); // Sent from the client
  const totalChunks = Number(req.body.totalChunks); // Sent from the client
  const fileName = req.body.originalName;

  const chunkDir = __dirname + "/chunks"; // Directory to save chunks

  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir);
  }

  const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`;

  try {
    fs.promises.writeFile(chunkFilePath, chunk);

    console.log(`Chunk ${chunkNumber}/${totalChunks} saved`);

    if (chunkNumber === totalChunks - 1) {
      // If this is the last chunk, merge all chunks into a single file
      await mergeChunks(fileName, totalChunks);
      console.log("File merged successfully");
    }

    res.status(200).json({ message: "Chunk uploaded successfully" });
  } catch (error) {
    console.error("Error saving chunk:", error);
    res.status(500).json({ error: "Error saving chunk" });
  }
});

app.get("/stream/:file", (req, res) => {
  const { file } = req.params;

  console.log(file);

  const path = `./uploads/${file}`;

  if (!fs.existsSync(path)) {
    return res
      .status(404)
      .json({ error: true, message: "file doesn't exists" });
  }

  const { range } = req.headers;
  const { size } = fs.statSync(path);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");

    const startPoint = parseInt(parts[0], 10);

    const endPoint = parts[1] ? parseInt(parts[0], 10) : size - 1;

    res.writeHead(206, {
      "content-type": "video/mp4",
      "content-length": `${endPoint - startPoint + 1}`,
      "content-range": `bytes ${startPoint}-${endPoint}/${size}`,
      "accept-ranges": "bytes",
    });

    fs.createReadStream(path, { start: startPoint, end: endPoint }).pipe(res);
  } else {
    res.writeHead(200, { "content-type": "video/", "content-length": size });
    fs.createReadStream(path).pipe(res);
  }
});

// Define available video qualities (bitrates and resolutions)
const videoQualities = [
  { bitrate: 300, resolution: "240p" },
  { bitrate: 500, resolution: "360p" },
  { bitrate: 800, resolution: "480p" },
  { bitrate: 1200, resolution: "720p" },
  { bitrate: 2500, resolution: "1080p" },
];

// Helper function to get the video quality based on available bandwidth
function getVideoQuality(bandwidth) {
  // Here, you can implement logic to select the appropriate quality based on bandwidth
  // For simplicity, let's assume we choose the highest quality below the available bandwidth
  let selectedQuality = videoQualities[0];
  for (let i = 1; i < videoQualities.length; i++) {
    if (videoQualities[i].bitrate <= bandwidth) {
      selectedQuality = videoQualities[i];
    } else {
      break;
    }
  }
  return selectedQuality;
}

app.get("/adaptive-stream/:file", (req, res) => {
  const { file } = req.params;
  const path = `./uploads/${file}`;

  if (!fs.existsSync(path)) {
    return res.status(404).json({ error: true, message: "File doesn't exist" });
  }

  // Simulated bandwidth (for demonstration purposes)
  const bandwidth = req.headers["x-bandwidth"] || 5000; // Default to 5000 kbps (5 Mbps)

  // Get the appropriate video quality based on available bandwidth
  const selectedQuality = getVideoQuality(bandwidth);

  // Construct the file path for the selected quality
  const qualityFilePath = `${path}_${selectedQuality.resolution}.mp4`;

  if (!fs.existsSync(qualityFilePath)) {
    return res
      .status(404)
      .json({ error: true, message: "Requested quality not available" });
  }

  // Serve the selected quality video stream
  const { size } = fs.statSync(qualityFilePath);
  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Content-Length": size,
  });
  fs.createReadStream(qualityFilePath).pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server is running at port : ${PORT}`);
});
