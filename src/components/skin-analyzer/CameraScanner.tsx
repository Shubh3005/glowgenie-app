
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Scan, X, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface CameraScannerProps {
  onAnalysisComplete: (results: any) => void;
  onScanImageCaptured?: (imageBase64: string) => void;
  user: any;
}

export const CameraScanner = ({ onAnalysisComplete, onScanImageCaptured, user }: CameraScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [scanComplete, setScanComplete] = useState(false);
  const [overlayContext, setOverlayContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (cameraActive && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      setOverlayContext(ctx);
      
      if (videoRef.current) {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            canvas.width = entry.contentRect.width;
            canvas.height = entry.contentRect.height;
          }
        });
        
        resizeObserver.observe(videoRef.current);
        return () => resizeObserver.disconnect();
      }
    }
  }, [cameraActive]);

  useEffect(() => {
    if (!overlayContext || !cameraActive) return;
    
    let animationFrame: number;
    let scanLine = 0;
    const scanSpeed = 2;
    
    const drawScanEffect = () => {
      if (!overlayCanvasRef.current) return;
      
      const canvas = overlayCanvasRef.current;
      const ctx = overlayContext;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!analyzing) {
        ctx.strokeStyle = 'rgba(120, 226, 160, 0.5)';
        ctx.lineWidth = 2;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radiusX = canvas.width * 0.3;
        const radiusY = canvas.height * 0.4;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        const cornerSize = 20;
        const cornerOffset = 40;

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(cornerOffset, 0);
        ctx.lineTo(cornerOffset, cornerSize);
        ctx.lineTo(0, cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, cornerOffset);
        ctx.lineTo(cornerSize, cornerOffset);
        ctx.lineTo(cornerSize, 0);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(canvas.width - cornerOffset, 0);
        ctx.lineTo(canvas.width - cornerOffset, cornerSize);
        ctx.lineTo(canvas.width, cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width, cornerOffset);
        ctx.lineTo(canvas.width - cornerSize, cornerOffset);
        ctx.lineTo(canvas.width - cornerSize, 0);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(cornerOffset, canvas.height);
        ctx.lineTo(cornerOffset, canvas.height - cornerSize);
        ctx.lineTo(0, canvas.height - cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, canvas.height - cornerOffset);
        ctx.lineTo(cornerSize, canvas.height - cornerOffset);
        ctx.lineTo(cornerSize, canvas.height);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(canvas.width - cornerOffset, canvas.height);
        ctx.lineTo(canvas.width - cornerOffset, canvas.height - cornerSize);
        ctx.lineTo(canvas.width, canvas.height - cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width, canvas.height - cornerOffset);
        ctx.lineTo(canvas.width - cornerSize, canvas.height - cornerOffset);
        ctx.lineTo(canvas.width - cornerSize, canvas.height);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(120, 226, 160, 0.2)';
        ctx.fillRect(0, scanLine, canvas.width, scanSpeed);
        
        scanLine += scanSpeed;
        if (scanLine > canvas.height) {
          scanLine = 0;
        }
      }
      
      animationFrame = requestAnimationFrame(drawScanEffect);
    };
    
    drawScanEffect();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [overlayContext, cameraActive, analyzing]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        toast.success("Camera activated successfully");
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      setScanComplete(false);
    }
  };

  useEffect(() => stopCamera, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setAnalyzing(true);
      setAnalysisProgress(0);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      setAnalysisStage('Preparing image for analysis');
      setAnalysisProgress(20);
      
      // Convert canvas to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      if (onScanImageCaptured) {
        onScanImageCaptured(imageBase64);
      }
      
      setAnalysisStage('Analyzing skin features');
      setAnalysisProgress(50);

      // Call the external API - using fetch with error handling
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      setAnalysisProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set the results from the API
      onAnalysisComplete(data);
      setScanComplete(true);
      toast.success("Analysis complete");

      if (user) {
        try {
          await supabase.functions.invoke('skincare-history', {
            body: {
              action: 'save-scan',
              data: {
                ...data,
                scanImage: imageBase64
              }
            }
          });
        } catch (error) {
          console.error('Error saving scan to history:', error);
        }
      }
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      toast.error(`Analysis failed: ${error.message || 'Connection to analysis server failed'}. Please try again.`);
      
      // Try alternative API if the main one fails
      try {
        setAnalysisStage('Trying alternative analysis method');
        
        // Get the canvas data again
        const canvas = canvasRef.current;
        const imageBase64 = canvas?.toDataURL('image/jpeg', 0.8);
        
        const mockResponse = await fetch('https://tbeyfafaieibqspwiwlc.supabase.co/functions/v1/predict-mock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: imageBase64
          }),
        });

        if (!mockResponse.ok) {
          throw new Error(`Mock API error: ${mockResponse.status}`);
        }

        const mockData = await mockResponse.json();
        
        setAnalysisProgress(100);
        onAnalysisComplete(mockData);
        setScanComplete(true);
        toast.success("Analysis complete (using fallback service)");
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col border-2 border-primary/20 shadow-lg shadow-primary/10 overflow-hidden">
      <CardContent className="flex-1 p-6 pt-12 flex flex-col items-center justify-center relative">
        {/* Hidden canvas for capturing images */}
        <canvas 
          ref={canvasRef}
          className="hidden"
        />

        {/* Camera preview and overlay */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video 
            ref={videoRef}
            className={cn(
              "w-full h-full object-cover", 
              !cameraActive && "hidden",
              analyzing && "filter brightness-110"
            )}
            muted
            playsInline
          />
          
          <canvas 
            ref={overlayCanvasRef}
            className={cn(
              "absolute inset-0 w-full h-full pointer-events-none", 
              !cameraActive && "hidden"
            )}
          />
          
          {/* Analysis progress */}
          <AnimatePresence>
            {analyzing && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
              >
                <div className="text-xs font-medium mb-1 flex justify-between items-center">
                  <span className="flex items-center gap-1 text-primary">
                    <Zap className="h-3 w-3" />
                    {analysisStage}
                  </span>
                  <span>{Math.round(analysisProgress)}%</span>
                </div>
                <Progress value={analysisProgress} className="h-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Control buttons */}
        <AnimatePresence mode="wait">
          {!cameraActive && !scanComplete ? (
            <motion.div key="start-button">
              <Button onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Activate Skin Scanner
              </Button>
            </motion.div>
          ) : cameraActive && !analyzing && !scanComplete ? (
            <motion.div key="scan-button">
              <Button onClick={captureAndAnalyze}>
                <Scan className="mr-2 h-4 w-4" />
                Start Skin Analysis
              </Button>
            </motion.div>
          ) : analyzing ? (
            <motion.div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Advanced analysis in progress...</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

// Add supabase import
import { supabase } from '@/integrations/supabase/client';

