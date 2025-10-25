import { useMemo } from 'react';
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label,
  Line
} from 'recharts'

import type { MusicDaily } from '../types'

export interface TimelineChartProps {
  data: MusicDaily[]
  selectedDate?: Date
}

/**
 * Formats a Unix timestamp (number) for the X-axis ticks.
 */
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  })
}

// --- COVID EVENTS (using Date objects) ---
const COVID_EVENTS = {
  PANDEMIC_PERIOD: { start: new Date('2020-02-25T00:00:00Z'), end: new Date('2021-12-31T00:00:00Z') },
  LOCKDOWN_1: new Date('2020-03-16T00:00:00Z'),
  LOCKDOWN_2: new Date('2020-12-22T00:00:00Z')
}

// --- MAIN COMPONENT ---
export default function TimelineChart({ data, selectedDate }: TimelineChartProps) {

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: d.date.getTime()
    }));
  }, [data]);

  const pandemicStart = COVID_EVENTS.PANDEMIC_PERIOD.start.getTime();
  const pandemicEnd = COVID_EVENTS.PANDEMIC_PERIOD.end.getTime();
  const lockdown1 = COVID_EVENTS.LOCKDOWN_1.getTime();
  const lockdown2 = COVID_EVENTS.LOCKDOWN_2.getTime();

  const christmasDates = ['2018', '2019', '2020', '2021', '2022'].map(year => ({
    year,
    time: new Date(`${year}-12-25T00:00:00Z`).getTime()
  }));

  const selectedTimestamp = selectedDate?.getTime();

  return (
    <div style={{ width: '100%', height: 380, minHeight: 0 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTimestamp}
            minTickGap={90}
            tickLine={false}
            dy={12}
          />
          <YAxis domain={[0, 1]} />

          <Line type="monotone" dataKey="energy" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="acousticness" stroke="#82ca9d" dot={false} />
          <Line type="monotone" dataKey="danceability" stroke="#ffc658" dot={false} />

          <Tooltip
            contentStyle={{ backgroundColor: '#2a1d1dff' }}
            labelFormatter={(label) => formatTimestamp(label as number)}
          />

          {selectedTimestamp && (
            <ReferenceLine
              x={selectedTimestamp}
              strokeDasharray="3 3"
              stroke="#ffffff"
              label={{
                value: `Selected\n${formatTimestamp(selectedTimestamp)}`,
                style: { fill: '#ffffff' }
              }}
            />
          )}

          <ReferenceArea
            x1={pandemicStart}
            x2={pandemicEnd}
            y1={0}
            y2={1}
            stroke="none"
            fill="#b97bf7ff"
            fillOpacity={0.08}
            ifOverflow="hidden"
          >
            <Label value="COVID-19 Pandemic" position="insideTopLeft" fill="#b97bf7ff" fontSize={12} />
          </ReferenceArea>

          <ReferenceLine x={lockdown1} stroke="#e63946" strokeWidth={1} strokeDasharray="4 4">
            <Label value="Lockdown 1" position="top" fill="#e63946" fontSize={12} />
          </ReferenceLine>
          <ReferenceLine x={lockdown2} stroke="#e63946" strokeWidth={1} strokeDasharray="4 4">
            <Label value="Lockdown 2" position="top" fill="#e63946" fontSize={12} />
          </ReferenceLine>

          {christmasDates.map((xmas) => (
            <ReferenceLine
              key={xmas.year}
              x={xmas.time}
              stroke="#f1faee"
              strokeWidth={1}
              strokeDasharray="2 2"
            >
              <Label value="🎄" position="top" fill="#f1faee" fontSize={12} />
            </ReferenceLine>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}