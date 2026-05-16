"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import gsap from "gsap"

export default function IntroScene() {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    gsap.fromTo(
      titleRef.current,
      {
        opacity: 0,
        y: 100,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: "power3.out",
      }
    )

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      gsap.to(titleRef.current, {
        x: (x - 0.5) * 40,
        y: (y - 0.5) * 40,
        duration: 1,
        ease: "power3.out",
      })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <section className="h-screen flex items-center justify-center bg-zinc-200 relative overflow-hidden">
      <Image
        src="/erotari_logo.svg"
        alt="Erotari"
        className="absolute top-2 left-1/2 -translate-x-1/2 w-32"
        width={180}
        height={180}
      />

      <h1
        ref={titleRef}
        className="text-zinc-900 text-4xl font-extralight text-center px-6"
      >
        Something
        <br />
        is coming.
      </h1>
    </section>
  )
}