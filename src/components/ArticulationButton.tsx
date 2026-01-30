'use client';

import { Articulation, CUBASE_COLORS, midiNoteToName } from '@/lib/expressionMapParser';
import { midiHandler } from '@/lib/midiHandler';
import { useState } from 'react';

interface ArticulationButtonProps {
  articulation: Articulation;
  isActive: boolean;
  onActivate: (articulation: Articulation) => void;
  size?: 'small' | 'medium' | 'large';
  noteOffDelay?: number; // Milliseconds to wait before sending Note Off
}

export function ArticulationButton({
  articulation,
  isActive,
  onActivate,
  size = 'medium',
  noteOffDelay = 50,
}: ArticulationButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const color = CUBASE_COLORS[articulation.color] || CUBASE_COLORS[0];

  const handleClick = () => {
    console.log('[Button] Clicked:', articulation.shortName);

    // Send remote trigger note to activate articulation in Cubase
    if (articulation.remoteTrigger) {
      const { status, data1 } = articulation.remoteTrigger;

      console.log('[Button] Remote trigger:', { status, data1, midiChannel: articulation.midiChannel });

      // If articulation has a specific channel (merged map), use it
      // Otherwise use the global channel from midiHandler
      if (articulation.midiChannel !== undefined) {
        const channelStatus = (status & 0xF0) | articulation.midiChannel;
        const noteOffStatus = ((status & 0xF0) - 16) | articulation.midiChannel; // 0x80 for Note Off
        // Send Note On on specific channel, bypass global channel
        midiHandler.sendMessages([{ status: channelStatus, data1, data2: 127 }], false);
        // Send Note Off after a short delay
        setTimeout(() => {
          midiHandler.sendMessages([{ status: noteOffStatus, data1, data2: 0 }], false);
        }, noteOffDelay);
      } else {
        // Use global channel
        midiHandler.sendMessages([{ status, data1, data2: 127 }], true);
        setTimeout(() => {
          midiHandler.sendMessages([{ status: status - 16, data1, data2: 0 }], true);
        }, noteOffDelay);
      }
    } else {
      console.log('[Button] No remote trigger for this articulation');
    }

    onActivate(articulation);
  };

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    handleClick();
  };

  // Size classes
  const sizeClasses = {
    small: 'min-w-[80px] h-[60px] text-xs',
    medium: 'min-w-[100px] h-[80px] text-sm',
    large: 'min-w-[120px] h-[100px] text-base',
  };

  // Get remote trigger display (the note we send to Cubase)
  const remoteTriggerDisplay = articulation.remoteTrigger
    ? midiNoteToName(articulation.remoteTrigger.data1)
    : 'No Remote';

  const isAutoAssigned = articulation.remoteTrigger?.isAutoAssigned;

  // For merged maps, show the channel
  const channelDisplay = articulation.midiChannel !== undefined
    ? `Ch${articulation.midiChannel + 1}`
    : null;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg font-medium
        transition-all duration-100 ease-out
        flex flex-col items-center justify-center
        px-2 py-1 gap-1
        select-none touch-manipulation
        ${isActive 
          ? 'ring-2 ring-white ring-offset-2 ring-offset-cubase-bg shadow-lg scale-105' 
          : 'hover:scale-102 hover:shadow-md'
        }
        ${isPressed ? 'scale-95 brightness-110' : ''}
      `}
      style={{
        backgroundColor: isActive ? color : `${color}cc`,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}
      title={articulation.description}
    >
      <span className="font-semibold leading-tight text-center line-clamp-2">
        {articulation.shortName}
      </span>
      <span className={`text-[10px] font-mono ${isAutoAssigned ? 'opacity-50 italic' : 'opacity-75'}`}>
        {channelDisplay && <span className="text-yellow-300 mr-1">{channelDisplay}</span>}
        {remoteTriggerDisplay}
      </span>
      {articulation.articulationType === 1 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400"
              title="Direction articulation" />
      )}
      {isAutoAssigned && (
        <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-orange-400"
              title="Auto-assigned remote (update in Cubase)" />
      )}
    </button>
  );
}
