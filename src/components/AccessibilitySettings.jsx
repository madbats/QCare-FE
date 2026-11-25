import { useDispatch, useSelector } from 'react-redux';
import { setFontScale, toggleHighContrast } from '../features/ui/uiSlice';
import Icon from './Icon';

const SCALES = [
  { value: 'normal', label: 'Normal', sample: 'A' },
  { value: 'besar', label: 'Besar', sample: 'A' },
  { value: 'sangat-besar', label: 'Sangat besar', sample: 'A' },
];

export default function AccessibilitySettings() {
  const dispatch = useDispatch();
  const { fontScale, highContrast } = useSelector((state) => state.ui);

  return (
    <div className="stack">
      <div>
        <p className="label-strong" id="font-scale-label">
          <Icon name="text" size={18} /> Ukuran teks
        </p>
        <div className="segmented" role="radiogroup" aria-labelledby="font-scale-label">
          {SCALES.map((s, i) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={fontScale === s.value}
              className={`segment ${fontScale === s.value ? 'is-active' : ''}`}
              onClick={() => dispatch(setFontScale(s.value))}
            >
              <span className="segment-sample" style={{ fontSize: `${1 + i * 0.25}em` }}>
                {s.sample}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <label className="switch-row">
        <span>
          <span className="label-strong">
            <Icon name="contrast" size={18} /> Kontras tinggi
          </span>
          <span className="muted small">Warna lebih tegas agar teks & tombol mudah dibaca.</span>
        </span>
        <input type="checkbox" className="switch" checked={highContrast} onChange={() => dispatch(toggleHighContrast())} />
      </label>
    </div>
  );
}
