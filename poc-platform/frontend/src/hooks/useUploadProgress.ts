import { useState, useRef, useCallback } from 'react';

interface UseUploadProgressReturn {
  progress: number;
  uploading: boolean;
  startUpload: <T>(uploadFn: (onProgress: (pct: number) => void, signal: AbortSignal) => Promise<T>) => Promise<T>;
  cancel: () => void;
}

export default function useUploadProgress(): UseUploadProgressReturn {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startUpload = useCallback(async <T>(
    uploadFn: (onProgress: (pct: number) => void, signal: AbortSignal) => Promise<T>,
  ): Promise<T> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setUploading(true);
    try {
      const result = await uploadFn(
        (pct) => setProgress(Math.min(Math.round(pct), 100)),
        controller.signal,
      );
      return result;
    } finally {
      setUploading(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  return { progress, uploading, startUpload, cancel };
}
