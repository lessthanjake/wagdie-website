/**
 * BannerHeader Component
 * Page title banner with optional subtitle - WAGDIE gothic theme
 */

interface BannerHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function BannerHeader({ title, subtitle, className = '' }: BannerHeaderProps) {
  return (
    <header className={`relative bg-soul-950 border-b border-neutral-800 px-4 py-12 md:px-8 md:py-16 overflow-hidden ${className}`}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />


      <div className="relative max-w-7xl mx-auto text-center">
        <h1 className="text-h1 md:text-[3rem] font-display text-bone mb-3 drop-shadow-lg lowercase">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body md:text-body text-ash font-eskapade max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

    </header>
  )
}
