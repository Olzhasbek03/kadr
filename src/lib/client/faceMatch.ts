"use client";

/**
 * On-device face matching for "find my photos". The guest takes a selfie;
 * a 128-d face descriptor is computed in the browser (TFJS models served
 * from /models, ~6.5MB, loaded lazily on first use) and compared against
 * faces detected in the gallery photos. Nothing biometric ever leaves the
 * device: no selfie upload, no cloud face API, no stored embeddings.
 *
 * Threshold: euclidean distance < 0.55 between descriptors is the widely
 * used same-person boundary for this model family (0.6 is lenient, 0.4
 * strict); 0.55 favors recall at a wedding where lighting is chaotic.
 */

export const MATCH_THRESHOLD = 0.55;

type FaceApi = typeof import("@vladmandic/face-api");

let apiPromise: Promise<FaceApi> | null = null;

async function loadApi(): Promise<FaceApi> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    })();
    // A failed load (offline, blocked CDN path) must not poison retries.
    apiPromise.catch(() => {
      apiPromise = null;
    });
  }
  return apiPromise;
}

function detectorOptions(api: FaceApi) {
  return new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
}

/** Descriptor for the single most prominent face in the selfie. */
export async function descriptorFromSelfie(
  source: HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const api = await loadApi();
  const result = await api
    .detectSingleFace(source, detectorOptions(api))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

/** True when any face in the image is the same person as `reference`. */
export async function imageMatches(
  url: string,
  reference: Float32Array
): Promise<boolean> {
  const api = await loadApi();
  let img: HTMLImageElement;
  try {
    // Supabase storage serves signed URLs with permissive CORS, so the
    // pixels are readable; anything that taints the canvas is skipped.
    img = await api.fetchImage(url);
  } catch {
    return false;
  }
  try {
    const faces = await api
      .detectAllFaces(img, detectorOptions(api))
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    return faces.some(
      (f) => api.euclideanDistance(f.descriptor, reference) < MATCH_THRESHOLD
    );
  } catch {
    return false;
  }
}
