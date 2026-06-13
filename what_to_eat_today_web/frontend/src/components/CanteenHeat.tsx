import React from 'react';
import type { Canteen } from '../types';

interface CanteenHeatProps {
  canteens: Canteen[];
  onCanteenClick?: (id: string) => void;
}

/** 食堂热度 */
const CanteenHeat: React.FC<CanteenHeatProps> = ({ canteens, onCanteenClick }) => {
  const statusConfig: Record<string, { color: string; bg: string }> = {
    '空闲': { color: '#8BC34A', bg: '#E8F5E9' },
    '正常': { color: '#FF9800', bg: '#FFF3E0' },
    '拥挤': { color: '#F44336', bg: '#FFEBEE' },
  };

  return (
    <div className="canteen-heat">
      <h3 className="section-title">食堂热度</h3>
      <div className="canteen-heat-list">
        {canteens.map((canteen) => {
          const config = statusConfig[canteen.status];
          return (
            <div
              key={canteen.id}
              className="canteen-heat-card"
              role="button"
              tabIndex={0}
              onClick={() => onCanteenClick?.(canteen.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onCanteenClick?.(canteen.id); }}
            >
              <div className="canteen-heat-name">{canteen.name}</div>
              <div className="canteen-heat-info">
                <span className="canteen-distance"><span aria-hidden="true">📍</span> {canteen.distance}</span>
                <span className="canteen-time"><span aria-hidden="true">🕐</span> {canteen.openTime}</span>
              </div>
              <div className="canteen-heat-flow">
                {canteen.currentPeople != null && (
                  <div className="canteen-people">👥 当前 {canteen.currentPeople} 人</div>
                )}
                {canteen.occupancyPct && (
                  <div className="canteen-occupancy">📊 拥挤度 {canteen.occupancyPct}</div>
                )}
              </div>
              <span
                className="canteen-status-tag"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {canteen.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(CanteenHeat);
