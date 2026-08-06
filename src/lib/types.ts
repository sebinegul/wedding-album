export type Album = {
  id: string;
  title: string;
  couple: string;
  ownerName: string;
  ownerId: string;
  createdAt: string;
};

export type MediaKind = "image" | "video" | "audio";

export type MediaItem = {
  id: string;
  albumId: string;
  url: string;
  fileName: string;
  originalName: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
};

export type Guest = {
  id: string;
  albumId: string;
  name: string;
  createdAt: string;
};

export type AlbumDetail = {
  album: Album;
  media: MediaItem[];
  guests: Guest[];
};

export type GuestIdentity = {
  id: string;
  name: string;
};

export type RealtimeStatus = "connecting" | "live" | "offline" | "disabled";
