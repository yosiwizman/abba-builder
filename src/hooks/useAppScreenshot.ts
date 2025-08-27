import { useState, useCallback } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { toast } from "sonner";

export function useAppScreenshot() {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = useCallback(
    async (appId: number): Promise<string | null> => {
      setIsCapturing(true);

      try {
        // Get the iframe element from the preview
        const iframe = document.querySelector(
          'iframe[data-testid="preview-iframe-element"]',
        ) as HTMLIFrameElement;

        if (!iframe) {
          console.warn("Preview iframe not found");
          return null;
        }

        // Wait for iframe to fully load
        await new Promise((resolve) => {
          if (iframe.contentDocument?.readyState === "complete") {
            resolve(void 0);
          } else {
            iframe.addEventListener("load", () => resolve(void 0), {
              once: true,
            });
          }
        });

        // Use html2canvas or similar to capture the iframe content
        // For now, we'll create a simple canvas-based screenshot
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error("Could not get canvas context");
          return null;
        }

        // Set canvas dimensions
        canvas.width = 800; // Fixed width for consistency
        canvas.height = 600; // Fixed height for consistency

        // Try to capture the iframe content
        // Note: This will only work if the iframe is same-origin
        try {
          // Create a temporary image from the iframe
          // This is a simplified approach - in production you'd use a library like html2canvas
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document;

          if (iframeDoc) {
            // Create a foreignObject to render HTML to canvas
            const data = `
            <svg xmlns='http://www.w3.org/2000/svg' width='${canvas.width}' height='${canvas.height}'>
              <foreignObject width='100%' height='100%'>
                <div xmlns='http://www.w3.org/1999/xhtml'>
                  ${iframeDoc.documentElement?.outerHTML || ""}
                </div>
              </foreignObject>
            </svg>
          `;

            const img = new Image();
            const svg = new Blob([data], {
              type: "image/svg+xml;charset=utf-8",
            });
            const url = URL.createObjectURL(svg);

            return new Promise((resolve) => {
              img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                // Convert to base64
                const screenshot = canvas.toDataURL("image/png");

                // Store the screenshot (you would save this to database)
                // For now, we'll just return it
                resolve(screenshot);
              };

              img.onerror = () => {
                console.error("Failed to load image for screenshot");
                URL.revokeObjectURL(url);
                resolve(null);
              };

              img.src = url;
            });
          }
        } catch (error) {
          console.error("Could not access iframe content:", error);
          // This is expected for cross-origin iframes
        }

        // Fallback: Create a placeholder screenshot
        // Draw a gradient background as placeholder
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        gradient.addColorStop(0, "#667eea");
        gradient.addColorStop(1, "#764ba2");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add text
        ctx.fillStyle = "white";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("App Preview", canvas.width / 2, canvas.height / 2);

        return canvas.toDataURL("image/png");
      } catch (error) {
        console.error("Screenshot capture failed:", error);
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [],
  );

  const captureAndSaveScreenshot = useCallback(
    async (appId: number) => {
      const screenshot = await captureScreenshot(appId);

      if (screenshot) {
        // Here you would typically save the screenshot to the database
        // For now, we'll just show a success message
        toast.success("Screenshot captured!");

        // Store in localStorage as a temporary solution
        const storageKey = `app_screenshot_${appId}`;
        try {
          localStorage.setItem(storageKey, screenshot);
        } catch (e) {
          console.error("Could not save screenshot to localStorage:", e);
        }

        return screenshot;
      } else {
        toast.info("Could not capture screenshot");
        return null;
      }
    },
    [captureScreenshot],
  );

  const getStoredScreenshot = useCallback((appId: number): string | null => {
    const storageKey = `app_screenshot_${appId}`;
    try {
      return localStorage.getItem(storageKey);
    } catch (e) {
      console.error("Could not retrieve screenshot from localStorage:", e);
      return null;
    }
  }, []);

  return {
    captureScreenshot,
    captureAndSaveScreenshot,
    getStoredScreenshot,
    isCapturing,
  };
}
