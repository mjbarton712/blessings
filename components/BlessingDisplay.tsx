'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { Blessing } from '@/lib/blessings';

interface BlessingDisplayProps {
  blessings: Blessing[];
}

export default function BlessingDisplay({ blessings }: BlessingDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentBlessing, setCurrentBlessing] = useState<Blessing | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [pickerPadding, setPickerPadding] = useState(0);
  
  // Sort blessings alphabetically by scripture - memoize to prevent infinite loops
  const sortedBlessings = useMemo(() => {
    return [...blessings].sort((a, b) => 
      a.scripture.localeCompare(b.scripture)
    );
  }, [blessings]);

  // Set random blessing on initial load
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * sortedBlessings.length);
    setCurrentBlessing(sortedBlessings[randomIndex]);
  }, []); // Empty dependency - only run once on mount

  // Calculate picker padding when picker opens
  useEffect(() => {
    if (isPickerOpen && pickerContainerRef.current) {
      const height = pickerContainerRef.current.clientHeight;
      const itemHeight = 48;
      const padding = (height / 2) - (itemHeight / 2);
      setPickerPadding(padding);
    }
  }, [isPickerOpen]);

  // Handle scroll to update visual feedback in real-time
  useEffect(() => {
    if (!pickerRef.current) return;
    
    const handleScroll = () => {
      if (!pickerRef.current) return;
      
      const itemHeight = 48; // h-12 = 48px
      const pickerHeight = pickerRef.current.clientHeight;
      const centerOfPicker = pickerHeight / 2;
      
      // Find which item is closest to the center of the picker
      let closestIndex = 0;
      let smallestDistance = Infinity;
      
      itemRefs.current.forEach((itemEl, idx) => {
        if (!itemEl) return;
        
        const rect = itemEl.getBoundingClientRect();
        const pickerRect = pickerRef.current!.getBoundingClientRect();
        
        // Calculate item's center relative to picker's top
        const itemCenterInPicker = rect.top + (rect.height / 2) - pickerRect.top;
        const distanceFromCenter = Math.abs(itemCenterInPicker - centerOfPicker);
        
        if (distanceFromCenter < smallestDistance) {
          smallestDistance = distanceFromCenter;
          closestIndex = idx;
        }
        
        // Calculate visual effects based on distance from center
        const distanceInItems = distanceFromCenter / itemHeight;
        
        let opacity = 1;
        if (distanceInItems > 0.5) {
          opacity = Math.max(0.1, 1 - (distanceInItems - 0.5) * 0.4);
        }
        
        let scale = 1;
        if (distanceInItems > 0.5) {
          scale = Math.max(0.85, 1 - (distanceInItems - 0.5) * 0.08);
        }
        
        itemEl.style.opacity = String(opacity);
        itemEl.style.transform = `scale(${scale})`;
      });
      
      setSelectedIndex(closestIndex);
    };

    const picker = pickerRef.current;
    picker.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial calculation after a brief delay to ensure rendering is complete
    setTimeout(handleScroll, 100);
    
    return () => picker.removeEventListener('scroll', handleScroll);
  }, [sortedBlessings.length, isPickerOpen]);

  useEffect(() => {
    if (!currentBlessing) return;
    // Split the blessing text into sentences, keeping quotes with their punctuation
    const splitText = currentBlessing.text.match(/[^.!?]+(?:'[^']*'[.!?]*)?[.!?]+/g) || [currentBlessing.text];
    setSentences(splitText.map(s => s.trim()));
  }, [currentBlessing]);

  useEffect(() => {
    if (sentences.length === 0 || !containerRef.current) return;

    console.log('Running animation for', sentences.length, 'sentences');

    const sentenceElements = containerRef.current.querySelectorAll('.sentence');
    
    if (sentenceElements.length === 0) {
      console.log('No sentence elements found');
      return;
    }

    // Set initial state - all sentences invisible
    gsap.set(sentenceElements, { 
      opacity: 0,
      y: 20
    });

    // Create a timeline for sequential fade-ins
    const timeline = gsap.timeline();

    sentenceElements.forEach((element, index) => {
      timeline.to(element, {
        opacity: 1,
        y: 0,
        duration: 2,
        ease: 'power2.out',
      }, `+=${index === 0 ? 0.5 : 4}`);
    });

    console.log('Animation timeline created');

    return () => {
      timeline.kill();
    };
  }, [sentences]);

  const handleBlessingSelect = () => {
    console.log('Selected index:', selectedIndex);
    console.log('Selected blessing:', sortedBlessings[selectedIndex]);
    setCurrentBlessing(sortedBlessings[selectedIndex]);
    setIsPickerOpen(false);
  };

  if (!currentBlessing) return null;

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsPickerOpen(!isPickerOpen)}
        className="fixed top-6 right-6 z-50 w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all"
        aria-label="Open blessing picker"
      >
        <span className={`w-6 h-0.5 bg-slate-600 transition-all duration-300 ${isPickerOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`w-6 h-0.5 bg-slate-600 transition-all duration-300 ${isPickerOpen ? 'opacity-0' : ''}`} />
        <span className={`w-6 h-0.5 bg-slate-600 transition-all duration-300 ${isPickerOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Picker Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 transition-transform duration-300 ease-out ${isPickerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <h3 className="text-lg font-light text-slate-700 mb-6 text-center">Choose a Blessing</h3>
          
          {/* iOS-style Rotating Picker */}
          <div ref={pickerContainerRef} className="flex-1 relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Top fade */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-white via-white/50 to-transparent" />
              {/* Center highlight */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-12 border-y border-slate-200 bg-amber-50/30" />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white via-white/50 to-transparent" />
            </div>
            
            <div 
              ref={pickerRef}
              className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{ 
                scrollSnapType: 'y mandatory',
                paddingTop: `${pickerPadding}px`,
                paddingBottom: `${pickerPadding}px`
              }}
            >
              {sortedBlessings.map((blessing, index) => (
                <div
                  key={blessing.scripture}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  className="h-12 snap-center flex items-center justify-center cursor-pointer"
                  style={{ 
                    transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
                  }}
                  onClick={(e) => {
                    const target = e.currentTarget;
                    target.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                      inline: 'center'
                    });
                  }}
                >
                  <p className={`text-sm text-center px-4 transition-colors duration-100 ${
                    index === selectedIndex ? 'text-slate-950 font-bold' : 'text-slate-500'
                  }`}>
                    {blessing.scripture}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleBlessingSelect}
            className="mt-6 w-full py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-light text-sm tracking-wide"
          >
            Select Blessing
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 via-amber-50 to-slate-100 px-6 py-12">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 font-light mb-2">
              Welcome
            </h2>
            <p className="text-xs text-slate-400 font-light italic">
              {currentBlessing.scripture}
            </p>
          </div>
          
          <div 
            ref={containerRef}
            className="space-y-6"
          >
            {sentences.map((sentence, index) => (
              <p
                key={index}
                className="sentence text-xl md:text-2xl lg:text-3xl leading-relaxed text-slate-700 font-light text-center"
              >
                {sentence}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isPickerOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsPickerOpen(false)}
        />
      )}
      
      {/* Hide scrollbar globally */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
