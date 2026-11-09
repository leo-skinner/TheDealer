import React, { useState } from 'react';
import { CHARACTER_SPRITES, ColorSpriteSpec, ITEM_COLOR_SPECS } from '../config/sprites';
import { NpcId } from '../types/game';

interface ColorSpriteProps {
  npcId?: NpcId;
  customSpec?: ColorSpriteSpec;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCodeTag?: boolean;
  customPixelUrl?: string | null;
}

export const ColorSprite: React.FC<ColorSpriteProps> = ({
  npcId = 'leo_smith',
  customSpec,
  size = 'md',
  showCodeTag = false,
  customPixelUrl,
}) => {
  const [imgError, setImgError] = useState(false);
  const spec = customSpec || CHARACTER_SPRITES[npcId] || CHARACTER_SPRITES.leo_smith;
  const activeUrl = customPixelUrl ?? spec.pixelArtUrl;

  const dimensions: Record<string, string> = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-28 h-28',
  };

  const getCellColor = (val: number): string => {
    switch (val) {
      case 1:
        return spec.primaryColor;
      case 2:
        return spec.secondaryColor;
      case 3:
        return spec.accentColor;
      case 4:
        return spec.skinOrLightColor;
      default:
        return 'transparent';
    }
  };

  return (
    <div className="inline-flex flex-col items-center gap-1.5 select-none">
      <div
        className={`${dimensions[size]} relative rounded-md p-1.5 border border-slate-700/80 bg-slate-950/90 shadow-inner flex items-center justify-center overflow-hidden`}
        title={`${spec.name} (${spec.originalRef}) - ${spec.codeTag}`}
      >
        {/* Quando houver pixelArtUrl na v2, renderiza a imagem com fallback automático */}
        {activeUrl && !imgError ? (
          <img
            src={activeUrl}
            alt={spec.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-[1px]">
            {spec.matrix.flatMap((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="w-full h-full rounded-[1px]"
                  style={{ backgroundColor: getCellColor(cell) }}
                />
              ))
            )}
          </div>
        )}

        {/* Faixa inferior de codificação de cor */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: spec.primaryColor }}
        />
      </div>

      {showCodeTag && (
        <span className="text-[11px] font-mono text-slate-400 tracking-tight whitespace-nowrap">
          {spec.codeTag}
        </span>
      )}
    </div>
  );
};

interface ItemColorBlockProps {
  type: 'electrical' | 'miscellaneous';
  isIllicit?: boolean;
  size?: 'sm' | 'md';
}

export const ItemColorBlock: React.FC<ItemColorBlockProps> = ({
  type,
  isIllicit = false,
  size = 'md',
}) => {
  const spec = ITEM_COLOR_SPECS[type] || ITEM_COLOR_SPECS.electrical;
  const boxSize = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';

  // Matriz 6x6 simples para representar Eletrônicos (TV) vs Variedades (Caixa/Relógio)
  const itemMatrix =
    type === 'electrical'
      ? [
          [0, 1, 0, 0, 1, 0],
          [1, 1, 1, 1, 1, 1],
          [1, 2, 2, 2, 3, 1],
          [1, 2, 2, 2, 3, 1],
          [1, 1, 1, 1, 1, 1],
          [0, 1, 0, 0, 1, 0],
        ]
      : [
          [0, 0, 1, 1, 0, 0],
          [0, 1, 3, 3, 1, 0],
          [1, 3, 2, 2, 3, 1],
          [1, 3, 2, 2, 3, 1],
          [0, 1, 3, 3, 1, 0],
          [0, 0, 1, 1, 0, 0],
        ];

  return (
    <div
      className={`${boxSize} relative rounded p-1.5 border border-slate-700 flex items-center justify-center shrink-0`}
      style={{ backgroundColor: spec.bg }}
      title={`${spec.codeTag}${isIllicit ? ' · CONTRABAND' : ' · LEGIT'}`}
    >
      <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-[1px]">
        {itemMatrix.flatMap((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                backgroundColor:
                  val === 1
                    ? spec.color
                    : val === 2
                    ? '#F8FAFC'
                    : val === 3
                    ? isIllicit
                      ? '#EF4444'
                      : '#FACC15'
                    : 'transparent',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
