import { useEffect, useState, useRef } from 'react'

export default function AnimatedCounter({ value, duration = 1500, prefix = '', suffix = '', className = '' }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [extractedPrefix, setExtractedPrefix] = useState('')
  const [extractedSuffix, setExtractedSuffix] = useState('')
  const [decimals, setDecimals] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    let numValue = value
    let detPrefix = ''
    let detSuffix = ''
    let detDecimals = 0

    if (typeof value === 'string') {
      const match = value.match(/^([^0-9.-]*)([0-9.,-]+)(.*)$/)
      if (match) {
        detPrefix = match[1] || ''
        const numStr = match[2].replace(/,/g, '')
        numValue = parseFloat(numStr)
        detSuffix = match[3] || ''
        
        const decimalMatch = numStr.match(/\.(\d+)/)
        detDecimals = decimalMatch ? decimalMatch[1].length : 0
      } else {
        numValue = parseFloat(value.replace(/[^0-9.-]/g, ''))
      }
    } else if (typeof value === 'number') {
      const numStr = value.toString()
      const decimalMatch = numStr.match(/\.(\d+)/)
      detDecimals = decimalMatch ? decimalMatch[1].length : 0
    }

    if (isNaN(numValue)) {
      setDisplayValue(value)
      setExtractedPrefix('')
      setExtractedSuffix('')
      setDecimals(0)
      return
    }

    setExtractedPrefix(detPrefix)
    setExtractedSuffix(detSuffix)
    setDecimals(detDecimals)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const animate = (now) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayValue(eased * numValue)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration])

  const formatted = typeof displayValue === 'number'
    ? displayValue.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue

  return (
    <span ref={ref} className={`counter-value ${className}`}>
      {prefix || extractedPrefix}{formatted}{suffix || extractedSuffix}
    </span>
  )
}
