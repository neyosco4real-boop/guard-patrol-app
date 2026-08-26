export interface QueuedScan {
  qrHash: string;
  lat: number;
  lng: number;
  incidentNotes?: string;
  timestamp: string;
}

const QUEUE_KEY = "patrol_offline_scans";

export const getOfflineQueue = (): QueuedScan[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const enqueueScan = (scan: QueuedScan) => {
  const queue = getOfflineQueue();
  queue.push(scan);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};
