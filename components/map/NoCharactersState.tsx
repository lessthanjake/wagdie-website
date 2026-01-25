'use client';

import { Button } from '@/components/ui/Button'
import { User, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'

interface NoCharactersStateProps {
  onConnectWallet?: () => void;
}

export function NoCharactersState({ onConnectWallet }: NoCharactersStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-soul-accent/10 blur-[100px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md p-8 relative z-10"
      >
        {/* Icon */}
        <div className="mb-8 relative inline-block">
          <div className="w-24 h-24 bg-soul-950 rounded-full flex items-center justify-center border border-soul-accent/30 shadow-soul-glow">
            <User className="w-10 h-10 text-soul-accent" />
          </div>
          {/* Decorative corners for the icon container */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-soul-accent/50" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-soul-accent/50" />
        </div>

        {/* Title */}
        <h2 className="font-display text-bone text-3xl mb-4 tracking-widest uppercase">
          No Characters Found
        </h2>

        {/* Description */}
        <div className="space-y-4 mb-10">
          <p className="font-eskapade text-ash text-lg leading-relaxed">
            Your soul is yet to take form in this dying world.
          </p>
          <p className="font-eskapade text-mist text-sm">
            Acquire WAGDIE characters to see them on the map and shape the narrative.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => window.open('https://opensea.io/collection/we-are-all-going-to-die', '_blank')}
            className="w-full h-12"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Browse on OpenSea
          </Button>
          
          {onConnectWallet && (
            <Button 
              variant="secondary"
              onClick={onConnectWallet}
              className="w-full h-12"
            >
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <p className="font-eskapade text-mist/60 text-xs mt-8 italic">
          Consecrated characters will automatically manifest upon connection.
        </p>
      </motion.div>
    </div>
  );
}
