import { motion } from 'framer-motion';

// Stylized decorative artwork; no anatomy or development claims are implied.
export function FetusMark({ size = 280 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      data-motion="pulsing-fetus"
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <motion.div
        animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: '5%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle,rgba(var(--bb-glow, 173,255,112),.25),transparent 70%)',
        }}
      />
      <svg width={size} height={size} viewBox="0 0 320 320" style={{ overflow: 'visible' }}>
        {[0, 1].map((index) => (
          <motion.circle
            key={index}
            cx="160"
            cy="160"
            r="117"
            fill="none"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="1"
            animate={{ scale: [0.87, 1.22], opacity: [0.45, 0] }}
            transition={{ duration: 2.4, delay: index * 1.2, repeat: Infinity, ease: 'easeOut' }}
            style={{ transformOrigin: '160px 160px' }}
          />
        ))}
        <motion.path
          d="M232 80C269 113 279 189 242 233C205 277 126 274 87 226C48 178 58 105 102 77C144 50 195 48 232 80Z"
          fill="none"
          stroke="var(--bb-muted, #557C5A)"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
        />
        <motion.g
          data-fetus-body="true"
          animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2], y: [0, -6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            transformOrigin: '160px 160px',
            filter: 'drop-shadow(0 0 14px rgba(var(--bb-glow, 173,255,112),.3))',
          }}
        >
          <path
            d="M180 75C154 71 137 87 139 109C141 131 160 144 182 137C197 133 208 122 207 109L214 103L207 97C204 84 194 77 180 75Z"
            fill="var(--bb-brand, #ADFF70)"
          />
          <path
            d="M165 143C147 140 133 154 125 174C112 200 119 226 144 238C163 247 187 240 199 225C210 210 203 195 188 190C175 186 160 192 157 204C156 212 162 218 170 218C171 207 186 205 188 216C183 229 165 231 154 221C144 211 145 198 151 187C157 176 169 171 173 159C176 150 173 146 165 143Z"
            fill="var(--bb-brand, #ADFF70)"
          />
          <path
            d="M158 157C170 157 178 166 184 174C189 180 196 177 195 171L181 152"
            fill="none"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M151 185C145 200 148 214 161 220"
            fill="none"
            stroke="var(--bb-mint, #17291B)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M201 108L195 111"
            stroke="var(--bb-mint, #17291B)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </motion.g>
        {[
          { x: 65, y: 139 },
          { x: 260, y: 181 },
          { x: 108, y: 262 },
        ].map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="var(--bb-brand, #ADFF70)"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -9, 0] }}
            transition={{ duration: 2.5, delay: index * 0.3, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}
