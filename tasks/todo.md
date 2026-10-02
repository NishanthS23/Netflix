# Plan: Store Uploaded Videos on Disk Folder with DB Path Reference (Named Volume)

## Architecture Overview
- **Storage Volume**: Named Docker volume (`video_uploads`) mounted to `/app/uploads` in `netflix-backend`. Files are partitioned into `/app/uploads/videos` and `/app/uploads/thumbnails`.
- **Database Schema**: MongoDB `CustomVideo` model stores the relative file path (`videoPath`, `thumbnailPath`), filename, mime type, size, and metadata (title, description, category, user).
- **Video Upload**: Multer stores files directly into `uploads/videos/` and `uploads/thumbnails/` inside the volume with unique filenames. File locations are saved in MongoDB.
- **Video Streaming**: HTTP 206 Partial Content (Range requests) streamed directly from the file on disk using Node.js `fs.createReadStream` with `{ start, end }`.
- **Thumbnail Delivery**: Thumbnail image served directly from disk via Express `res.sendFile`.
- **Deletion**: Unlinks the physical video and thumbnail files from the filesystem when the video is deleted, then removes the MongoDB document.

## Tasks
- [x] 1. Update `docker-compose.yml` to define named volume `video_uploads` and mount it to `/app/uploads` in `netflix-backend`
- [x] 2. Update Mongoose Schema in `backend/models/customVideo.model.js` to store `videoPath`, `thumbnailPath`, and backward-compatible fields
- [x] 3. Update Multer storage configuration in `backend/routes/customVideo.route.js` to write directly to `uploads/videos` and `uploads/thumbnails`
- [x] 4. Update controller logic in `backend/controllers/customVideo.controller.js`:
  - [x] `uploadCustomVideo`: record disk path in DB document
  - [x] `streamCustomVideo`: stream from disk file using `fs.createReadStream` with HTTP 206 Range headers
  - [x] `getCustomVideoThumbnail`: serve thumbnail file from disk
  - [x] `deleteCustomVideo`: remove disk files and delete DB record
- [x] 5. Rebuild and restart the backend service (`docker compose up -d --build backend`)
- [x] 6. Verification:
  - [x] Inspect Docker volume `docker volume inspect netflix-clone_video_uploads`
  - [x] Test video upload and inspect MongoDB document to confirm `videoPath` is stored
  - [x] Verify video streaming with HTTP 206 Range headers directly from disk volume
  - [x] Verify file unlinking on deletion
