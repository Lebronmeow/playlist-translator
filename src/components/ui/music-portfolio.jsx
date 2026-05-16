import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

// Register GSAP plugin
gsap.registerPlugin(ScrambleTextPlugin);

// Time Display Component
const TimeDisplay = ({ CONFIG = {} }) => {
  const [time, setTime] = useState({ hours: '', minutes: '', dayPeriod: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: CONFIG.timeZone || 'America/New_York',
        hour12: true,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(now);

      setTime({
        hours: parts.find((part) => part.type === 'hour')?.value || '',
        minutes: parts.find((part) => part.type === 'minute')?.value || '',
        dayPeriod: parts.find((part) => part.type === 'dayPeriod')?.value || '',
      });
    };

    updateTime();
    const interval = setInterval(updateTime, CONFIG.timeUpdateInterval || 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <time className="mp-corner-item mp-bottom-right" id="current-time">
      {time.hours}
      <span className="mp-time-blink">:</span>
      {time.minutes} {time.dayPeriod}
    </time>
  );
};

// Project Item Component
const ProjectItem = forwardRef(
  ({ project, index, onMouseEnter, onMouseLeave, isActive, isIdle }, ref) => {
    const textRefs = {
      artist: useRef(null),
      album: useRef(null),
      category: useRef(null),
      label: useRef(null),
      year: useRef(null),
    };

    useEffect(() => {
      if (isActive) {
        Object.entries(textRefs).forEach(([key, textRef]) => {
          if (textRef.current) {
            gsap.killTweensOf(textRef.current);
            gsap.to(textRef.current, {
              duration: 0.8,
              scrambleText: {
                text: project[key],
                chars: 'qwerty1337h@ck3r',
                revealDelay: 0.3,
                speed: 0.4,
              },
            });
          }
        });
      } else {
        Object.entries(textRefs).forEach(([key, textRef]) => {
          if (textRef.current) {
            gsap.killTweensOf(textRef.current);
            textRef.current.textContent = project[key];
          }
        });
      }
    }, [isActive, project]);

    return (
      <li
        ref={ref}
        className={`mp-project-item ${isActive ? 'mp-active' : ''} ${isIdle ? 'mp-idle' : ''}`}
        onMouseEnter={() => onMouseEnter(index, project.image)}
        onMouseLeave={onMouseLeave}
        data-image={project.image}
      >
        <span className="mp-project-data mp-index">{String(index + 1).padStart(2, '0')}</span>
        <span ref={textRefs.artist} className="mp-project-data mp-artist mp-hover-text">
          {project.artist}
        </span>
        <span ref={textRefs.album} className="mp-project-data mp-album mp-hover-text">
          {project.album}
        </span>
        <span ref={textRefs.category} className="mp-project-data mp-category mp-hover-text">
          {project.category}
        </span>
        <span ref={textRefs.label} className="mp-project-data mp-label mp-hover-text">
          {project.label}
        </span>
        <span ref={textRefs.year} className="mp-project-data mp-year mp-hover-text">
          {project.year}
        </span>
      </li>
    );
  }
);

ProjectItem.displayName = 'ProjectItem';

// Main Portfolio Component
const MusicPortfolio = ({
  PROJECTS_DATA = [],
  LOCATION = {},
  CALLBACKS = {},
  CONFIG = {},
  SOCIAL_LINKS = {},
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isIdle, setIsIdle] = useState(true);

  const backgroundRef = useRef(null);
  const containerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const idleAnimationRef = useRef(null);
  const debounceRef = useRef(null);
  const projectItemsRef = useRef([]);

  // Preload images
  useEffect(() => {
    PROJECTS_DATA.forEach((project) => {
      if (project.image) {
        const img = new Image();
        img.src = project.image;
      }
    });
  }, []);

  // Start idle animation
  const startIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) return;

    const timeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 2,
    });

    projectItemsRef.current.forEach((item, index) => {
      if (!item) return;

      const hideTime = 0 + index * 0.05;
      const showTime = 0 + PROJECTS_DATA.length * 0.05 * 0.5 + index * 0.05;

      timeline.to(
        item,
        {
          opacity: 0.05,
          duration: 0.1,
          ease: 'power2.inOut',
        },
        hideTime
      );

      timeline.to(
        item,
        {
          opacity: 1,
          duration: 0.1,
          ease: 'power2.inOut',
        },
        showTime
      );
    });

    idleAnimationRef.current = timeline;
  }, [PROJECTS_DATA.length]);

  // Stop idle animation
  const stopIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) {
      idleAnimationRef.current.kill();
      idleAnimationRef.current = null;

      projectItemsRef.current.forEach((item) => {
        if (item) {
          gsap.set(item, { opacity: 1 });
        }
      });
    }
  }, []);

  // Start idle timer
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (activeIndex === -1) {
        setIsIdle(true);
        startIdleAnimation();
      }
    }, CONFIG.idleDelay || 4000);
  }, [activeIndex, startIdleAnimation, CONFIG.idleDelay]);

  // Stop idle timer
  const stopIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Handle mouse enter on project
  const handleProjectMouseEnter = useCallback(
    (index, imageUrl) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      stopIdleAnimation();
      stopIdleTimer();
      setIsIdle(false);

      if (activeIndex === index) return;

      setActiveIndex(index);

      if (CALLBACKS.onProjectHover) {
        CALLBACKS.onProjectHover(PROJECTS_DATA[index]);
      }

      if (imageUrl && backgroundRef.current) {
        const bg = backgroundRef.current;
        bg.style.transition = 'none';
        bg.style.transform = 'translate(-50%, -50%) scale(1.2)';
        bg.style.backgroundImage = `url(${imageUrl})`;
        bg.style.opacity = '1';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bg.style.transition =
              'opacity 0.6s ease, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            bg.style.transform = 'translate(-50%, -50%) scale(1.0)';
          });
        });
      }
    },
    [activeIndex, stopIdleAnimation, stopIdleTimer, CALLBACKS, PROJECTS_DATA]
  );

  // Handle mouse leave on project
  const handleProjectMouseLeave = useCallback(() => {
    debounceRef.current = setTimeout(() => {
      if (CALLBACKS.onProjectLeave) {
        CALLBACKS.onProjectLeave();
      }
    }, 50);
  }, [CALLBACKS]);

  // Handle container mouse leave
  const handleContainerMouseLeave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setActiveIndex(-1);

    if (backgroundRef.current) {
      backgroundRef.current.style.opacity = '0';
    }

    if (CALLBACKS.onContainerLeave) {
      CALLBACKS.onContainerLeave();
    }

    startIdleTimer();
  }, [startIdleTimer, CALLBACKS]);

  // Initial idle animation
  useEffect(() => {
    startIdleTimer();
    return () => {
      stopIdleTimer();
      stopIdleAnimation();
    };
  }, [startIdleTimer, stopIdleTimer, stopIdleAnimation]);

  const locationDisplay =
    LOCATION.display !== false
      ? `${LOCATION.latitude || '43.9250° N'}, ${LOCATION.longitude || '19.5530° E'}`
      : '';

  return (
    <div className="mp-container">
      <main
        ref={containerRef}
        className={`mp-portfolio-container ${activeIndex !== -1 ? 'mp-has-active' : ''}`}
        onMouseLeave={handleContainerMouseLeave}
      >
        <h1 className="sr-only">Music Portfolio</h1>

        {/* Column headers */}
        <div className="mp-column-headers">
          <span className="mp-col-header mp-col-idx">#</span>
          <span className="mp-col-header mp-col-artist">ARTIST</span>
          <span className="mp-col-header mp-col-album">ALBUM</span>
          <span className="mp-col-header mp-col-category">TYPE</span>
          <span className="mp-col-header mp-col-label">LABEL</span>
          <span className="mp-col-header mp-col-year">YEAR</span>
        </div>

        <ul className="mp-project-list" role="list">
          {PROJECTS_DATA.map((project, index) => (
            <ProjectItem
              key={project.id}
              project={project}
              index={index}
              onMouseEnter={handleProjectMouseEnter}
              onMouseLeave={handleProjectMouseLeave}
              isActive={activeIndex === index}
              isIdle={isIdle}
              ref={(el) => (projectItemsRef.current[index] = el)}
            />
          ))}
        </ul>
      </main>

      <div
        ref={backgroundRef}
        className="mp-background-image"
        id="backgroundImage"
        role="img"
        aria-hidden="true"
      />
    </div>
  );
};

export default MusicPortfolio;
