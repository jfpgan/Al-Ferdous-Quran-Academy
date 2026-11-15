/*
  AL-FERDOUS ACADEMY: VIDEO GALLERY DATA
  --------------------------------------
  Add your Facebook Page videos here, or (easier) open  admin-videos.html
  in your browser, fill in the form and download a ready-made copy of this file.

  Each video needs:
    url          Facebook video / reel link (public video from your Facebook Page)
    title        Video name
    description  Short description
    category     e.g. "Tajweed", "Hifz", "Kids", "Noorani Qaida"
    thumbnail    OPTIONAL image for the card, e.g. "images/videos/my-video.jpg"
                 (put the image file in the images/videos/ folder of this site).
                 If left empty, a branded card is shown instead.
    embed        OPTIONAL: set to false if a video must always open on Facebook.
    preview      OPTIONAL: set to false to hide the live first-picture preview on the card.

  Newest first: the first video in the list appears first.
  No demo videos are included.
*/
window.AF_SITE = {
  facebookPage: "https://www.facebook.com/profile.php?id=61595076327397"   // e.g. "https://www.facebook.com/yourpage"  (shows a "Follow us on Facebook" button)
};

window.AF_VIDEOS = [
  /* The Facebook Reels of the academy, in the order you gave them (01 = first). Titles are numbered; edit any title here.
     No thumbnail image is set, so a branded card is shown; add  thumbnail: "images/videos/xx.jpg"  to any entry to use a picture. */
  { url: "https://www.facebook.com/reel/1665483581592727", title: "Video 01", description: "", category: "Reel 01" },
  { url: "https://www.facebook.com/reel/1652207736369147", title: "Video 02", description: "", category: "Reel 02" },
  { url: "https://www.facebook.com/reel/2380957439408840", title: "Video 03", description: "", category: "Reel 03", zoom: 1.6 },
  { url: "https://www.facebook.com/reel/1654710232691586", title: "Video 04", description: "", category: "Reel 04", zoom: 1.08 },
  { url: "https://www.facebook.com/reel/1797627368115092", title: "Video 05", description: "", category: "Reel 05" },
  { url: "https://www.facebook.com/reel/1650309979810379", title: "Video 06", description: "", category: "Reel 06" },
  { url: "https://www.facebook.com/reel/1445983583525984", title: "Video 07", description: "", category: "Reel 07" },
  { url: "https://www.facebook.com/reel/1640532934206017", title: "Video 08", description: "", category: "Reel 08" },
  { url: "https://www.facebook.com/reel/1788155572832455", title: "Video 09", description: "", category: "Reel 09" },
  { url: "https://www.facebook.com/reel/2644579482650668", title: "Video 10", description: "", category: "Reel 10" },
  { url: "https://www.facebook.com/reel/1857781141916093", title: "Video 11", description: "", category: "Reel 11" },
];
