/**
 * SheetEquipment Component
 * Display character equipment (weapons, armor, items, gold)
 */

'use client'

import React from 'react';
import type { Equipment } from '@/types/character'

interface SheetEquipmentProps {
  equipment: Equipment | null
  isEditMode?: boolean
}

export function SheetEquipment({ equipment, isEditMode = false }: SheetEquipmentProps) {
  // Handle both array format (weapons/armor/items) and object format (armor/back/mask)
  let weapons: string[] = []
  let armor: string[] = []
  let items: string[] = []
  let gold = 0

  if (equipment) {
    // Check if it's the metadata format (armor/back/mask as strings)
    if ('armor' in equipment && typeof equipment.armor === 'string') {
      // Metadata format - convert to arrays
      if (equipment.armor && equipment.armor !== 'None') {
        armor.push(equipment.armor)
      }
      if ('back' in equipment && typeof (equipment as any).back === 'string' && (equipment as any).back !== 'None') {
        items.push((equipment as any).back)
      }
      if ('mask' in equipment && typeof (equipment as any).mask === 'string' && (equipment as any).mask !== 'None') {
        items.push((equipment as any).mask)
      }
    } else {
      // Standard format - use arrays directly
      weapons = equipment.weapons || []
      armor = Array.isArray(equipment.armor) ? equipment.armor : []
      items = equipment.items || []
      gold = equipment.gold || 0
    }
  }

  const hasEquipment = weapons.length > 0 || armor.length > 0 || items.length > 0 || gold > 0

  if (!hasEquipment) {
    return (
      <div className="bg-midnight rounded-lg p-6">
        <h3 className="text-2xl font-bold text-bone mb-4">Equipment</h3>
        <p className="text-mist italic">No equipment</p>
      </div>
    )
  }

  return (
    <div className="bg-midnight rounded-lg p-6">
      <h3 className="text-2xl font-bold text-bone mb-4">Equipment</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weapons */}
        {weapons.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-gold mb-2">Weapons</h4>
            <ul className="list-disc list-inside text-ash">
              {weapons.map((weapon, index) => (
                <li key={index}>{weapon}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Armor */}
        {armor.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-gold mb-2">Armor</h4>
            <ul className="list-disc list-inside text-ash">
              {armor.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Items */}
        {items.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-gold mb-2">Items</h4>
            <ul className="list-disc list-inside text-ash">
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Gold */}
        {gold > 0 && (
          <div>
            <h4 className="text-lg font-bold text-gold mb-2">Gold</h4>
            <p className="text-2xl font-bold text-bone">{gold} gp</p>
          </div>
        )}
      </div>
    </div>
  )
}

