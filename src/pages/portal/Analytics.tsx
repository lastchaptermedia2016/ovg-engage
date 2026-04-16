import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Users, Calendar } from 'lucide-react';

export default function Analytics() {
  const { stats, tenant } = useOutletContext<any>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="text-sm text-white/40 mt-1">
          Performance metrics for your chat widget
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">
              Total Leads
            </CardTitle>
            <Activity className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalLeads}</div>
            <p className="text-xs text-white/40 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">
              Conversions
            </CardTitle>
            <Users className="h-4 w-4 text-gold-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalConversions}</div>
            <p className="text-xs text-white/40 mt-1">Bookings completed</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-white/40 mt-1">Lead to booking</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">
              Status
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">Online</div>
            <p className="text-xs text-white/40 mt-1">Widget active</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60">
            Detailed analytics charts and historical data coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}