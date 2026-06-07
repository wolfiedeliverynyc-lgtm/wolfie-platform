import { useCallback, useRef } from 'react'

export type AudioAlert = 'dispatch' | 'success' | 'warning' | 'pickup'

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null)

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  const triggerHaptic = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.5, startTimeOffset = 0) => {
    const ctx = initAudio()
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset)
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime + startTimeOffset)
    gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTimeOffset + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTimeOffset + duration)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start(ctx.currentTime + startTimeOffset)
    osc.stop(ctx.currentTime + startTimeOffset + duration)
  }

  const playDispatch = useCallback(() => {
    playTone(600, 'square', 0.2, 0.4, 0)
    playTone(800, 'square', 0.2, 0.4, 0.2)
    playTone(600, 'square', 0.2, 0.4, 0.4)
    playTone(800, 'square', 0.2, 0.4, 0.6)
    triggerHaptic([100, 50, 100, 50, 100])
  }, [])

  const playSuccess = useCallback(() => {
    playTone(440, 'sine', 0.3, 0.5, 0)
    playTone(554.37, 'sine', 0.3, 0.5, 0.1)
    playTone(659.25, 'sine', 0.5, 0.5, 0.2)
    triggerHaptic([50, 50, 50])
  }, [])

  const playPickup = useCallback(() => {
    playTone(500, 'sine', 0.15, 0.5, 0)
    playTone(700, 'sine', 0.25, 0.5, 0.15)
    triggerHaptic([50, 50])
  }, [])

  const playWarning = useCallback(() => {
    playTone(200, 'sawtooth', 0.5, 0.6, 0)
    playTone(180, 'sawtooth', 0.5, 0.6, 0.5)
    triggerHaptic([200, 100, 200])
  }, [])

  return {
    playDispatch,
    playSuccess,
    playPickup,
    playWarning
  }
}
