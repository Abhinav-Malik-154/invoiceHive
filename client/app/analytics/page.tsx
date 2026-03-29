"use client";
import { useInvoiceStats, useClientStats, usePaymentStats } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Users, FileText, Target, Wallet } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, CartesianGrid, BarChart, Bar, 
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = {
  primary: "#3525cd",
  tertiary: "#14a179",
  error: "#ef4444",
  warning: "#f59e0b",
  secondary: "#64748b",
  draft: "#94a3b8"
};

export default function AnalyticsPage() {
  const { data: invData, isLoading: invLoading } = useInvoiceStats();
  const { data: clientData, isLoading: clientLoading } = useClientStats();
  const { data: payData, isLoading: payLoading } = usePaymentStats();

  const isLoading = invLoading || clientLoading || payLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const invoiceStats = invData?.summary;
  const monthlyRev = invData?.monthlyRevenue || [];
  const clientsStats = clientData?.stats;
  const topClients = clientData?.topClients || [];
  const paymentStats = payData?.data || payData;

  // Formatting Monthly Revenue
  const chartData = monthlyRev.map((m: any) => ({
    month: m._id?.split("-")[1] ? ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m._id.split("-")[1])] : m._id,
    revenue: m.total,
  }));

  // Invoice Breakdown Data
  const invoiceBreakdown = [
    { name: "Paid", value: invoiceStats?.countPaid || 0, color: COLORS.tertiary },
    { name: "Sent/Viewed", value: invoiceStats?.countSent || 0, color: COLORS.primary },
    { name: "Overdue", value: invoiceStats?.countOverdue || 0, color: COLORS.error },
    { name: "Draft", value: invoiceStats?.countDraft || 0, color: COLORS.draft },
  ].filter(d => d.value > 0);

  // Payment Breakdown Data
  const paymentBreakdown = [
    { name: "Succeeded", value: paymentStats?.countSucceeded || 0, color: COLORS.tertiary },
    { name: "Pending", value: paymentStats?.countPending || 0, color: COLORS.warning },
    { name: "Failed", value: paymentStats?.countFailed || 0, color: COLORS.error },
  ].filter(d => d.value > 0);

  // Top Clients Data format
  const topClientsData = topClients.map((c: any) => ({
    name: c.company || c.name || "Unknown",
    paid: c.totalPaid || 0,
    invoiced: c.totalInvoiced || 0
  }));

  const CustomTooltip = ({ active, payload, label, formatterStr }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card p-3 border border-outline-variant/10 shadow-elevated text-sm">
          <p className="font-bold text-on-surface-variant mb-2">{label || payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-on-background capitalize font-medium">{entry.name}:</span>
              <span className="font-mono font-bold">{formatterStr === 'currency' ? formatCurrency(entry.value) : entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">Analytics Overview</h1>
        <p className="text-sm text-on-surface-variant">Deep dive into your financial metrics and client performance.</p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-fixed/30 rounded-full blur-2xl group-hover:bg-tertiary-fixed/40 transition-colors" />
           <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-surface-container-low rounded-xl text-tertiary"><Wallet className="w-5 h-5"/></div>
           </div>
           <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider relative z-10">Total Collected</p>
           <h2 className="text-3xl font-black font-headline text-on-background mt-1 mb-2 relative z-10 mono-num">{formatCurrency(paymentStats?.totalReceived || 0)}</h2>
        </div>

        <div className="card p-6 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/10 rounded-full blur-2xl group-hover:bg-warning/20 transition-colors" />
           <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-surface-container-low rounded-xl text-warning"><Target className="w-5 h-5"/></div>
           </div>
           <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider relative z-10">Outstanding Balance</p>
           <h2 className="text-3xl font-black font-headline text-on-background mt-1 mb-2 relative z-10 mono-num">{formatCurrency(invoiceStats?.totalOutstanding || 0)}</h2>
        </div>

        <div className="card p-6 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/30 rounded-full blur-2xl group-hover:bg-primary-fixed/40 transition-colors" />
           <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-surface-container-low rounded-xl text-primary"><FileText className="w-5 h-5"/></div>
           </div>
           <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider relative z-10">Total Invoiced</p>
           <h2 className="text-3xl font-black font-headline text-on-background mt-1 mb-2 relative z-10 mono-num">{formatCurrency((invoiceStats?.totalRevenue || 0) + (invoiceStats?.totalOutstanding || 0))}</h2>
        </div>

        <div className="card p-6 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-colors" />
           <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-surface-container-low rounded-xl text-secondary"><Users className="w-5 h-5"/></div>
           </div>
           <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider relative z-10">Total Clients</p>
           <h2 className="text-3xl font-black font-headline text-on-background mt-1 mb-2 relative z-10 mono-num">{clientsStats?.totalClients || 0} active</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Area Chart */}
        <div className="card p-6 border border-outline-variant/10 shadow-sm col-span-1 lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-bold font-headline text-on-background">Monthly Revenue Trend</h2>
            <p className="text-sm text-on-surface-variant">Last 12 months collection performance</p>
          </div>
          {chartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `$${value/1000}k`} />
                  <RechartsTooltip content={<CustomTooltip formatterStr="currency" />} cursor={{stroke: COLORS.primary, strokeWidth: 1, strokeDasharray: "4 4"}} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.primary }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/20">
               Not enough paid invoices data.
            </div>
          )}
        </div>

        {/* Top Clients Bar Chart */}
        <div className="card p-6 border border-outline-variant/10 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold font-headline text-on-background">Top Clients by Revenue</h2>
            <p className="text-sm text-on-surface-variant">Your most valuable relationships</p>
          </div>
          {topClientsData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `$${v/1000}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#1e293b', fontWeight: 600}} width={100} />
                  <RechartsTooltip content={<CustomTooltip formatterStr="currency" />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="paid" name="Paid" fill={COLORS.tertiary} radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="invoiced" name="Invoiced" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[280px] flex items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/20">
               No clients data yet.
            </div>
          )}
        </div>

        {/* Status Breakdowns */}
        <div className="card p-6 border border-outline-variant/10 shadow-sm flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-lg font-bold font-headline text-on-background">Volume Breakdowns</h2>
            <p className="text-sm text-on-surface-variant">Invoices and Payments pipeline</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 h-full items-center">
             {/* Invoice Status Pie */}
             <div className="flex flex-col items-center justify-center relative h-[220px]">
               <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant absolute top-0">Invoices ({invoiceStats?.totalCount || 0})</h3>
               {invoiceBreakdown.length > 0 ? (
                 <ResponsiveContainer width="100%" height="80%">
                   <PieChart>
                     <Pie data={invoiceBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                       {invoiceBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} /> )}
                     </Pie>
                     <RechartsTooltip content={<CustomTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="text-sm text-on-surface-variant mt-10 opacity-60">No data</div>}
               <div className="w-full mt-2 space-y-1.5 absolute bottom-0 px-4">
                  {invoiceBreakdown.map(ib => (
                    <div key={ib.name} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-on-surface-variant"><div className="w-2 h-2 rounded-full" style={{background: ib.color}}/> {ib.name}</span>
                      <span className="font-bold">{ib.value}</span>
                    </div>
                  ))}
               </div>
             </div>

             {/* Payment Status Pie */}
             <div className="flex flex-col items-center justify-center relative h-[220px]">
               <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant absolute top-0">Payments</h3>
               {paymentBreakdown.length > 0 ? (
                 <ResponsiveContainer width="100%" height="80%">
                   <PieChart>
                     <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                       {paymentBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} /> )}
                     </Pie>
                     <RechartsTooltip content={<CustomTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="text-sm text-on-surface-variant mt-10 opacity-60">No data</div>}
               <div className="w-full mt-2 space-y-1.5 absolute bottom-0 px-4">
                  {paymentBreakdown.map(ib => (
                    <div key={ib.name} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-on-surface-variant"><div className="w-2 h-2 rounded-full" style={{background: ib.color}}/> {ib.name}</span>
                      <span className="font-bold">{ib.value}</span>
                    </div>
                  ))}
               </div>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
