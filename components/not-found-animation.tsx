"use client"

import { useEffect, useState } from "react"
import Lottie from "lottie-react"

export default function NotFoundAnimation() {
  const [animationData, setAnimationData] = useState<any>(null)

  useEffect(() => {
    fetch("/lotties/404.json")
      .then((res) => res.json())
      .then(setAnimationData)
      .catch((err) => console.error("Erro ao carregar animação:", err))
  }, [])

  if (!animationData) return null

  return (
    <div className="w-[300px] sm:w-[400px] mb-4">
      <Lottie animationData={animationData} loop autoplay />
    </div>
  )
}