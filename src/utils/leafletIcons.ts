import L from 'leaflet';

export const createCustomMarkerIcon = (category: string, _isIndoor: boolean) => {
  let color = '#0D9488'; // Teal
  let iconHtml = '🏞️';

  if (category === 'indoor_public') {
    color = '#3B82F6'; // Blue
    iconHtml = '🏛️';
  } else if (category === 'water_point') {
    color = '#06B6D4'; // Cyan
    iconHtml = '🚰';
  } else if (category === 'cooling_center') {
    color = '#10B981'; // Emerald
    iconHtml = '❄️';
  }

  const svg = `
    <div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #0f172a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      font-size: 16px;
      cursor: pointer;
    ">
      <span>${iconHtml}</span>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};
