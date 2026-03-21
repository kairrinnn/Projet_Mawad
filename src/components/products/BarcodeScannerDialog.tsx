"use client";

import { X, ScanLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStop: () => void;
  scanning: boolean;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onStop,
  scanning
}: BarcodeScannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) onStop(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
        <div className="relative h-[400px] flex flex-col items-center justify-center">
          <div id="barcode-scanner-ui" className="w-full h-full [&_video]:object-cover [&_#qr-shaded-region]:!border-none [&_#qr-shaded-region_div]:!border-none flex items-center justify-center overflow-hidden" />
          
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[260px] h-[180px]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                  
                  <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-indigo-500/30 animate-pulse" />
              </div>
          </div>

          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <Badge variant="secondary" className="bg-indigo-600 text-white border-none px-3 py-1 flex items-center gap-2">
               <ScanLine className="h-3 w-3 animate-pulse" />
               Visez un code-barres
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-black/50 text-white hover:bg-black pointer-events-auto rounded-full"
              onClick={onStop}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {scanning && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
               <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white/80 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Recherche universelle active...
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
