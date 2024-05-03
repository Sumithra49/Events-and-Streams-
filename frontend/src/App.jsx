import { useState } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [status, setStatus] = useState("");
  const [startStreaming, setStartStreaming] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState(null);

  const updateSelectedFile = (e) => {
    setSelectedFileName(e.target.value);
    setSelectedFile(e.target.files[0]);
  };

  const streamFile = (fileName) => {
    setStartStreaming(fileName);
  };

  const handleQualitySelection = (quality) => {
    setSelectedQuality(quality);
  };

  const uploadFile = (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("please select a file to upload");
      return;
    }

    const chunkSize = 1024 * 1024; //1 MB
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const chunkProgress = 100 / totalChunks;
    let chunkNumber = 0;
    let start = 0;
    let end = 0;

    const uploadChunk = () => {
      if (end <= selectedFile.size) {
        const chunk = selectedFile.slice(start, end);
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("chunkNumber", chunkNumber);
        formData.append("totalChunks", totalChunks);
        formData.append("originalName", selectedFile.name);

        fetch("http://localhost:8080/upload", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((responseData) => {
            console.log(responseData);
            const chunkUpdate = `Chunk ${
              chunkNumber + 1
            }/${totalChunks} uploaded successfully`;

            setStatus(chunkUpdate);
            setProgress(((chunkNumber + 1) * chunkProgress).toFixed(2));

            console.log(chunkUpdate);

            chunkNumber++;
            start = end;
            end = start + chunkSize;

            uploadChunk();
          })
          .catch((error) => {
            console.log(`Error uploading file`, error);
          });
      } else {
        setProgress(100);

        const fileName = selectedFile.name;
        setSelectedFileName("");
        setSelectedFile(null);
        setStatus("file uploaded successfully");
        setStartStreaming("");
        streamFile(fileName);
      }
    };

    uploadChunk();
  };

  return (
    <>
      <h1>Upload a video to stream</h1>
      <form onSubmit={uploadFile}>
        <input
          type="file"
          name="file"
          id="file"
          accept="video/*"
          onChange={updateSelectedFile}
          value={selectedFileName}
          required
        />
        <button type="submit">Upload File</button>
      </form>

      {status && <p>{status}</p>}
      <br />
      {progress > 0 && <p>{progress} %</p>}

      {startStreaming && (
        <div>
          <h2>{`playing ${startStreaming}`}</h2>

          <video
            src={`http://localhost:8080/stream/${startStreaming}`}
            controls
            autoPlay
            muted
            width="640px"
            height="480px"
          ></video>
        </div>
      )}

      <div>
        <h2>Select Video Quality</h2>
        <button onClick={() => handleQualitySelection({ resolution: "240p", bitrate: 300 })}>240p</button>
        <button onClick={() => handleQualitySelection({ resolution: "360p", bitrate: 500 })}>360p</button>
        <button onClick={() => handleQualitySelection({ resolution: "480p", bitrate: 800 })}>480p</button>
        <button onClick={() => handleQualitySelection({ resolution: "720p", bitrate: 1200 })}>720p</button>
        <button onClick={() => handleQualitySelection({ resolution: "1080p", bitrate: 2500 })}>1080p</button>
      </div>
    </>
  );
}

export default App;
