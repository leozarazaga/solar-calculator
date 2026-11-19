import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, monthName, translations, withUnit, type Language } from '../i18n/translations'
import type { MonthlyBreakdown } from '../types/calculator.types'

// Production = sun (amber), consumption = 1KOMMA5° brand aubergine.
const PRODUCTION_COLOR = '#d97706'
const CONSUMPTION_COLOR = '#5c068c'
const GRID_COLOR = '#e2e8f0'
const AXIS_TEXT = '#64748b'

interface ProductionChartProps {
  months: MonthlyBreakdown[]
  language: Language
}

interface ChartRow {
  month: string
  monthLong: string
  production: number
  consumption: number
}

interface TooltipEntry {
  dataKey?: unknown
  value?: unknown
  color?: string
  name?: unknown
  payload?: ChartRow
}

export function ProductionChart({ months, language }: ProductionChartProps) {
  const t = translations[language]

  const data: ChartRow[] = months.map((row) => ({
    month: monthName(row.month, language, 'short'),
    monthLong: monthName(row.month, language, 'long'),
    production: row.productionKwh,
    consumption: row.consumptionKwh,
  }))

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: readonly TooltipEntry[] }) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
        <p className="mb-1 font-semibold text-slate-900">{row?.monthLong}</p>
        {payload.map((entry) => (
          <p key={String(entry.dataKey)} className="flex items-center gap-2 text-slate-600">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden="true" />
            <span>{String(entry.name)}:</span>
            <span className="ml-auto pl-3 font-medium text-slate-900 tabular-nums">
              {withUnit(formatNumber(Number(entry.value), language), t.units.kwh)}
            </span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{t.results.chartTitle}</h3>
      <p className="mt-1 text-sm text-slate-500">{t.results.chartDescription}</p>

      <div className="mt-4 h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap="20%"
            title={t.results.chartTitle}
          >
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              // Show all 12 months when they fit; skip labels on narrow screens instead of overlapping
              interval="preserveStartEnd"
              minTickGap={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickFormatter={(value: number) => formatNumber(value, language)}
              width={56}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: '#f1f5f9' }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 13, paddingBottom: 8 }}
              // Keep series order (production first) instead of the default alphabetical sort
              itemSorter={(item) => (item.dataKey === 'production' ? 0 : 1)}
              // Legend text uses the text color; the square swatch carries the series color
              formatter={(value) => <span style={{ color: '#334155' }}>{value}</span>}
            />
            <Bar
              dataKey="production"
              name={t.results.chartProduction}
              fill={PRODUCTION_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="consumption"
              name={t.results.chartConsumption}
              fill={CONSUMPTION_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
