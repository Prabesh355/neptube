// Script to update the videoURL and/or qualities for a specific video in the database
import { db } from "../src/db/index";
import { videos } from "../src/db/schema";

// Replace with your actual video ID and URLs
const videoId = "5e311ce4-4d02-405d-bb9b-eb986c9bef28";
const videoURL = "https://ssyc7j0002.ufs.sh/f/Y6atl3B6bEtSInreh1vknG1XJPvBxUcTRjyCwlQNgm0MfdHD";
const qualities = {
  "720p": "https://ssyc7j0002.ufs.sh/f/Y6atl3B6bEtSInreh1vknG1XJPvBxUcTRjyCwlQNgm0MfdHD",
  "480p": "https://ssyc7j0002.ufs.sh/f/Y6atl3B6bEtS7zOzAeKstxREKN82kiJfXjn3wdaPcF5I4TYV"
};

async function main() {
  await db.update(videos)
    .set({
      videoURL,
      qualities: JSON.stringify(qualities),
      approved: true // Optionally auto-approve for testing
    })
    .where(videos.id.eq(videoId));
  console.log("Video updated!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
