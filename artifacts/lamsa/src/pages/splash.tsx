import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkles, Gift, Truck } from "lucide-react";

const slides = [
  {
    icon: Sparkles,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop",
    title: "أفضل مستحضرات التجميل",
    subtitle: "عطور وكريمات فاخرة من أكبر الماركات العالمية",
    color: "#C9A84C",
  },
  {
    icon: Gift,
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop",
    title: "أجمل الهدايا",
    subtitle: "هدايا مميزة بتغليف فاخر لكل مناسبة",
    color: "#E8A0B0",
  },
  {
    icon: Truck,
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=400&fit=crop",
    title: "توصيل سريع داخل صنعاء",
    subtitle: "توصيل في نفس اليوم لجميع مناطق صنعاء",
    color: "#C9A84C",
  },
];

export default function Splash() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"logo" | "onboarding">("logo");
  const [currentSlide, setCurrentSlide] = useState(0);

  function goToAuth() {
    localStorage.setItem("lamsa_onboarded", "true");
    setLocation("/auth");
  }

  function nextSlide() {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      goToAuth();
    }
  }

  if (phase === "logo") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() => setTimeout(() => setPhase("onboarding"), 1000)}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ boxShadow: ["0 0 0px #C9A84C40", "0 0 40px #C9A84C80", "0 0 0px #C9A84C40"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="rounded-full p-2"
          >
            <Logo className="w-28 h-28" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="font-serif text-5xl font-bold text-[#C9A84C]">لمسة</h1>
            <p className="mt-2 text-[#6B6B6B] text-base">فخامة بلمسة واحدة</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="sm" className="text-[#6B6B6B] text-sm" onClick={goToAuth}>
          تخطي
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col"
        >
          <div className="relative h-64 overflow-hidden">
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute bottom-4 right-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: slide.color + "20", border: `2px solid ${slide.color}` }}
              >
                <Icon className="w-6 h-6" style={{ color: slide.color }} />
              </div>
            </div>
          </div>

          <div className="flex-1 px-8 pt-8 flex flex-col justify-between pb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] font-serif leading-tight mb-4">
                {slide.title}
              </h2>
              <p className="text-[#6B6B6B] text-lg leading-relaxed">
                {slide.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-6 mt-auto">
              <div className="flex justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: i === currentSlide ? "24px" : "8px",
                      backgroundColor: i === currentSlide ? "#C9A84C" : "#E8E0D0",
                    }}
                  />
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={nextSlide}
                className="w-full h-14 rounded-2xl text-white text-lg font-bold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8D5A3 150%)", boxShadow: "0 4px 20px #C9A84C50" }}
              >
                {currentSlide < slides.length - 1 ? (
                  <>
                    التالي
                    <ChevronLeft className="w-5 h-5" />
                  </>
                ) : (
                  "ابدأ التسوق"
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
