import React, { useEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, ArrowRight } from 'lucide-react';
import { useHomeInfo } from '../contexts/HomeInfoContext';
import { HeroSlide } from '../types/homeInfo';

// 轮播状态类型定义
interface CarouselState {
  currentSlide: number;
  isAutoPlaying: boolean;
  direction: 'next' | 'prev' | 'direct';
  isTransitioning: boolean;
}

// 轮播动作类型
type CarouselAction =
  | { type: 'NEXT_SLIDE'; totalSlides: number; isManual?: boolean }
  | { type: 'PREV_SLIDE'; totalSlides: number; isManual?: boolean }
  | { type: 'GO_TO_SLIDE'; index: number; totalSlides: number }
  | { type: 'TOGGLE_AUTOPLAY' }
  | { type: 'START_TRANSITION' }
  | { type: 'END_TRANSITION' }
  | { type: 'PAUSE_AUTOPLAY' }
  | { type: 'RESUME_AUTOPLAY' };

// 轮播状态reducer
const carouselReducer = (state: CarouselState, action: CarouselAction): CarouselState => {
  switch (action.type) {
    case 'NEXT_SLIDE':
      return {
        ...state,
        currentSlide: (state.currentSlide + 1) % action.totalSlides,
        direction: 'next',
        isAutoPlaying: action.isManual === true ? false : state.isAutoPlaying,
        isTransitioning: true,
      };

    case 'PREV_SLIDE':
      return {
        ...state,
        currentSlide: (state.currentSlide - 1 + action.totalSlides) % action.totalSlides,
        direction: 'prev',
        isAutoPlaying: action.isManual === true ? false : state.isAutoPlaying,
        isTransitioning: true,
      };

    case 'GO_TO_SLIDE':
      if (action.index < 0 || action.index >= action.totalSlides) return state;
      return {
        ...state,
        currentSlide: action.index,
        direction: action.index > state.currentSlide ? 'next' : 'prev',
        isAutoPlaying: false,
        isTransitioning: true,
      };

    case 'TOGGLE_AUTOPLAY':
      return {
        ...state,
        isAutoPlaying: !state.isAutoPlaying,
      };

    case 'PAUSE_AUTOPLAY':
      return {
        ...state,
        isAutoPlaying: false,
      };

    case 'RESUME_AUTOPLAY':
      return {
        ...state,
        isAutoPlaying: true,
      };

    case 'START_TRANSITION':
      return {
        ...state,
        isTransitioning: true,
      };

    case 'END_TRANSITION':
      return {
        ...state,
        isTransitioning: false,
      };

    default:
      return state;
  }
};

// 自动播放Hook
const useAutoPlay = (
  dispatch: React.Dispatch<CarouselAction>,
  isAutoPlaying: boolean,
  totalSlides: number,
  interval: number = 6000
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAutoPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: 'NEXT_SLIDE', totalSlides }); // 不传递 isManual，保持自动播放
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoPlaying, totalSlides, interval, dispatch]);

  return {
    pauseAutoPlay: useCallback(() => dispatch({ type: 'PAUSE_AUTOPLAY' }), [dispatch]),
    resumeAutoPlay: useCallback(() => dispatch({ type: 'RESUME_AUTOPLAY' }), [dispatch]),
  };
};

// 键盘导航Hook
const useKeyboardNavigation = (
  dispatch: React.Dispatch<CarouselAction>,
  totalSlides: number,
  isActive: boolean = true
) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          dispatch({ type: 'PREV_SLIDE', totalSlides, isManual: true });
          break;
        case 'ArrowRight':
          event.preventDefault();
          dispatch({ type: 'NEXT_SLIDE', totalSlides, isManual: true });
          break;
        case 'Home':
          event.preventDefault();
          dispatch({ type: 'GO_TO_SLIDE', index: 0, totalSlides });
          break;
        case 'End':
          event.preventDefault();
          dispatch({ type: 'GO_TO_SLIDE', index: totalSlides - 1, totalSlides });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, totalSlides, isActive]);
};

// 触摸手势Hook
const useTouchNavigation = (
  dispatch: React.Dispatch<CarouselAction>,
  totalSlides: number,
  threshold: number = 50
) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // 只有水平滑动距离大于阈值且垂直距离较小时才触发
    if (Math.abs(deltaX) > threshold && deltaY < threshold * 2) {
      if (deltaX > 0) {
        dispatch({ type: 'PREV_SLIDE', totalSlides, isManual: true });
      } else {
        dispatch({ type: 'NEXT_SLIDE', totalSlides, isManual: true });
      }
    }

    touchStartRef.current = null;
  }, [dispatch, totalSlides, threshold]);

  return { handleTouchStart, handleTouchEnd };
};

