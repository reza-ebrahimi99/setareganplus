"use client";

import { motion, useReducedMotion } from "framer-motion";

export function StarBookHeroScene() {
  const reduce = useReducedMotion();

  return (
    <div className="starbook-hero-scene" aria-hidden>
      <span className="starbook-orb starbook-orb-a" />
      <span className="starbook-orb starbook-orb-b" />
      <span className="starbook-aurora" />
      {!reduce ? (
        <>
          <motion.span
            className="starbook-planet"
            style={{ top: "10%", insetInlineEnd: "7%" }}
            animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="starbook-planet starbook-planet-b"
            style={{ bottom: "16%", insetInlineStart: "5%" }}
            animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          <motion.span
            className="starbook-book"
            style={{ top: "20%", insetInlineEnd: "20%" }}
            animate={{ y: [0, -10, 0], rotate: [-16, -8, -16] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="starbook-book starbook-book-b"
            style={{ bottom: "12%", insetInlineEnd: "11%" }}
            animate={{ y: [0, 10, 0], rotate: [12, 18, 12] }}
            transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          />
          <motion.span
            className="starbook-spark"
            style={{ top: "34%", insetInlineStart: "18%" }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />
        </>
      ) : (
        <>
          <span className="starbook-planet" style={{ top: "10%", insetInlineEnd: "7%" }} />
          <span className="starbook-planet starbook-planet-b" style={{ bottom: "16%", insetInlineStart: "5%" }} />
          <span className="starbook-book" style={{ top: "20%", insetInlineEnd: "20%" }} />
          <span className="starbook-book starbook-book-b" style={{ bottom: "12%", insetInlineEnd: "11%" }} />
        </>
      )}
    </div>
  );
}
