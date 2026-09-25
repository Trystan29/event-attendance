/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Volume2, VolumeX, ShieldAlert, RefreshCw, FlipHorizontal } from 'lucide-react';

interface ScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isActive: boolean;
}

let sharedAudioCtx: AudioContext | null = null;

function ScannerComponent({ onScanSuccess, onScanError, isActive }: ScannerComponentProps) {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isBeepEnabled, setIsBeepEnabled] = useState(true);
  const [isMirrorEnabled, setIsMirrorEnabled] = useState(false); // Default to false (unmirrored) for natural scan orientation
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartedRef = useRef(false);
  const activeCameraIdRef = useRef<string>('');
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const skipNextStopRef = useRef(false);

  // Keep references to event callbacks updated on every render to completely prevent stale closures
  const successCallbackRef = useRef(onScanSuccess);
  const errorCallbackRef = useRef(onScanError);

  useEffect(() => {
    successCallbackRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    errorCallbackRef.current = onScanError;
  }, [onScanError]);

  // Helper to determine if front camera is active for dynamic mirroring
  const isFrontCameraActive = () => {
    if (selectedCameraId) {
      const activeCam = cameras.find(c => c.id === selectedCameraId);
      if (activeCam) {
        const label = activeCam.label.toLowerCase();
        return label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('camera 1');
      }
    }
    return facingMode === 'user';
  };

  // Sound generator using browser native Web Audio API (singleton reuse to prevent hardware stream interruption)
  const playSuccessBeep = () => {
    if (!isBeepEnabled) return;
    try {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        sharedAudioCtx = new AudioCtxClass();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
      const oscillator = sharedAudioCtx.createOscillator();
      const gainNode = sharedAudioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, sharedAudioCtx.currentTime); // High pitch notification beep
      gainNode.gain.setValueAtTime(0.1, sharedAudioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(sharedAudioCtx.destination);

      oscillator.start();
      setTimeout(() => {
        try {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      }, 100);
    } catch (e) {
      console.warn('Audio feedback failed or not permitted by browser autoplays yet:', e);
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (scannerRef.current && isStartedRef.current) {
        const scanner = scannerRef.current;
        isStartedRef.current = false;
        scannerRef.current = null;
        activeCameraIdRef.current = '';

        const stopPromise = scanner.stop()
          .then(() => {
            console.log('[Scanner] Clean stopped');
          })
          .catch(err => {
            console.warn('[Scanner] Failed stop on inactive', err);
          })
          .finally(() => {
            if (stopPromiseRef.current === stopPromise) {
              stopPromiseRef.current = null;
            }
          });
        stopPromiseRef.current = stopPromise;
      }
      return;
    }

    const targetCameraId = selectedCameraId || '';
    const targetSelectorStr = targetCameraId || facingMode;

    // IF already running with the EXACT same camera constraint/ID, bypass stop/start cycle!
    if (isStartedRef.current && scannerRef.current && activeCameraIdRef.current === targetSelectorStr) {
      return;
    }

    let isDestroyed = false;
    let localScanner: Html5Qrcode | null = null;

    // Delay initialization slightly to ensure element is strictly in DOM
    const timer = setTimeout(() => {
      const runStart = () => {
        if (isDestroyed) return;
        if (!document.getElementById('qr-viewfinder')) {
          console.warn('[Scanner] Viewfinder DOM node missing');
          return;
        }

        try {
          const scanner = new Html5Qrcode('qr-viewfinder', {
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
            verbose: false
          });
          localScanner = scanner;

          const startScanner = (cameraSelector: any) => {
            if (isDestroyed) return;
            scanner.start(
              cameraSelector,
              {
                fps: 15,
                qrbox: (width, height) => {
                  const size = Math.min(width, height) * 0.75;
                  return { width: size, height: size };
                }
              },
              (decodedText) => {
                const now = Date.now();
                if (lastScanRef.current.text === decodedText && now - lastScanRef.current.time < 3500) {
                  return;
                }
                lastScanRef.current = { text: decodedText, time: now };
                playSuccessBeep();
                if (successCallbackRef.current) {
                  successCallbackRef.current(decodedText);
                }
              },
              (errorMessage) => {
                if (errorCallbackRef.current) {
                  errorCallbackRef.current(errorMessage);
                }
              }
            ).then(() => {
              if (isDestroyed) {
                const stopPromise = scanner.stop()
                  .catch(() => {})
                  .finally(() => {
                    if (stopPromiseRef.current === stopPromise) {
                      stopPromiseRef.current = null;
                    }
                  });
                stopPromiseRef.current = stopPromise;
                return;
              }
              scannerRef.current = scanner;
              isStartedRef.current = true;
              activeCameraIdRef.current = targetSelectorStr;
              setErrorStatus(null);

              // Once camera has started successfully, we can query available camera devices with real labels
              Html5Qrcode.getCameras()
                .then((devices) => {
                  if (!isDestroyed) {
                    setCameras(devices);
                    if (devices.length > 0 && !selectedCameraId) {
                      // Try to match current preference
                      const matchingCam = devices.find(d => {
                        const label = d.label.toLowerCase();
                        if (facingMode === 'environment') {
                          return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('camera 0');
                        } else {
                          return label.includes('front') || label.includes('user') || label.includes('camera 1');
                        }
                      });
                      if (matchingCam) {
                        skipNextStopRef.current = true;
                        setSelectedCameraId(matchingCam.id);
                        activeCameraIdRef.current = matchingCam.id;
                      } else {
                        skipNextStopRef.current = true;
                        setSelectedCameraId(devices[0].id);
                        activeCameraIdRef.current = devices[0].id;
                      }
                    }
                  }
                })
                .catch((err) => {
                  console.warn('[Scanner] Failed to retrieve physical cameras:', err);
                });

            }).catch((err) => {
              console.warn('[Scanner] Startup failed with selector:', cameraSelector, err);
              
              // Dynamic progressive degradation of constraints for maximum device compatibility
              if (typeof cameraSelector === 'object' && cameraSelector.facingMode === 'environment') {
                console.log('[Scanner] Retrying with user-facing camera...');
                startScanner({ facingMode: 'user' });
              } else if (typeof cameraSelector === 'object' && cameraSelector.facingMode === 'user') {
                console.log('[Scanner] Retrying with empty/any default camera constraint...');
                startScanner({});
              } else {
                console.error('[Scanner] All startup fallback tracks exhausted:', err);
                setErrorStatus(err?.message || 'Camera loader blocked. Web camera is active in another tab, or device permission is disabled.');
              }
            });
          };

          // If a specific camera ID was selected, start with that; otherwise use facingMode constraint
          const cameraSelector = targetCameraId ? targetCameraId : { facingMode: facingMode };
          startScanner(cameraSelector);

        } catch (err: any) {
          console.error('Html5Qrcode initialization failed:', err);
          setErrorStatus(err?.message || 'Required device scanner elements not ready.');
        }
      };

      if (stopPromiseRef.current) {
        console.log('[Scanner] Waiting for previous stop to complete before restarting...');
        stopPromiseRef.current.then(runStart);
      } else {
        runStart();
      }
    }, 300);

    return () => {
      isDestroyed = true;
      clearTimeout(timer);
      if (localScanner && isStartedRef.current) {
        if (skipNextStopRef.current) {
          console.log('[Scanner] Skipping stop during internal selectedCameraId sync');
          skipNextStopRef.current = false;
          return;
        }
        isStartedRef.current = false;
        scannerRef.current = null;
        activeCameraIdRef.current = '';
        const stopPromise = localScanner.stop()
          .then(() => {
            console.log('[Scanner] Clean stopped on unmount');
          })
          .catch(err => {
            console.warn('[Scanner] Failed stop on cleanup', err);
          })
          .finally(() => {
            if (stopPromiseRef.current === stopPromise) {
              stopPromiseRef.current = null;
            }
          });
        stopPromiseRef.current = stopPromise;
      }
    };
  }, [isActive, selectedCameraId, facingMode]);

  const toggleFlipCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setSelectedCameraId(nextCam.id);
      
      const label = nextCam.label.toLowerCase();
      if (label.includes('front') || label.includes('user')) {
        setFacingMode('user');
      } else {
        setFacingMode('environment');
      }
    } else {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextMode);
      setSelectedCameraId('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Sound selector and info bar */}
      <div className="w-full max-w-md flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-t-lg text-xs text-slate-500 overflow-hidden">
        <span className="flex items-center gap-1 font-semibold text-slate-700 shrink-0 text-[11px]">
          <Camera className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          Camera Viewport
        </span>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {/* Camera Selection Dropdown */}
          {cameras.length > 0 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 px-1 py-0.5 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[95px] truncate"
            >
              {cameras.map((cam, i) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={toggleFlipCamera}
            className="flex items-center gap-0.5 text-slate-600 hover:text-blue-600 font-semibold px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer text-[10px]"
            title="Flip camera (Switch Front / Rear / Aux)"
          >
            <RefreshCw className="w-3 h-3 text-blue-500" />
            {facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
          </button>

          <span className="text-slate-300 text-[10px]">|</span>

          {/* Beep Toggle */}
          <button
            type="button"
            onClick={() => setIsBeepEnabled(!isBeepEnabled)}
            className="flex items-center gap-0.5 text-slate-600 hover:text-indigo-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer text-[10px]"
            title={isBeepEnabled ? 'Mute Beep sound' : 'Enable Beep sound'}
          >
            {isBeepEnabled ? (
              <>
                <Volume2 className="w-3 h-3 text-emerald-600" /> Beep ON
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-slate-400" /> Muted
              </>
            )}
          </button>

          <span className="text-slate-300 text-[10px]">|</span>

          {/* Mirror Toggle */}
          <button
            type="button"
            onClick={() => setIsMirrorEnabled(!isMirrorEnabled)}
            className="flex items-center gap-0.5 text-slate-600 hover:text-indigo-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer text-[10px]"
            title={isMirrorEnabled ? 'Disable Mirror orientation' : 'Enable Mirror orientation'}
          >
            <FlipHorizontal className={`w-3 h-3 ${isMirrorEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
            {isMirrorEnabled ? 'Mirror ON' : 'Mirror OFF'}
          </button>
        </div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border-x border-b border-slate-200 rounded-b-lg overflow-hidden shadow-sm">
        {/* Scanning floating line animation effect */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-bounce opacity-65 z-10 pointer-events-none shadow-[0_0_10px_#10b981]" />
        )}

        {errorStatus ? (
          <div className="p-8 text-center text-slate-300 flex flex-col items-center justify-center gap-3">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <h4 className="font-semibold text-white">Camera Loader Blocked</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              {errorStatus}. Make sure to enable browser webcam and camera permissions in the AI Studio settings or Chrome address bar.
            </p>
          </div>
        ) : (
          <div className="relative w-full">
            <style>{`
              #qr-viewfinder {
                width: 100% !important;
                border: none !important;
                background: #090d16 !important;
              }
              #qr-viewfinder video {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                transform: ${isMirrorEnabled ? 'scaleX(-1)' : 'none'}; /* Unmirrored by default, mirrors if toggled on */
              }
            `}</style>
            <div id="qr-viewfinder" className="w-full bg-slate-950 text-white min-h-[300px]" />
          </div>
        )}
      </div>

      {isActive && !errorStatus && (
        <p className="text-[11px] text-slate-400 text-center mt-2.5 max-w-xs italic">
          Position the Student QR Code clearly inside the camera scanning viewport frame.
        </p>
      )}
    </div>
  );
}

export default React.memo(ScannerComponent);
