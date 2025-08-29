import React from "react";
import { Plus, Minus, Navigation, Layers } from "lucide-react";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onToggleLayer?: () => void; // Optional layer toggle
}

const MapControls: React.FC<Props> = ({ onZoomIn, onZoomOut, onLocate, onToggleLayer }) => {
  return (
    <div className="absolute bottom-6 right-6 z-20 flex flex-col space-y-2">
      <button 
        onClick={onZoomIn}
        className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Zoom In"
      >
        <Plus className="w-5 h-5 text-gray-600" />
      </button>
      
      <button 
        onClick={onZoomOut}
        className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5 text-gray-600" />
      </button>
      
      <button 
        onClick={onLocate}
        className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Find My Location"
      >
        <Navigation className="w-5 h-5 text-gray-600" />
      </button>
      
      {onToggleLayer && (
        <button 
          onClick={onToggleLayer}
          className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Toggle Map Layer"
        >
          <Layers className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  );
};

export default MapControls;