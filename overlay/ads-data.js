// Image and video cards share the normal ad rotation.
export const ADS = [
  { kind: "video", src: "assets/videos/102494-660268439_medium.mp4" },
  { kind: "video", src: "assets/videos/108781-681686600.mp4" },
  { kind: "image", src: "assets/img/photo-1562577308-9e66f0c65ce5.avif" },
  { kind: "image", src: "assets/img/photo-1608222351212-18fe0ec7b13b.avif" },
  { kind: "image", src: "assets/img/photo-1786923228848-6575ea78e8da.avif" },
  { kind: "image", src: "assets/img/premium_photo-1664475926084-d20248544896.avif" },
  { kind: "image", src: "assets/img/photo-1557858310-9052820906f7.avif" }
];

export const SCAM_VIDEO = {
  kind: "video",
  src: "assets/videos/scamvideo.mp4",
  fullscreen: true
};

// Bonus cards for X clicks. All content stays inside the extension.
export const MEME_ADS = [
  { kind: "meme", title: "YOU CLOSED ABSOLUTELY NOTHING", message: "Your click unlocked another ad. Excellent work.", color: "#ffe14a" },
  { kind: "meme", title: "TASK FAILED SUCCESSFULLY", message: "Close request sent to the ad department.", color: "#a5f3cf" },
  { kind: "meme", title: "THE X IS AN AD SUBSCRIPTION BUTTON", message: "Congratulations on subscribing again.", color: "#ffc7ec" },
  { kind: "image", src: "assets/img/1795230294972.png", fit: "contain" },
  { kind: "meme", title: "ONE DOES NOT SIMPLY CLOSE THE AD", message: "Have you tried clicking harder? It definitely helps our ad count.", color: "#b9dcff" },
  { kind: "meme", title: "THANK YOU FOR YOUR CLICK", message: "It has been exchanged for one more advertisement. No refunds.", color: "#ffd7ac" }
];