// 动画配置
const ANIMATION_CONFIG = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1.0] as const,
  slideVariants: {
    enter: (direction: string) => ({
      x: direction === 'next' ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === 'next' ? -30 : 30,
      opacity: 0,
    }),
  },
  backgroundVariants: {
    enter: {
      opacity: 0,
      scale: 1.01,
    },
    center: {
      opacity: 1,
      scale: 1,
    },
    exit: {
      opacity: 0,
      scale: 0.99,
    },
  },
};

// Hero轮播组件 - 重构版本
const Hero: React.FC = () => {
  const { homeInfo, loading } = useHomeInfo();

  // 从homeInfo获取轮播数据
  const slides: HeroSlide[] = useMemo(() => homeInfo?.hero?.slides || [], [homeInfo?.hero?.slides]);
  const carouselInterval = useMemo(() => homeInfo?.hero?.autoPlayInterval || 6000, [homeInfo?.hero?.autoPlayInterval]);

  // 状态管理
  const [state, dispatch] = useReducer(carouselReducer, {
    currentSlide: 0,
    isAutoPlaying: true,
    direction: 'next',
    isTransitioning: false,
  });

  const { currentSlide, isAutoPlaying, direction } = state;
  const currentSlideData = slides[currentSlide];

  // 自定义Hooks
  useAutoPlay(
    dispatch,
    isAutoPlaying,
    slides.length,
    carouselInterval
  );

  useKeyboardNavigation(dispatch, slides.length);

  const { handleTouchStart, handleTouchEnd } = useTouchNavigation(
    dispatch,
    slides.length
  );

  // 导航函数
  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length && index !== currentSlide) {
      dispatch({ type: 'GO_TO_SLIDE', index, totalSlides: slides.length });
    }
  }, [currentSlide, slides.length]);

  const nextSlide = useCallback(() => {
    dispatch({ type: 'NEXT_SLIDE', totalSlides: slides.length, isManual: true });
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    dispatch({ type: 'PREV_SLIDE', totalSlides: slides.length, isManual: true });
  }, [slides.length]);

  // 如果正在加载，显示加载状态
  if (loading || !homeInfo?.hero) {
    return (
      <div className="w-full pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <section className="relative group min-h-[600px] lg:h-[600px] max-w-7xl mx-auto overflow-hidden rounded-3xl shadow-2xl border border-gray-100 bg-gray-100 animate-pulse">
          <div className="absolute inset-0 bg-white"></div>
          <div className="relative z-10 h-full flex items-center py-8 lg:py-0">
            <div className="w-full px-8 sm:px-12 lg:px-16">
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 lg:items-center">
                <div className="text-gray-900 lg:col-span-3 order-2 lg:order-1 text-left">
                  <div className="w-20 h-8 bg-gray-200 rounded-full mb-6 animate-pulse"></div>
                  <div className="w-3/4 h-12 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="w-full h-6 bg-gray-200 rounded mb-6 animate-pulse"></div>
                  <div className="flex space-x-4">
                    <div className="w-32 h-12 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-32 h-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="lg:col-span-4 lg:pl-8 order-1 lg:order-2">
                  <div className="aspect-[4/3] w-full max-w-sm sm:max-w-md lg:max-w-lg bg-gray-200 rounded-xl animate-pulse mx-auto lg:mx-0"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <section
        className="relative group min-h-[600px] lg:h-[600px] max-w-7xl mx-auto overflow-hidden rounded-3xl shadow-2xl border border-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="产品轮播展示"
        aria-live="polite"
      >
        {/* 简约背景 */}
        <div className="absolute inset-0 bg-white"></div>

        {/* 内容区域 */}
        <div className="relative z-10 h-full flex items-center py-8 lg:py-0">
          <div className="w-full px-8 sm:px-12 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 lg:items-center">
              {/* 左侧文本内容 */}
              <div className="text-gray-900 lg:col-span-3 order-2 lg:order-1 text-left">
                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={`content-${currentSlide}`}
                    custom={direction}
                    variants={ANIMATION_CONFIG.slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      duration: ANIMATION_CONFIG.duration,
                      ease: ANIMATION_CONFIG.ease
                    }}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    {/* 副标题 */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05, duration: 0.3, ease: ANIMATION_CONFIG.ease }}
                      className="inline-block px-4 py-2 bg-gray-900/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6"
                    >
                      {currentSlideData.subtitle}
                    </motion.div>

                    {/* 主标题 */}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.3, ease: ANIMATION_CONFIG.ease }}
                      className="text-3xl md:text-5xl font-bold mb-4 leading-tight"
                    >
                      {currentSlideData.title}
                    </motion.h1>

                    {/* 描述 */}
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.3, ease: ANIMATION_CONFIG.ease }}
                      className="text-lg mb-6 text-gray-700 max-w-lg"
                    >
                      {currentSlideData.description}
                    </motion.p>

                    {/* 按钮组 */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.3, ease: ANIMATION_CONFIG.ease }}
                      className="flex flex-col sm:flex-row gap-4 justify-start"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2"
                        aria-label={`${currentSlideData.ctaText} - ${currentSlideData.title}`}
                        onClick={() => window.open(currentSlideData.ctaUrl, '_blank')}
                      >
                        <Play className="w-4 h-4" />
                        <span>{currentSlideData.ctaText}</span>
                      </motion.button>

                      {currentSlideData.learnMoreText && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-gray-900 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-900/5 transition-colors duration-200 flex items-center justify-center space-x-2"
                          aria-label={`${currentSlideData.learnMoreText} - ${currentSlideData.title}`}
                          onClick={() => window.open(currentSlideData.learnMoreUrl, '_blank')}
                        >
                          <span>{currentSlideData.learnMoreText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 右侧展示区域 */}
              <div className="lg:col-span-4 lg:pl-8 order-1 lg:order-2">
                <div className="flex justify-center lg:justify-end">
                  <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                      key={`preview-${currentSlide}`}
                      custom={direction}
                      variants={ANIMATION_CONFIG.slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        duration: ANIMATION_CONFIG.duration,
                        ease: ANIMATION_CONFIG.ease
                      }}
                      className="relative aspect-[4/3] w-full max-w-sm sm:max-w-md lg:max-w-lg rounded-xl overflow-hidden shadow-2xl"
                      style={{ willChange: 'transform, opacity' }}
                    >
                      <div className="relative w-full h-full overflow-hidden">
                        <motion.img
                          src={currentSlideData.image}
                          alt={currentSlideData.title}
                          className="w-full h-full object-cover cursor-pointer"
                          style={{
                            willChange: 'transform',
                            backfaceVisibility: 'hidden'
                          }}
                          loading="eager"
                          whileHover={{
                            scale: 1.08,
                            transition: {
                              duration: 0.4,
                              ease: [0.25, 0.46, 0.45, 0.94] // 自定义缓动函数，更流畅
                            }
                          }}
                          initial={{ scale: 1 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.25, 0.46, 0.45, 0.94]
                          }}
                        />
                        {/* 悬停遮罩层 */}
                        <motion.div
                          className="absolute inset-0 bg-black/10 pointer-events-none"
                          initial={{ opacity: 0 }}
                          whileHover={{
                            opacity: 1,
                            transition: { duration: 0.3 }
                          }}
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 导航控件 - 重构 */}
        <div className="absolute inset-0 z-20 flex items-center justify-between px-4 pointer-events-none">
          <button
            onClick={prevSlide}
            aria-label="上一张幻灯片"
            className="carousel-nav-button pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm shadow-md text-gray-800 hover:bg-white/80 transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="下一张幻灯片"
            className="carousel-nav-button pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm shadow-md text-gray-800 hover:bg-white/80 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* 指示器 - 重构 */}
        <div className="absolute bottom-5 left-0 right-0 z-20 flex items-center justify-center space-x-2.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`转到第 ${index + 1} 张幻灯片`}
              className={`rounded-full transition-all duration-400 ease-out ${index === currentSlide
                  ? 'w-6 h-2 bg-gray-900 shadow-lg'
                  : 'w-2 h-2 bg-gray-600/60 hover:bg-gray-700/80'
                }`}
            />
          ))}
        </div>

        {/* 键盘导航提示 (仅屏幕阅读器可见) */}
        <div className="sr-only">
          <p>使用左右箭头键导航幻灯片，Home键回到首张，End键到最后一张</p>
        </div>
      </section>
    </div>
  );
};

export default Hero;